import { getSqlite } from "./connection.js";

export function runMigrations() {
  const sqlite = getSqlite();

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      provider TEXT,
      encrypted_value BLOB NOT NULL,
      nonce BLOB NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      token_hash TEXT NOT NULL,
      scopes TEXT NOT NULL,
      max_ttl_seconds INTEGER DEFAULT 3600,
      budget_limit_daily INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_accessed TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT,
      agent_name TEXT,
      key_name TEXT,
      action TEXT NOT NULL,
      scope_requested TEXT,
      ttl_seconds INTEGER,
      ip_address TEXT,
      user_agent TEXT,
      success INTEGER,
      denial_reason TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS issued_tokens (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      key_name TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_audit_log_agent_id ON audit_log(agent_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
    CREATE INDEX IF NOT EXISTS idx_issued_tokens_agent_id ON issued_tokens(agent_id);
  `);
}
