export class AgentKeysError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AgentKeysError";
    this.status = status;
  }
}

export class AgentKeysConnectionError extends AgentKeysError {
  constructor(message: string) {
    super(message, 0);
    this.name = "AgentKeysConnectionError";
  }
}

export class AgentKeysAuthError extends AgentKeysError {
  constructor(message: string) {
    super(message, 401);
    this.name = "AgentKeysAuthError";
  }
}

export class AgentKeysScopeError extends AgentKeysError {
  constructor(message: string) {
    super(message, 403);
    this.name = "AgentKeysScopeError";
  }
}

export class AgentKeysBudgetError extends AgentKeysError {
  constructor(message: string) {
    super(message, 429);
    this.name = "AgentKeysBudgetError";
  }
}
