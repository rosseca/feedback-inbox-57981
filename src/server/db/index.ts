import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export type AppDatabase = BetterSQLite3Database<typeof schema>;

type DbCache = Map<string, AppDatabase>;
type RawCache = Map<string, InstanceType<typeof Database>>;
const globalForDb = globalThis as unknown as {
  __feedbackInboxDbCache?: DbCache;
  __feedbackInboxRawCache?: RawCache;
};
const dbCache: DbCache = (globalForDb.__feedbackInboxDbCache ??= new Map());
const rawCache: RawCache = (globalForDb.__feedbackInboxRawCache ??= new Map());

export function getDb(dbPath: string = process.env.DATABASE_PATH ?? './data/app.db'): AppDatabase {
  const cached = dbCache.get(dbPath);
  if (cached) {
    return cached;
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');

  const db = drizzle(sqlite, { schema });
  dbCache.set(dbPath, db);
  rawCache.set(dbPath, sqlite);
  return db;
}

export function closeDb(dbPath: string): void {
  rawCache.get(dbPath)?.close();
  rawCache.delete(dbPath);
  dbCache.delete(dbPath);
}
