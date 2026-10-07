import { expect, test } from '@playwright/test';
import { ACME, login } from './helpers/auth';

test('login shows only the current workspace feedback', async ({ page }) => {
  await login(page, ACME.email, ACME.password);

  await expect(page.getByRole('heading', { name: 'Active feedback' })).toBeVisible();
  await expect(page.getByTestId('active-count')).toHaveText('3');
  await expect(page.getByText('Dashboard export fails on large reports')).toBeVisible();
  await expect(page.getByText('Invoice PDF missing tax id')).not.toBeVisible();
});

test('invalid credentials show an error message', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ACME.email);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText('Invalid email or password')).toBeVisible();
});

test('unauthenticated visits redirect to the login page', async ({ page }) => {
  await page.goto('/feedback');
  await page.waitForURL('**/login');
});
