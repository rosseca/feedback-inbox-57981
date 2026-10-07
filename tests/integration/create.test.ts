import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import { POST as createFeedbackRoute } from '@/app/api/feedback/route';
import { GET as attachmentRoute } from '@/app/api/feedback/[id]/attachment/route';
import { POST as uploadRoute } from '@/app/api/uploads/route';
import { getDb } from '@/server/db';
import { feedbackEvents } from '@/server/db/schema';
import { SEED_DEV_PASSWORD } from '@/server/db/seed';
import { setupTestDb, type TestDbHandle } from '../helpers/db';

let handle: TestDbHandle;
let acmeCookie: string;
let globexCookie: string;

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

async function login(email: string): Promise<string> {
  const res = await loginRoute(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: SEED_DEV_PASSWORD }),
    }),
  );
  const cookie = res.headers.getSetCookie().find((entry) => entry.startsWith('feedback_session='));
  return cookie!.split(';')[0];
}

function uploadRequest(cookie: string, file: File): Request {
  const form = new FormData();
  form.append('file', file);
  return new Request('http://localhost:3000/api/uploads', {
    method: 'POST',
    headers: { cookie },
    body: form,
  });
}

function createRequest(cookie: string, payload: unknown): Request {
  return new Request('http://localhost:3000/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(payload),
  });
}

beforeAll(async () => {
  handle = await setupTestDb();
  acmeCookie = await login('owner@acme.test');
  globexCookie = await login('owner@globex.test');
});

afterAll(() => {
  handle.cleanup();
});

describe('creating feedback', () => {
  it('stores the feedback and exactly one feedback_created event', async () => {
    const res = await createFeedbackRoute(
      createRequest(acmeCookie, {
        title: 'New feedback item',
        description: 'A description that is long enough to be valid.',
        priority: 'high',
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.feedback.status).toBe('new');

    const events = getDb()
      .select()
      .from(feedbackEvents)
      .where(and(eq(feedbackEvents.feedbackId, body.feedback.id), eq(feedbackEvents.type, 'feedback_created')))
      .all();
    expect(events).toHaveLength(1);
  });

  it('rejects an invalid payload', async () => {
    const res = await createFeedbackRoute(
      createRequest(acmeCookie, { title: 'no', description: 'short', priority: 'urgent' }),
    );
    expect(res.status).toBe(400);
  });
});

describe('uploads', () => {
  it('accepts a valid PNG and attaches it to new feedback', async () => {
    const upload = await uploadRoute(
      uploadRequest(acmeCookie, new File([PNG_BYTES], 'report.png', { type: 'image/png' })),
    );
    expect(upload.status).toBe(201);
    const uploadBody = await upload.json();
    expect(uploadBody.filename).toBe('report.png');

    const create = await createFeedbackRoute(
      createRequest(acmeCookie, {
        title: 'Feedback with attachment',
        description: 'A description that is long enough to be valid.',
        priority: 'low',
        attachmentId: uploadBody.attachmentId,
      }),
    );
    expect(create.status).toBe(201);
    const createBody = await create.json();
    expect(createBody.feedback.attachmentFilename).toBe('report.png');

    const download = await attachmentRoute(
      new Request(`http://localhost:3000/api/feedback/${createBody.feedback.id}/attachment`, {
        headers: { cookie: acmeCookie },
      }),
      { params: Promise.resolve({ id: createBody.feedback.id }) },
    );
    expect(download.status).toBe(200);
    expect(download.headers.get('content-type')).toBe('image/png');
  });

  it('blocks cross-workspace attachment downloads', async () => {
    const upload = await uploadRoute(
      uploadRequest(acmeCookie, new File([PNG_BYTES], 'private.png', { type: 'image/png' })),
    );
    const uploadBody = await upload.json();
    const create = await createFeedbackRoute(
      createRequest(acmeCookie, {
        title: 'Acme private attachment',
        description: 'A description that is long enough to be valid.',
        priority: 'low',
        attachmentId: uploadBody.attachmentId,
      }),
    );
    const createBody = await create.json();

    const foreign = await attachmentRoute(
      new Request(`http://localhost:3000/api/feedback/${createBody.feedback.id}/attachment`, {
        headers: { cookie: globexCookie },
      }),
      { params: Promise.resolve({ id: createBody.feedback.id }) },
    );
    expect(foreign.status).toBe(404);
  });

  it('rejects unsupported file types', async () => {
    const res = await uploadRoute(
      uploadRequest(acmeCookie, new File([new Uint8Array([1, 2, 3])], 'notes.txt', { type: 'text/plain' })),
    );
    expect(res.status).toBe(400);
  });

  it('rejects files whose magic bytes do not match the declared type', async () => {
    const res = await uploadRoute(
      uploadRequest(acmeCookie, new File([new TextEncoder().encode('not really a png')], 'fake.png', { type: 'image/png' })),
    );
    expect(res.status).toBe(400);
  });

  it('rejects unsafe filenames', async () => {
    const res = await uploadRoute(
      uploadRequest(acmeCookie, new File([PNG_BYTES], '../../etc/passwd', { type: 'image/png' })),
    );
    expect(res.status).toBe(400);
  });

  it('rejects files above the size limit', async () => {
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
    const res = await uploadRoute(
      uploadRequest(acmeCookie, new File([oversized], 'big.png', { type: 'image/png' })),
    );
    expect(res.status).toBe(413);
  });
});
