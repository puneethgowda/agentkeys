const BASE = "/api";

let authToken: string | null = null;

export function setToken(token: string) {
  authToken = token;
  localStorage.setItem("agentkeys_token", token);
}

export function getToken(): string | null {
  if (authToken) return authToken;
  const stored = localStorage.getItem("agentkeys_token");
  if (stored) authToken = stored;
  return authToken;
}

export function clearToken() {
  authToken = null;
  localStorage.removeItem("agentkeys_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (password: string) =>
    request<{ token: string; expires_in: number }>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>("/admin/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Keys
  getKeys: () => request<{ keys: Key[] }>("/admin/keys"),
  createKey: (data: { name: string; value: string; provider?: string; metadata?: Record<string, unknown> }) =>
    request<Key>("/admin/keys", { method: "POST", body: JSON.stringify(data) }),
  deleteKey: (id: string) =>
    request<{ message: string }>(`/admin/keys/${id}`, { method: "DELETE" }),
  updateKey: (id: string, data: { value?: string; provider?: string }) =>
    request<{ message: string }>(`/admin/keys/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Agents
  getAgents: () => request<{ agents: Agent[] }>("/admin/agents"),
  createAgent: (data: { name: string; scopes: string[]; maxTtlSeconds?: number; budgetLimitDaily?: number }) =>
    request<{ id: string; name: string; token: string; scopes: string[]; message: string }>(
      "/admin/agents",
      { method: "POST", body: JSON.stringify(data) }
    ),
  updateAgent: (id: string, data: Partial<{ scopes: string[]; maxTtlSeconds: number; budgetLimitDaily: number | null; isActive: boolean }>) =>
    request<{ message: string }>(`/admin/agents/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAgent: (id: string) =>
    request<{ message: string }>(`/admin/agents/${id}`, { method: "DELETE" }),
  revokeAgent: (id: string) =>
    request<{ message: string }>(`/admin/agents/${id}/revoke`, { method: "POST" }),
  rotateAgent: (id: string) =>
    request<{ token: string; message: string }>(`/admin/agents/${id}/rotate`, { method: "POST" }),

  // Audit
  getAudit: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ entries: AuditEntry[]; pagination: Pagination }>(`/admin/audit${qs}`);
  },

  // Stats
  getStats: () => request<DashboardStats>("/admin/stats"),

  // Health
  getHealth: () => request<{ status: string; version: string; uptime: number }>("/health"),
};

// Types
export interface Key {
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

export interface DashboardStats {
  totalKeys: number;
  totalAgents: number;
  activeAgents24h: number;
  requestsToday: number;
  recentActivity: AuditEntry[];
  dailyRequests: { date: string; count: number }[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
