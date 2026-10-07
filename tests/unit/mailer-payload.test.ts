import { describe, expect, it } from 'vitest';
import { buildFeedbackClosedEmail } from '@/server/mail/payload';

describe('buildFeedbackClosedEmail', () => {
  it('targets the feedback creator with the closure subject', () => {
    const email = buildFeedbackClosedEmail({
      creatorEmail: 'creator@example.test',
      feedbackTitle: 'Dashboard export fails',
      closedByDisplayName: 'Acme Owner',
    });

    expect(email.to).toBe('creator@example.test');
    expect(email.subject).toBe('Your feedback has been closed');
    expect(email.templateData.feedbackTitle).toBe('Dashboard export fails');
    expect(email.templateData.closedByDisplayName).toBe('Acme Owner');
  });

  it('never includes the feedback description or session data', () => {
    const email = buildFeedbackClosedEmail({
      creatorEmail: 'creator@example.test',
      feedbackTitle: 'Title',
      closedByDisplayName: 'Closer',
    });

    const serialized = JSON.stringify(email);
    expect(serialized).not.toContain('description');
    expect(Object.keys(email)).toEqual(['to', 'subject', 'templateData']);
  });
});
