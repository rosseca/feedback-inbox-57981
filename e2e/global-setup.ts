import fs from 'node:fs';
import path from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

export default async function globalSetup() {
  const dataDir = path.resolve(process.cwd(), 'data');
  fs.rmSync(path.join(dataDir, 'app.db'), { force: true });
  fs.rmSync(path.join(dataDir, 'app.db-wal'), { force: true });
  fs.rmSync(path.join(dataDir, 'app.db-shm'), { force: true });
  fs.rmSync(path.join(dataDir, 'uploads'), { recursive: true, force: true });
  fs.rmSync(path.join(dataDir, 'e2e'), { recursive: true, force: true });

  process.env.DATABASE_PATH = path.join(dataDir, 'app.db');
  process.env.SESSION_SECRET ??= 'e2e-test-secret';

  const { getDb } = await import('../src/server/db');
  const { seedDatabase } = await import('../src/server/db/seed');
  const db = getDb(process.env.DATABASE_PATH);
  migrate(db, { migrationsFolder: './drizzle' });
  await seedDatabase(db);
}
