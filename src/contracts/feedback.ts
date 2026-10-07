export const FEEDBACK_STATUSES = ['new', 'triaged', 'planned', 'closed'] as const;
export const ACTIVE_STATUSES = ['new', 'triaged', 'planned'] as const;
export const PRIORITIES = ['low', 'medium', 'high'] as const;

export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export type ActiveFeedbackStatus = (typeof ACTIVE_STATUSES)[number];
export type FeedbackPriority = (typeof PRIORITIES)[number];
export type FeedbackEventType = 'feedback_created' | 'feedback_closed';
export type CloseOutcome = 'closed' | 'already_closed';

export function isActiveStatus(status: FeedbackStatus): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

export function evaluateCloseTransition(status: FeedbackStatus): CloseOutcome | null {
  if (isActiveStatus(status)) {
    return 'closed';
  }
  if (status === 'closed') {
    return 'already_closed';
  }
  return null;
}
