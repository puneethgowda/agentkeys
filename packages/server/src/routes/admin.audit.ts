import { Hono } from "hono";
import { getDb } from "../db/connection.js";
import { auditLog } from "../db/schema.js";
import { adminAuth } from "../middleware/auth.js";
import { eq, and, gte, lte, desc, like, sql } from "drizzle-orm";

const adminAudit = new Hono();

adminAudit.use("/admin/audit", adminAuth);

adminAudit.get("/admin/audit", (c) => {
  const db = getDb();
  const {
    agent_id,
    agent_name,
    key_name,
    action,
    success,
    from,
    to,
    search,
    page = "1",
    limit = "50",
  } = c.req.query();

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];

  if (agent_id) conditions.push(eq(auditLog.agentId, agent_id));
  if (agent_name) conditions.push(eq(auditLog.agentName, agent_name));
  if (key_name) conditions.push(eq(auditLog.keyName, key_name));
  if (action) conditions.push(eq(auditLog.action, action));
  if (success !== undefined) conditions.push(eq(auditLog.success, success === "true"));
  if (from) conditions.push(gte(auditLog.timestamp, from));
  if (to) conditions.push(lte(auditLog.timestamp, to));
  if (search) {
    conditions.push(
      like(auditLog.agentName, `%${search}%`)
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const entries = db
    .select()
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.timestamp))
    .limit(limitNum)
    .offset(offset)
    .all();

  const totalResult = db
    .select({ count: sql<number>`count(*)` })
    .from(auditLog)
    .where(where)
    .get();

  const total = totalResult?.count ?? 0;

  return c.json({
    entries,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

export default adminAudit;
