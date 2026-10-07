import fs from 'node:fs';

export const MAILBOX_PATH = 'data/e2e/mailbox.jsonl';

export interface MailboxEntry {
  to: string;
  subject: string;
  templateData: { feedbackTitle: string; closedByDisplayName: string };
  timestamp: string;
}

export function readMailbox(): MailboxEntry[] {
  try {
    const content = fs.readFileSync(MAILBOX_PATH, 'utf8').trim();
    if (!content) {
      return [];
    }
    return content.split('\n').map((line) => JSON.parse(line) as MailboxEntry);
  } catch {
    return [];
  }
}

export async function waitForMailEntry(feedbackTitle: string, timeoutMs = 5000): Promise<MailboxEntry[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const matches = readMailbox().filter((entry) => entry.templateData.feedbackTitle === feedbackTitle);
    if (matches.length > 0) {
      return matches;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return readMailbox().filter((entry) => entry.templateData.feedbackTitle === feedbackTitle);
}
