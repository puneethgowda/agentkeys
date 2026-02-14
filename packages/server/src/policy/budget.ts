import { getDb } from "../db/connection.js";
import { auditLog } from "../db/schema.js";
import { eq, and, gte, sql } from "drizzle-orm";

export async function checkBudget(
  agentId: string,
  budgetLimitDaily: number | null
): Promise<{ allowed: boolean; reason?: string; used?: number }> {
  if (budgetLimitDaily === null || budgetLimitDaily === undefined) {
    return { allowed: true };
  }

  const db = getDb();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.agentId, agentId),
        eq(auditLog.action, "key_requested"),
        eq(auditLog.success, true),
        gte(auditLog.timestamp, todayStart.toISOString())
      )
    )
    .get();

  const used = result?.count ?? 0;

  if (used >= budgetLimitDaily) {
    return {
      allowed: false,
      reason: `Daily budget exceeded. Used ${used}/${budgetLimitDaily} requests today.`,
      used,
    };
  }

  return { allowed: true, used };
}
