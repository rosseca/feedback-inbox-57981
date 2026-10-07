import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import { GET as getFeedbackDetail } from '@/app/api/feedback/[id]/route';
import { GET as getFeedbackList } from '@/app/api/feedback/route';
import { SESSION_COOKIE_NAME, signValue } from '@/server/auth/session';
import { insertSession } from '@/server/repositories/sessions';
import { SEED_DEV_PASSWORD } from '@/server/db/seed';
import { setupTestDb, type TestDbHandle } from '../helpers/db';

let handle: TestDbHandle;

async function login(email: string): Promise<string> {
  const res = await loginRoute(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: SEED_DEV_PASSWORD }),
    }),
  );
  expect(res.status).toBe(200);
  const cookie = res.headers.getSetCookie().find((entry) => entry.startsWith('feedback_session='));
  expect(cookie).toBeDefined();
  return cookie!.split(';')[0];
}

function requestWithCookie(url: string, cookie: string): Request {
  return new Request(url, { headers: { cookie } });
}

beforeAll(async () => {
  handle = await setupTestDb();
});

afterAll(() => {
  handle.cleanup();
});

describe('workspace isolation', () => {
  it('returns 404 when reading feedback from another workspace', async () => {
    const globexCookie = await login('owner@globex.test');
    const acmeCookie = await login('owner@acme.test');

    const own = await getFeedbackDetail(requestWithCookie('http://localhost:3000/api/feedback/fb_globex_1', globexCookie), {
      params: Promise.resolve({ id: 'fb_globex_1' }),
    });
    expect(own.status).toBe(200);

    const foreign = await getFeedbackDetail(requestWithCookie('http://localhost:3000/api/feedback/fb_globex_1', acmeCookie), {
      params: Promise.resolve({ id: 'fb_globex_1' }),
    });
    expect(foreign.status).toBe(404);
  });

  it('lists only the authenticated workspace feedback', async () => {
    const globexCookie = await login('owner@globex.test');
    const res = await getFeedbackList(requestWithCookie('http://localhost:3000/api/feedback', globexCookie));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(2);
    expect(body.items.every((item: { id: string }) => item.id.startsWith('fb_globex'))).toBe(true);
    expect(body.activeCount).toBe(2);
  });

  it('rejects requests without a session', async () => {
    const res = await getFeedbackList(new Request('http://localhost:3000/api/feedback'));
    expect(res.status).toBe(401);
  });

  it('rejects expired sessions', async () => {
    insertSession('expired-session', 'user_acme', new Date(Date.now() - 60_000).toISOString());
    const cookie = `${SESSION_COOKIE_NAME}=${signValue('expired-session')}`;
    const res = await getFeedbackList(requestWithCookie('http://localhost:3000/api/feedback', cookie));
    expect(res.status).toBe(401);
  });
});
