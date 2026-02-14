import { Hono } from "hono";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getDb } from "../db/connection.js";
import { keys, agents, issuedTokens } from "../db/schema.js";
import { decrypt } from "../vault/encrypt.js";
import { agentAuth } from "../middleware/agent-auth.js";
import { checkScope } from "../policy/scope.js";
import { resolveTtl, getExpiresAt } from "../policy/ttl.js";
import { checkBudget } from "../policy/budget.js";
import { logAuditEvent } from "../audit/logger.js";
import { eq } from "drizzle-orm";

const requestKeySchema = z.object({
  ttl: z.number().int().min(60).max(86400).optional(),
});

const agentKeys = new Hono();

agentKeys.use("/v1/keys/*", agentAuth);
agentKeys.use("/v1/keys", agentAuth);

// Request a key by name (the core flow)
agentKeys.post("/v1/keys/:name", async (c) => {
  const keyName = c.req.param("name");
  const agent = c.get("agent" as never) as {
    id: string;
    name: string;
    scopes: string[];
    maxTtlSeconds: number | null;
    budgetLimitDaily: number | null;
  };
  const masterKey = c.get("masterKey" as never) as Buffer;

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ?? "unknown";
  const ua = c.req.header("user-agent") ?? "unknown";

  // Parse body
  let body = {};
  try {
    body = await c.req.json();
  } catch {
    // Empty body is OK
  }
  const parsed = requestKeySchema.safeParse(body);
  const requestedTtl = parsed.success ? parsed.data.ttl : undefined;

  // 1. Check scope
  const scopeCheck = checkScope(agent.scopes, keyName);
  if (!scopeCheck.allowed) {
    logAuditEvent({
      agentId: agent.id,
      agentName: agent.name,
      keyName,
      action: "key_denied",
      scopeRequested: keyName,
      ipAddress: ip,
      userAgent: ua,
      success: false,
      denialReason: scopeCheck.reason,
    });
    return c.json({ error: scopeCheck.reason }, 403);
  }

  // 2. Check budget
  const budgetCheck = await checkBudget(agent.id, agent.budgetLimitDaily);
  if (!budgetCheck.allowed) {
    logAuditEvent({
      agentId: agent.id,
      agentName: agent.name,
      keyName,
      action: "key_denied",
      scopeRequested: keyName,
      ipAddress: ip,
      userAgent: ua,
      success: false,
      denialReason: budgetCheck.reason,
    });
    return c.json({ error: budgetCheck.reason }, 429);
  }

  // 3. Find the stored key
  const db = getDb();
  const storedKey = db.select().from(keys).where(eq(keys.name, keyName)).get();
  if (!storedKey) {
    logAuditEvent({
      agentId: agent.id,
      agentName: agent.name,
      keyName,
      action: "key_denied",
      scopeRequested: keyName,
      ipAddress: ip,
      userAgent: ua,
      success: false,
      denialReason: `Key "${keyName}" not found`,
    });
    return c.json({ error: `Key "${keyName}" not found` }, 404);
  }

  // 4. Decrypt the key
  const decrypted = decrypt(storedKey.encryptedValue, storedKey.nonce, masterKey);

  // 5. Resolve TTL
  const ttl = resolveTtl(requestedTtl, agent.maxTtlSeconds);
  const expiresAt = getExpiresAt(ttl);

  // 6. Record issued token
  const tokenId = `iss_${nanoid()}`;
  db.insert(issuedTokens)
    .values({
      id: tokenId,
      agentId: agent.id,
      keyName,
      expiresAt,
    })
    .run();

  // 7. Log the access
  logAuditEvent({
    agentId: agent.id,
    agentName: agent.name,
    keyName,
    action: "key_requested",
    scopeRequested: keyName,
    ttlSeconds: ttl,
    ipAddress: ip,
    userAgent: ua,
    success: true,
  });

  // 8. Update agent's last_accessed
  db.update(agents)
    .set({ lastAccessed: new Date().toISOString() })
    .where(eq(agents.id, agent.id))
    .run();

  // 9. Return the key
  return c.json({
    key: decrypted,
    name: keyName,
    expires_in: ttl,
    issued_at: new Date().toISOString(),
    token_id: tokenId,
  });
});

// List keys this agent can access
agentKeys.get("/v1/keys", (c) => {
  const agent = c.get("agent" as never) as { scopes: string[] };
  const db = getDb();

  if (agent.scopes.includes("*")) {
    const allKeys = db.select({ name: keys.name }).from(keys).all();
    return c.json({ keys: allKeys.map((k) => k.name) });
  }

  return c.json({ keys: agent.scopes });
});

// Release a key early
agentKeys.post("/v1/keys/:name/release", (c) => {
  const keyName = c.req.param("name");
  const agent = c.get("agent" as never) as { id: string; name: string };

  logAuditEvent({
    agentId: agent.id,
    agentName: agent.name,
    keyName,
    action: "key_released",
    success: true,
  });

  return c.json({ message: "Key released" });
});

export default agentKeys;
