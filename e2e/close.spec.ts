import { expect, test } from '@playwright/test';
import { ACME, login, readActiveCount } from './helpers/auth';
import { readMailbox, waitForMailEntry } from './helpers/mailbox';

test('closing feedback updates the inbox, history and mailer', async ({ page }) => {
  await login(page, ACME.email, ACME.password);
  const countBefore = await readActiveCount(page);

  await page.getByText('Add dark mode to the mobile app').click();
  await page.getByRole('button', { name: 'Close feedback' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Close feedback' }).click();

  await expect(page.getByText('Feedback closed')).toBeVisible();
  await expect(page.getByText('closed', { exact: true })).toBeVisible();
  await expect(page.getByTestId('history-list').getByText('Closed', { exact: true })).toBeVisible();

  const entries = await waitForMailEntry('Add dark mode to the mobile app');
  expect(entries).toHaveLength(1);
  expect(entries[0].to).toBe('owner@acme.test');
  expect(entries[0].subject).toBe('Your feedback has been closed');
  expect(entries[0].templateData.feedbackTitle).toBe('Add dark mode to the mobile app');
  expect(entries[0].templateData.closedByDisplayName).toBe('Acme Owner');

  await page.getByRole('link', { name: 'Back to active feedback' }).click();
  await page.waitForURL('**/feedback');
  await expect(page.getByRole('link', { name: /Add dark mode to the mobile app/ })).not.toBeVisible();
  expect(await readActiveCount(page)).toBe(countBefore - 1);
});

test('retrying the close does not add a second mailer entry', async ({ page }) => {
  await login(page, ACME.email, ACME.password);

  await page.getByText('Search ignores punctuation').click();
  await page.getByRole('button', { name: 'Close feedback' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Close feedback' }).click();
  await waitForMailEntry('Search ignores punctuation');

  const outcome = await page.evaluate(async () => {
    const res = await fetch('/api/feedback/fb_acme_3/close', { method: 'PATCH' });
    return (await res.json()) as { outcome: string };
  });
  expect(outcome.outcome).toBe('already_closed');

  expect(readMailbox().filter((entry) => entry.templateData.feedbackTitle === 'Search ignores punctuation')).toHaveLength(1);
});
