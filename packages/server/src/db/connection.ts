import type BetterSqlite3 from "better-sqlite3";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { existsSync, mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlite: BetterSqlite3.Database | null = null;

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

export function getSqlite(): BetterSqlite3.Database {
  if (!sqlite) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return sqlite;
}

export function initDb(dbPath: string) {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  // Set restrictive permissions on the database file
  try {
    chmodSync(dbPath, 0o600);
  } catch {
    // May fail on some platforms, non-critical
  }

  db = drizzle(sqlite, { schema });
  return db;
}

export function closeDb() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}
