import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  clearedSessionCookieOptions,
  destroySessionFromRequest,
} from '@/server/auth/session';
import { isSameOrigin, jsonError } from '@/server/http';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return jsonError(403, 'forbidden', 'Cross-origin request rejected');
  }

  destroySessionFromRequest(req);
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(SESSION_COOKIE_NAME, '', clearedSessionCookieOptions());
  return res;
}
