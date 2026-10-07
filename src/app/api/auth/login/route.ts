import { NextResponse } from 'next/server';
import { loginSchema } from '@/contracts/auth';
import { verifyPassword } from '@/server/auth/password';
import {
  SESSION_COOKIE_NAME,
  createSession,
  sessionCookieOptions,
} from '@/server/auth/session';
import { findUserByEmail } from '@/server/repositories/users';
import { badRequest, isSameOrigin, jsonError } from '@/server/http';
import { logger } from '@/server/telemetry/logger';
import { withSpan } from '@/server/telemetry/tracing';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return jsonError(403, 'forbidden', 'Cross-origin request rejected');
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Invalid email or password');
  }

  return withSpan('auth.login', {}, async () => {
    const user = findUserByEmail(parsed.data.email);
    const passwordMatches = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
    if (!user || !passwordMatches) {
      return jsonError(401, 'invalid_credentials', 'Invalid email or password');
    }

    const session = createSession(user.id);
    logger.info('auth.login', { userId: user.id, workspaceId: user.workspaceId });

    const res = NextResponse.json({
      user: { displayName: user.displayName },
    });
    res.cookies.set(SESSION_COOKIE_NAME, session.cookieValue, sessionCookieOptions(session.expiresAt));
    return res;
  });
}
