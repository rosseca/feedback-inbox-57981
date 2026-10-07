import { expect, type Page } from '@playwright/test';

export const ACME = { email: 'owner@acme.test', password: 'pass123' };
export const GLOBEX = { email: 'owner@globex.test', password: 'pass123' };

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/feedback');
}

export async function readActiveCount(page: Page): Promise<number> {
  await expect(page.getByTestId('active-count')).toHaveText(/^\d+$/);
  return Number(await page.getByTestId('active-count').innerText());
}
