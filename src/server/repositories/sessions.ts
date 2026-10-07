import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { sessions } from '../db/schema';

export function insertSession(id: string, userId: string, expiresAt: string): void {
  getDb().insert(sessions).values({ id, userId, expiresAt }).run();
}

export function deleteSessionById(id: string): void {
  getDb().delete(sessions).where(eq(sessions.id, id)).run();
}
