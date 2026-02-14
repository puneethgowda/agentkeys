export interface ServerConfig {
  port: number;
  host: string;
  dataDir: string;
  adminPasswordHash: string;
  masterKey: Buffer;
  jwtSecret: Uint8Array;
}

export interface StoredKey {
  id: string;
  name: string;
  provider: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Agent {
  id: string;
  name: string;
  scopes: string[];
  maxTtlSeconds: number | null;
  budgetLimitDaily: number | null;
  isActive: boolean | null;
  createdAt: string | null;
  lastAccessed: string | null;
}

export interface AuditEntry {
  id: number;
  agentId: string | null;
  agentName: string | null;
  keyName: string | null;
  action: string;
  scopeRequested: string | null;
  ttlSeconds: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean | null;
  denialReason: string | null;
  timestamp: string | null;
}

export interface KeyResponse {
  key: string;
  name: string;
  expires_in: number;
  issued_at: string;
  token_id: string;
}

export interface DashboardStats {
  totalKeys: number;
  totalAgents: number;
  activeAgents24h: number;
  requestsToday: number;
  recentActivity: AuditEntry[];
}
