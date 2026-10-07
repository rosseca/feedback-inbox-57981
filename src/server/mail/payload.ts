export const FEEDBACK_CLOSED_SUBJECT = 'Your feedback has been closed';

export interface SendFeedbackClosedEmailParams {
  to: string;
  subject: string;
  templateData: {
    feedbackTitle: string;
    closedByDisplayName: string;
  };
}

export function buildFeedbackClosedEmail(input: {
  creatorEmail: string;
  feedbackTitle: string;
  closedByDisplayName: string;
}): SendFeedbackClosedEmailParams {
  return {
    to: input.creatorEmail,
    subject: FEEDBACK_CLOSED_SUBJECT,
    templateData: {
      feedbackTitle: input.feedbackTitle,
      closedByDisplayName: input.closedByDisplayName,
    },
  };
}
