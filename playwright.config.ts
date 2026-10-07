import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  workers: 1,
  globalSetup: './e2e/global-setup.ts',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run start',
    port: 3000,
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      SESSION_SECRET: 'e2e-test-secret',
      DATABASE_PATH: './data/app.db',
      E2E_MAILBOX_PATH: './data/e2e/mailbox.jsonl',
    },
  },
});
