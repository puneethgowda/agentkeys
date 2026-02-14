export interface AgentKeysConfig {
  server: string;
  token: string;
}

export interface GetKeyOptions {
  ttl?: number;
}

export interface KeyResponse {
  key: string;
  name: string;
  expires_in: number;
  issued_at: string;
  token_id: string;
}

export interface ErrorResponse {
  error: string;
}
