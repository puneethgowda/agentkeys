import { getDb } from "../db/connection.js";
import { auditLog } from "../db/schema.js";

interface AuditEvent {
  agentId?: string;
  agentName?: string;
  keyName?: string;
  action: string;
  scopeRequested?: string;
  ttlSeconds?: number;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  denialReason?: string;
}

export function logAuditEvent(event: AuditEvent): void {
  const db = getDb();
  db.insert(auditLog)
    .values({
      agentId: event.agentId ?? null,
      agentName: event.agentName ?? null,
      keyName: event.keyName ?? null,
      action: event.action,
      scopeRequested: event.scopeRequested ?? null,
      ttlSeconds: event.ttlSeconds ?? null,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
      success: event.success,
      denialReason: event.denialReason ?? null,
    })
    .run();
}
