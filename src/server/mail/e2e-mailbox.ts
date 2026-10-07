import fs from 'node:fs';
import path from 'node:path';
import type { SendFeedbackClosedEmailParams } from './payload';

export interface MailboxEntry {
  to: string;
  subject: string;
  templateData: { feedbackTitle: string; closedByDisplayName: string };
  timestamp: string;
}

export async function appendMailboxEntry(params: SendFeedbackClosedEmailParams): Promise<void> {
  const mailboxPath = process.env.E2E_MAILBOX_PATH;
  if (!mailboxPath) {
    return;
  }
  await fs.promises.mkdir(path.dirname(mailboxPath), { recursive: true });
  const entry: MailboxEntry = {
    to: params.to,
    subject: params.subject,
    templateData: params.templateData,
    timestamp: new Date().toISOString(),
  };
  await fs.promises.appendFile(mailboxPath, `${JSON.stringify(entry)}\n`, 'utf8');
}
