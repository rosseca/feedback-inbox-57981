import { appendMailboxEntry } from './e2e-mailbox';
import { buildFeedbackClosedEmail, type SendFeedbackClosedEmailParams } from './payload';
import { logger } from '../telemetry/logger';

export interface MailerRepository {
  sendFeedbackClosedEmail(params: SendFeedbackClosedEmailParams): Promise<void>;
}

export interface SentMailMessage {
  to: string;
  subject: string;
  templateData: { feedbackTitle: string; closedByDisplayName: string };
  timestamp: string;
}

const sentMessages: SentMailMessage[] = [];

export class InMemoryMailerRepository implements MailerRepository {
  async sendFeedbackClosedEmail(params: SendFeedbackClosedEmailParams): Promise<void> {
    const message: SentMailMessage = {
      to: params.to,
      subject: params.subject,
      templateData: params.templateData,
      timestamp: new Date().toISOString(),
    };
    sentMessages.push(message);
    logger.info('mailer.feedback_closed', {
      to: params.to,
      subject: params.subject,
      feedbackTitle: params.templateData.feedbackTitle,
    });
  }
}

export class E2eMailerRepository extends InMemoryMailerRepository {
  override async sendFeedbackClosedEmail(params: SendFeedbackClosedEmailParams): Promise<void> {
    await super.sendFeedbackClosedEmail(params);
    await appendMailboxEntry(params);
  }
}

const inMemoryMailer = new InMemoryMailerRepository();
const e2eMailer = new E2eMailerRepository();

export function getMailer(): MailerRepository {
  return process.env.E2E_MAILBOX_PATH ? e2eMailer : inMemoryMailer;
}

export function getSentMessagesInternal(): SentMailMessage[] {
  return sentMessages;
}

export { buildFeedbackClosedEmail };
