import { Hono } from "hono";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getDb } from "../db/connection.js";
import { keys } from "../db/schema.js";
import { encrypt, decrypt } from "../vault/encrypt.js";
import { adminAuth } from "../middleware/auth.js";
import { eq } from "drizzle-orm";

const createKeySchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, "Name must be alphanumeric with dashes/underscores"),
  value: z.string().min(1, "Key value is required"),
  provider: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateKeySchema = z.object({
  value: z.string().min(1).optional(),
  provider: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const adminKeys = new Hono();

adminKeys.use("/admin/keys/*", adminAuth);
adminKeys.use("/admin/keys", adminAuth);

adminKeys.post("/admin/keys", async (c) => {
  const body = await c.req.json();
  const parsed = createKeySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const db = getDb();
  const masterKey = c.get("masterKey" as never) as Buffer;

  // Check for duplicate name
  const existing = db.select().from(keys).where(eq(keys.name, parsed.data.name)).get();
  if (existing) {
    return c.json({ error: `Key with name "${parsed.data.name}" already exists` }, 409);
  }

  const { encrypted, nonce } = encrypt(parsed.data.value, masterKey);
  const id = nanoid();

  db.insert(keys)
    .values({
      id,
      name: parsed.data.name,
      provider: parsed.data.provider ?? null,
      encryptedValue: encrypted,
      nonce,
      metadata: parsed.data.metadata ?? null,
    })
    .run();

  return c.json(
    {
      id,
      name: parsed.data.name,
      provider: parsed.data.provider ?? null,
      created_at: new Date().toISOString(),
    },
    201
  );
});

adminKeys.get("/admin/keys", (c) => {
  const db = getDb();
  const allKeys = db
    .select({
      id: keys.id,
      name: keys.name,
      provider: keys.provider,
      metadata: keys.metadata,
      createdAt: keys.createdAt,
      updatedAt: keys.updatedAt,
    })
    .from(keys)
    .all();

  return c.json({ keys: allKeys });
});

adminKeys.delete("/admin/keys/:id", (c) => {
  const id = c.req.param("id");
  const db = getDb();

  const existing = db.select().from(keys).where(eq(keys.id, id)).get();
  if (!existing) {
    return c.json({ error: "Key not found" }, 404);
  }

  db.delete(keys).where(eq(keys.id, id)).run();
  return c.json({ message: "Key deleted" });
});

adminKeys.put("/admin/keys/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateKeySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const db = getDb();
  const masterKey = c.get("masterKey" as never) as Buffer;

  const existing = db.select().from(keys).where(eq(keys.id, id)).get();
  if (!existing) {
    return c.json({ error: "Key not found" }, 404);
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (parsed.data.value) {
    const { encrypted, nonce } = encrypt(parsed.data.value, masterKey);
    updates.encryptedValue = encrypted;
    updates.nonce = nonce;
  }

  if (parsed.data.provider !== undefined) {
    updates.provider = parsed.data.provider;
  }

  if (parsed.data.metadata !== undefined) {
    updates.metadata = parsed.data.metadata;
  }

  db.update(keys).set(updates).where(eq(keys.id, id)).run();

  return c.json({ message: "Key updated" });
});

export default adminKeys;
