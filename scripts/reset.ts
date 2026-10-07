import fs from 'node:fs';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { closeDb, getDb } from '../src/server/db';
import { seedDatabase } from '../src/server/db/seed';

const dbPath = process.env.DATABASE_PATH ?? './data/app.db';

function removeDatabaseFiles(): void {
  for (const suffix of ['', '-wal', '-shm']) {
    const file = `${dbPath}${suffix}`;
    if (fs.existsSync(file)) {
      fs.rmSync(file);
      console.log(`Removed ${file}`);
    }
  }
}

async function main() {
  removeDatabaseFiles();
  const db = getDb(dbPath);
  migrate(db, { migrationsFolder: './drizzle' });
  console.log('Database migrations applied.');
  await seedDatabase(db);
  console.log('Database seeded with development data.');
  closeDb(dbPath);
  console.log('Database reset complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
