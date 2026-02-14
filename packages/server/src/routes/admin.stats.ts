import { Hono } from "hono";
import { getDb } from "../db/connection.js";
import { keys, agents, auditLog } from "../db/schema.js";
import { adminAuth } from "../middleware/auth.js";
import { sql, gte, desc } from "drizzle-orm";

const adminStats = new Hono();

adminStats.use("/admin/stats", adminAuth);

adminStats.get("/admin/stats", (c) => {
  const db = getDb();

  const totalKeys = db.select({ count: sql<number>`count(*)` }).from(keys).get()?.count ?? 0;
  const totalAgents = db.select({ count: sql<number>`count(*)` }).from(agents).get()?.count ?? 0;

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const activeAgents24h = db
    .select({ count: sql<number>`count(*)` })
    .from(agents)
    .where(gte(agents.lastAccessed, yesterday))
    .get()?.count ?? 0;

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const requestsToday = db
    .select({ count: sql<number>`count(*)` })
    .from(auditLog)
    .where(gte(auditLog.timestamp, todayStart.toISOString()))
    .get()?.count ?? 0;

  const recentActivity = db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.timestamp))
    .limit(20)
    .all();

  // Requests per day for last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dailyRequests = db
    .select({
      date: sql<string>`date(${auditLog.timestamp})`,
      count: sql<number>`count(*)`,
    })
    .from(auditLog)
    .where(gte(auditLog.timestamp, sevenDaysAgo))
    .groupBy(sql`date(${auditLog.timestamp})`)
    .all();

  return c.json({
    totalKeys,
    totalAgents,
    activeAgents24h,
    requestsToday,
    recentActivity,
    dailyRequests,
  });
});

export default adminStats;
