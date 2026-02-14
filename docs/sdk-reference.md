# SDK Reference

## TypeScript SDK

### Installation

```bash
npm install agentkeys
```

### `AgentKeys` Class

```typescript
import { AgentKeys } from "agentkeys";

const agent = new AgentKeys({
  server: "http://localhost:8888",
  token: "agt_...",
});
```

### Methods

#### `get(name, options?)`

Request an API key by name.

```typescript
const key = await agent.get("openai");
const key = await agent.get("openai", { ttl: 3600 });
```

- Returns: `Promise<string>` — the raw API key value
- Throws: `AgentKeysError` on failure
- Caches the key locally until TTL expires

#### `listKeys()`

List all keys this agent has access to.

```typescript
const keys = await agent.listKeys();
// ["openai", "gmail"]
```

#### `release(name)`

Release a key early (clears cache + notifies server).

```typescript
await agent.release("openai");
```

#### `withKey(name, fn, options?)`

Use a key with automatic cleanup.

```typescript
await agent.withKey("openai", async (key) => {
  // use key...
}); // key is released after callback
```

#### `destroy()`

Clean up all cached keys and timers.

```typescript
agent.destroy();
```

### Error Classes

| Class | Status | Description |
|---|---|---|
| `AgentKeysError` | any | Base error |
| `AgentKeysConnectionError` | 0 | Cannot reach server |
| `AgentKeysAuthError` | 401 | Invalid token |
| `AgentKeysScopeError` | 403 | Not authorized for key |
| `AgentKeysBudgetError` | 429 | Daily budget exceeded |

---

## Python SDK

### Installation

```bash
pip install agentkeys
```

### Usage

```python
from agentkeys import AgentKeys

agent = AgentKeys(
    server="http://localhost:8888",
    token="agt_...",
)

# Get a key
key = agent.get("openai")
key = agent.get("openai", ttl=3600)

# List keys
keys = agent.list_keys()

# Release early
agent.release("openai")

# Context manager
with agent.key("openai") as key:
    # use key...
    pass  # key released after block

# Cleanup
agent.close()
```

### Error Classes

Same hierarchy as TypeScript: `AgentKeysError`, `AgentKeysConnectionError`, `AgentKeysAuthError`, `AgentKeysScopeError`, `AgentKeysBudgetError`.
