import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { getDb } from '../db';
import { sessions, users, workspaces } from '../db/schema';
import { deleteSessionById, insertSession } from '../repositories/sessions';

export const SESSION_COOKIE_NAME = 'feedback_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  displayName: string;
}

function sessionSecret(): string {
  return process.env.SESSION_SECRET ?? 'dev-only-insecure-secret';
}

export function signValue(value: string): string {
  const signature = createHmac('sha256', sessionSecret()).update(value).digest('base64url');
  return `${value}.${signature}`;
}

export function verifySignedValue(signed: string): string | null {
  const separator = signed.lastIndexOf('.');
  if (separator <= 0) {
    return null;
  }
  const value = signed.slice(0, separator);
  const signature = signed.slice(separator + 1);
  const expected = createHmac('sha256', sessionSecret()).update(value).digest('base64url');
  const signatureBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (signatureBytes.length !== expectedBytes.length || !timingSafeEqual(signatureBytes, expectedBytes)) {
    return null;
  }
  return value;
}

export function parseCookieHeader(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) {
      continue;
    }
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) {
      result[name] = value;
    }
  }
  return result;
}

export function getCookieFromRequest(req: Request, name: string): string | undefined {
  const cookies = parseCookieHeader(req.headers.get('cookie') ?? '');
  return cookies[name];
}

export function createSession(userId: string): { cookieValue: string; expiresAt: string } {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  insertSession(sessionId, userId, expiresAt);
  return { cookieValue: signValue(sessionId), expiresAt };
}

export function resolveSessionCookie(cookieValue: string): SessionUser | null {
  const sessionId = verifySignedValue(cookieValue);
  if (!sessionId) {
    return null;
  }
  const row = getDb()
    .select({
      userId: users.id,
      workspaceId: users.workspaceId,
      workspaceName: workspaces.name,
      email: users.email,
      displayName: users.displayName,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(workspaces, eq(workspaces.id, users.workspaceId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date().toISOString())))
    .limit(1)
    .get();
  return row ?? null;
}

export function getSessionFromRequest(req: Request): SessionUser | null {
  const cookieValue = getCookieFromRequest(req, SESSION_COOKIE_NAME);
  if (!cookieValue) {
    return null;
  }
  return resolveSessionCookie(cookieValue);
}

export async function getSessionFromCookies(): Promise<SessionUser | null> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const cookieValue = store.get(SESSION_COOKIE_NAME)?.value;
  if (!cookieValue) {
    return null;
  }
  return resolveSessionCookie(cookieValue);
}

export function destroySessionFromRequest(req: Request): void {
  const cookieValue = getCookieFromRequest(req, SESSION_COOKIE_NAME);
  const sessionId = cookieValue ? verifySignedValue(cookieValue) : null;
  if (sessionId) {
    deleteSessionById(sessionId);
  }
}

export function sessionCookieOptions(expiresAt: string) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  };
}

export function clearedSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  };
}
