import { getDb } from '../src/server/db';
import { seedDatabase } from '../src/server/db/seed';

async function main() {
  await seedDatabase(getDb());
  console.log('Database seeded with development data.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
