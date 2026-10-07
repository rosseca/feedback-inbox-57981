import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import { POST as createFeedbackRoute } from '@/app/api/feedback/route';
import { PATCH as closeFeedbackRoute } from '@/app/api/feedback/[id]/close/route';
import { getDb } from '@/server/db';
import { feedbackEvents } from '@/server/db/schema';
import { SEED_DEV_PASSWORD } from '@/server/db/seed';
import { inspectSentMailForTesting, resetSentMailForTesting } from '@/server/mail/testing';
import { setupTestDb, type TestDbHandle } from '../helpers/db';

let handle: TestDbHandle;
let acmeCookie: string;

async function loginAcme(): Promise<string> {
  const res = await loginRoute(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'owner@acme.test', password: SEED_DEV_PASSWORD }),
    }),
  );
  const cookie = res.headers.getSetCookie().find((entry) => entry.startsWith('feedback_session='));
  return cookie!.split(';')[0];
}

async function createFeedback(title: string): Promise<string> {
  const res = await createFeedbackRoute(
    new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: acmeCookie },
      body: JSON.stringify({
        title,
        description: 'A description that is long enough to be valid.',
        priority: 'medium',
      }),
    }),
  );
  expect(res.status).toBe(201);
  const body = await res.json();
  return body.feedback.id as string;
}

function closeRequest(feedbackId: string): Request {
  return new Request(`http://localhost:3000/api/feedback/${feedbackId}/close`, {
    method: 'PATCH',
    headers: { cookie: acmeCookie },
  });
}

function closedEventCount(feedbackId: string): number {
  return getDb()
    .select()
    .from(feedbackEvents)
    .where(and(eq(feedbackEvents.feedbackId, feedbackId), eq(feedbackEvents.type, 'feedback_closed')))
    .all().length;
}

beforeAll(async () => {
  handle = await setupTestDb();
  acmeCookie = await loginAcme();
  resetSentMailForTesting();
});

afterAll(() => {
  handle.cleanup();
});

describe('closing feedback', () => {
  it('writes exactly one audit event and one mailer call on the first close', async () => {
    const feedbackId = await createFeedback('Close target item');

    const res = await closeFeedbackRoute(closeRequest(feedbackId), {
      params: Promise.resolve({ id: feedbackId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.outcome).toBe('closed');
    expect(body.feedback.status).toBe('closed');
    expect(body.feedback.closedAt).not.toBeNull();

    expect(closedEventCount(feedbackId)).toBe(1);

    const sent = inspectSentMailForTesting();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('owner@acme.test');
    expect(sent[0].subject).toBe('Your feedback has been closed');
    expect(sent[0].templateData.feedbackTitle).toBe('Close target item');
    expect(sent[0].templateData.closedByDisplayName).toBe('Acme Owner');
  });

  it('is idempotent when closing the same feedback again', async () => {
    const feedbackId = await createFeedback('Retry close target');
    await closeFeedbackRoute(closeRequest(feedbackId), { params: Promise.resolve({ id: feedbackId }) });
    resetSentMailForTesting();

    const retry = await closeFeedbackRoute(closeRequest(feedbackId), {
      params: Promise.resolve({ id: feedbackId }),
    });
    expect(retry.status).toBe(200);
    const body = await retry.json();
    expect(body.outcome).toBe('already_closed');

    expect(closedEventCount(feedbackId)).toBe(1);
    expect(inspectSentMailForTesting()).toHaveLength(0);
  });
});
