import { afterEach, describe, expect, it } from 'vitest';
import { E2eMailerRepository, InMemoryMailerRepository, getMailer } from '@/server/mail/mailer';

describe('getMailer', () => {
  const originalMailboxPath = process.env.E2E_MAILBOX_PATH;

  afterEach(() => {
    if (originalMailboxPath === undefined) {
      delete process.env.E2E_MAILBOX_PATH;
    } else {
      process.env.E2E_MAILBOX_PATH = originalMailboxPath;
    }
  });

  it('uses the in-memory mailer outside the E2E environment', () => {
    delete process.env.E2E_MAILBOX_PATH;
    expect(getMailer()).toBeInstanceOf(InMemoryMailerRepository);
  });

  it('uses the JSONL mailbox mailer only in the E2E environment', () => {
    process.env.E2E_MAILBOX_PATH = 'data/tmp-mailbox.jsonl';
    expect(getMailer()).toBeInstanceOf(E2eMailerRepository);
  });
});
