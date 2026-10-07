import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { closeDb, getDb } from '@/server/db';
import { seedDatabase } from '@/server/db/seed';

export interface TestDbHandle {
  dbPath: string;
  cleanup(): void;
}

export async function setupTestDb(): Promise<TestDbHandle> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feedback-inbox-test-'));
  const dbPath = path.join(dir, 'test.db');
  process.env.DATABASE_PATH = dbPath;
  process.env.SESSION_SECRET ??= 'test-secret';
  const db = getDb(dbPath);
  migrate(db, { migrationsFolder: './drizzle' });
  await seedDatabase(db);
  return {
    dbPath,
    cleanup() {
      delete process.env.DATABASE_PATH;
      closeDb(dbPath);
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
