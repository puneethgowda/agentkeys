import type { AgentKeysConfig, GetKeyOptions, KeyResponse, ErrorResponse } from "./types.js";
import {
  AgentKeysError,
  AgentKeysConnectionError,
  AgentKeysAuthError,
  AgentKeysScopeError,
  AgentKeysBudgetError,
} from "./errors.js";

export class AgentKeys {
  private server: string;
  private token: string;
  private cache: Map<string, { value: string; expiresAt: number }>;
  private timers: Map<string, ReturnType<typeof setTimeout>>;

  constructor(config: AgentKeysConfig) {
    this.server = config.server.replace(/\/+$/, "");
    this.token = config.token;
    this.cache = new Map();
    this.timers = new Map();
  }

  async get(name: string, options?: GetKeyOptions): Promise<string> {
    // Check cache first
    const cached = this.cache.get(name);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    let res: Response;
    try {
      res = await fetch(`${this.server}/api/v1/keys/${encodeURIComponent(name)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: options?.ttl }),
      });
    } catch (err) {
      throw new AgentKeysConnectionError(
        `Failed to connect to AgentKeys server at ${this.server}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({ error: "Unknown error" }))) as ErrorResponse;
      const message = body.error ?? `HTTP ${res.status}`;

      switch (res.status) {
        case 401:
          throw new AgentKeysAuthError(message);
        case 403:
          throw new AgentKeysScopeError(message);
        case 429:
          throw new AgentKeysBudgetError(message);
        default:
          throw new AgentKeysError(message, res.status);
      }
    }

    const data = (await res.json()) as KeyResponse;

    // Cache with TTL
    if (data.expires_in) {
      this.cache.set(name, {
        value: data.key,
        expiresAt: Date.now() + data.expires_in * 1000,
      });

      // Auto-clear from memory after TTL
      const existing = this.timers.get(name);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        this.cache.delete(name);
        this.timers.delete(name);
      }, data.expires_in * 1000);
      // Don't hold the process open (Node.js only)
      if (typeof timer === "object" && timer !== null && "unref" in timer) {
        (timer as { unref: () => void }).unref();
      }
      this.timers.set(name, timer);
    }

    return data.key;
  }

  async listKeys(): Promise<string[]> {
    let res: Response;
    try {
      res = await fetch(`${this.server}/api/v1/keys`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
    } catch (err) {
      throw new AgentKeysConnectionError(
        `Failed to connect to AgentKeys server at ${this.server}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({ error: "Unknown error" }))) as ErrorResponse;
      throw new AgentKeysError(body.error ?? `HTTP ${res.status}`, res.status);
    }

    const data = (await res.json()) as { keys: string[] };
    return data.keys;
  }

  async release(name: string): Promise<void> {
    this.cache.delete(name);
    const timer = this.timers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(name);
    }

    try {
      await fetch(
        `${this.server}/api/v1/keys/${encodeURIComponent(name)}/release`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${this.token}` },
        }
      );
    } catch {
      // Best-effort release notification
    }
  }

  async withKey<T>(
    name: string,
    fn: (key: string) => Promise<T>,
    options?: GetKeyOptions
  ): Promise<T> {
    const key = await this.get(name, options);
    try {
      return await fn(key);
    } finally {
      await this.release(name);
    }
  }

  destroy(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
  }
}
