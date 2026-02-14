import { Hono } from "hono";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getDb } from "../db/connection.js";
import { agents, issuedTokens } from "../db/schema.js";
import { generateAgentToken, hashToken } from "../vault/tokens.js";
import { adminAuth } from "../middleware/auth.js";
import { eq } from "drizzle-orm";

const createAgentSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, "Name must be alphanumeric with dashes/underscores"),
  scopes: z.array(z.string()).min(1, "At least one scope is required"),
  maxTtlSeconds: z.number().int().min(60).max(86400).optional(),
  budgetLimitDaily: z.number().int().min(1).optional(),
});

const updateAgentSchema = z.object({
  scopes: z.array(z.string()).min(1).optional(),
  maxTtlSeconds: z.number().int().min(60).max(86400).optional(),
  budgetLimitDaily: z.number().int().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});

const adminAgents = new Hono();

adminAgents.use("/admin/agents/*", adminAuth);
adminAgents.use("/admin/agents", adminAuth);

adminAgents.post("/admin/agents", async (c) => {
  const body = await c.req.json();
  const parsed = createAgentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const db = getDb();

  // Check for duplicate name
  const existing = db.select().from(agents).where(eq(agents.name, parsed.data.name)).get();
  if (existing) {
    return c.json({ error: `Agent with name "${parsed.data.name}" already exists` }, 409);
  }

  const token = generateAgentToken();
  const tokenHash = await hashToken(token);
  const id = nanoid();

  db.insert(agents)
    .values({
      id,
      name: parsed.data.name,
      tokenHash,
      scopes: parsed.data.scopes,
      maxTtlSeconds: parsed.data.maxTtlSeconds ?? 3600,
      budgetLimitDaily: parsed.data.budgetLimitDaily ?? null,
      isActive: true,
    })
    .run();

  return c.json(
    {
      id,
      name: parsed.data.name,
      token, // Shown only once
      scopes: parsed.data.scopes,
      message: "Save this token — it will not be shown again.",
    },
    201
  );
});

adminAgents.get("/admin/agents", (c) => {
  const db = getDb();
  const allAgents = db
    .select({
      id: agents.id,
      name: agents.name,
      scopes: agents.scopes,
      maxTtlSeconds: agents.maxTtlSeconds,
      budgetLimitDaily: agents.budgetLimitDaily,
      isActive: agents.isActive,
      createdAt: agents.createdAt,
      lastAccessed: agents.lastAccessed,
    })
    .from(agents)
    .all();

  return c.json({ agents: allAgents });
});

adminAgents.put("/admin/agents/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateAgentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const db = getDb();
  const existing = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!existing) {
    return c.json({ error: "Agent not found" }, 404);
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.scopes !== undefined) updates.scopes = parsed.data.scopes;
  if (parsed.data.maxTtlSeconds !== undefined) updates.maxTtlSeconds = parsed.data.maxTtlSeconds;
  if (parsed.data.budgetLimitDaily !== undefined) updates.budgetLimitDaily = parsed.data.budgetLimitDaily;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

  db.update(agents).set(updates).where(eq(agents.id, id)).run();
  return c.json({ message: "Agent updated" });
});

adminAgents.delete("/admin/agents/:id", (c) => {
  const id = c.req.param("id");
  const db = getDb();

  const existing = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!existing) {
    return c.json({ error: "Agent not found" }, 404);
  }

  db.delete(agents).where(eq(agents.id, id)).run();
  return c.json({ message: "Agent deleted" });
});

adminAgents.post("/admin/agents/:id/revoke", (c) => {
  const id = c.req.param("id");
  const db = getDb();

  const existing = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!existing) {
    return c.json({ error: "Agent not found" }, 404);
  }

  // Revoke all issued tokens
  db.update(issuedTokens)
    .set({ revoked: true })
    .where(eq(issuedTokens.agentId, id))
    .run();

  // Deactivate agent
  db.update(agents)
    .set({ isActive: false })
    .where(eq(agents.id, id))
    .run();

  return c.json({ message: "Agent revoked and deactivated" });
});

adminAgents.post("/admin/agents/:id/rotate", async (c) => {
  const id = c.req.param("id");
  const db = getDb();

  const existing = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!existing) {
    return c.json({ error: "Agent not found" }, 404);
  }

  const newToken = generateAgentToken();
  const newHash = await hashToken(newToken);

  // Revoke old issued tokens
  db.update(issuedTokens)
    .set({ revoked: true })
    .where(eq(issuedTokens.agentId, id))
    .run();

  // Update token hash
  db.update(agents)
    .set({ tokenHash: newHash })
    .where(eq(agents.id, id))
    .run();

  return c.json({
    token: newToken,
    message: "Token rotated. Save this new token — it will not be shown again.",
  });
});

export default adminAgents;
