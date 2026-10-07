import { getSentMessagesInternal } from './mailer';

export function inspectSentMailForTesting() {
  return [...getSentMessagesInternal()];
}

export function resetSentMailForTesting(): void {
  getSentMessagesInternal().length = 0;
}
