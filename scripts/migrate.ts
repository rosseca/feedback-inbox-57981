import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getDb } from '../src/server/db';

async function main() {
  migrate(getDb(), { migrationsFolder: './drizzle' });
  console.log('Database migrations applied.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
