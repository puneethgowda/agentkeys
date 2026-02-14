import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const keys = sqliteTable("keys", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  provider: text("provider"),
  encryptedValue: blob("encrypted_value", { mode: "buffer" }).notNull(),
  nonce: blob("nonce", { mode: "buffer" }).notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown> | null>(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  tokenHash: text("token_hash").notNull(),
  scopes: text("scopes", { mode: "json" }).notNull().$type<string[]>(),
  maxTtlSeconds: integer("max_ttl_seconds").default(3600),
  budgetLimitDaily: integer("budget_limit_daily"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  lastAccessed: text("last_accessed"),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: text("agent_id"),
  agentName: text("agent_name"),
  keyName: text("key_name"),
  action: text("action").notNull(),
  scopeRequested: text("scope_requested"),
  ttlSeconds: integer("ttl_seconds"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: integer("success", { mode: "boolean" }),
  denialReason: text("denial_reason"),
  timestamp: text("timestamp").default(sql`CURRENT_TIMESTAMP`),
});

export const issuedTokens = sqliteTable("issued_tokens", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  keyName: text("key_name").notNull(),
  expiresAt: text("expires_at").notNull(),
  revoked: integer("revoked", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
