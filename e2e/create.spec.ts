import { expect, test } from '@playwright/test';
import { ACME, login, readActiveCount } from './helpers/auth';

const PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
]);

test('creates feedback with an attachment and updates the active count', async ({ page }) => {
  await login(page, ACME.email, ACME.password);
  const countBefore = await readActiveCount(page);

  await page.goto('/feedback/new');
  await page.getByLabel('Title').fill('E2E created feedback');
  await page.getByLabel('Description').fill('Created by the end-to-end suite with enough detail.');
  await page.getByLabel('Priority').selectOption('high');
  await page.setInputFiles('#attachment', {
    name: 'evidence.png',
    mimeType: 'image/png',
    buffer: PNG_BUFFER,
  });
  await page.getByRole('button', { name: 'Create feedback' }).click();

  await page.waitForURL(/\/feedback\/[0-9a-f]{8}-/);
  await expect(page.getByRole('heading', { name: 'E2E created feedback' })).toBeVisible();
  await expect(page.getByText('Download evidence.png')).toBeVisible();

  await page.goto('/feedback');
  await expect(page.getByText('E2E created feedback')).toBeVisible();
  expect(await readActiveCount(page)).toBe(countBefore + 1);
});

test('blocks invalid input on the client before submitting', async ({ page }) => {
  await login(page, ACME.email, ACME.password);
  await page.goto('/feedback/new');

  await page.getByRole('button', { name: 'Create feedback' }).click();

  await expect(page.getByText('Title must be at least 3 characters')).toBeVisible();
  await expect(page.getByText('Description must be at least 10 characters')).toBeVisible();
});
