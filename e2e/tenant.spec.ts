import { expect, test } from '@playwright/test';
import { GLOBEX, login } from './helpers/auth';

test('another workspace cannot open a foreign feedback page', async ({ page }) => {
  await login(page, GLOBEX.email, GLOBEX.password);

  await page.goto('/feedback/fb_acme_1');
  await expect(page.getByRole('heading', { name: '404 — Page not found' })).toBeVisible();
});

test('another workspace cannot read foreign feedback over the API', async ({ page }) => {
  await login(page, GLOBEX.email, GLOBEX.password);

  const res = await page.request.get('/api/feedback/fb_acme_1');
  expect(res.status()).toBe(404);
});
