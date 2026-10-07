import { describe, expect, it } from 'vitest';
import { ACTIVE_STATUSES, evaluateCloseTransition, type FeedbackStatus } from '@/contracts/feedback';
import { createFeedbackSchema, listFeedbackQuerySchema } from '@/contracts/api';
import { loginSchema } from '@/contracts/auth';

describe('createFeedbackSchema', () => {
  const valid = {
    title: 'Valid title',
    description: 'A sufficiently long description.',
    priority: 'high',
  };

  it('accepts valid input', () => {
    expect(createFeedbackSchema.parse(valid)).toEqual(valid);
  });

  it('rejects a title that is too short', () => {
    expect(createFeedbackSchema.safeParse({ ...valid, title: 'ab' }).success).toBe(false);
  });

  it('rejects an unknown priority', () => {
    expect(createFeedbackSchema.safeParse({ ...valid, priority: 'urgent' }).success).toBe(false);
  });

  it('rejects a description that is too short', () => {
    expect(createFeedbackSchema.safeParse({ ...valid, description: 'too short' }).success).toBe(false);
  });
});

describe('listFeedbackQuerySchema', () => {
  it('rejects the closed status', () => {
    expect(listFeedbackQuerySchema.safeParse({ status: 'closed' }).success).toBe(false);
  });

  it('accepts every active status', () => {
    for (const status of ACTIVE_STATUSES) {
      expect(listFeedbackQuerySchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('accepts an empty query and trims search text', () => {
    const parsed = listFeedbackQuerySchema.parse({ query: '  search  ' });
    expect(parsed.query).toBe('search');
    expect(parsed.status).toBeUndefined();
  });
});

describe('evaluateCloseTransition', () => {
  it('closes every active status', () => {
    for (const status of ACTIVE_STATUSES) {
      expect(evaluateCloseTransition(status as FeedbackStatus)).toBe('closed');
    }
  });

  it('is idempotent when the feedback is already closed', () => {
    expect(evaluateCloseTransition('closed')).toBe('already_closed');
  });
});

describe('loginSchema', () => {
  it('normalizes the email address', () => {
    expect(loginSchema.parse({ email: '  Owner@Acme.TEST ', password: 'x' }).email).toBe('owner@acme.test');
  });

  it('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
  });
});
