import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { users } from '../db/schema';

export function findUserByEmail(email: string) {
  return getDb().select().from(users).where(eq(users.email, email)).limit(1).get() ?? null;
}

export function findUserById(id: string) {
  return getDb().select().from(users).where(eq(users.id, id)).limit(1).get() ?? null;
}
