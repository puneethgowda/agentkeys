<div align="center">

# AgentKeys

**Self-hosted API key manager for AI agents.**

Replace your `.env` files. Give your AI agents scoped, temporary, audited access to API keys.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://typescriptlang.org)
[![npm](https://img.shields.io/badge/npm-agentkeys-red.svg)](https://www.npmjs.com/package/agentkeys)

</div>

---

One command to run:

```bash
npm install -g agentkeys
agentkeys init
agentkeys serve
```

Three lines to integrate:

```typescript
import { AgentKeys } from "@agentkeys/client";
const agent = new AgentKeys({ server: "http://localhost:8888", token: "agt_..." });
const key = await agent.get("openai");
```

---

## Why AgentKeys?

You're building with AI agents. Each agent needs API keys. Right now you're probably:

- Hardcoding keys in `.env` files shared across every agent
- Giving every agent access to every key with no limits
- Having zero visibility into which agent used what key and when
- Manually rotating keys across dozens of services when one leaks
- Hoping nobody commits `.env` to git (again)

AgentKeys fixes all of this. Store keys in an encrypted vault. Give each agent only the keys it needs, with time limits and usage budgets. See every access in an audit log. Rotate tokens instantly.

## Features

- **Encrypted vault** — AES-256-GCM encryption, master key derived via Argon2id
- **Per-agent scoped access** — each agent only sees the keys you allow
- **TTL / temporary keys** — keys auto-expire after a set duration
- **Usage budgets** — daily request limits per agent
- **Full audit trail** — every key access is logged with agent, IP, and timestamp
- **Dashboard UI** — clean, dark-themed web UI for managing everything
- **TypeScript + Python clients** — first-class support for both ecosystems
- **CLI management** — manage keys and agents from the terminal
- **No external dependencies** — no Redis, no Postgres, just Node.js
- **Self-hosted** — all data stays on your infrastructure

## Quick Start

### 1. Install globally

```bash
npm install -g agentkeys
```

### 2. Initialize the server

Run this once to set up your data directory and admin password:

```bash
agentkeys init
```

You'll be prompted to set an admin password. This encrypts your vault.

### 3. Start the server

```bash
agentkeys serve
```

The server starts on port 8888 by default. Open http://localhost:8888 to access the dashboard and log in with your admin password.

To use a custom port or bind to a specific host:

```bash
agentkeys serve --port 9000 --host 0.0.0.0
```

### Add a key and create an agent

```bash
# Store an API key
agentkeys key add openai --value "sk-your-key"

# Create an agent with access to that key
agentkeys agent create my-bot --scopes openai
# → Token: agt_7f8a9b2c... (save this!)
```

### Use in your code

```typescript
import { AgentKeys } from "@agentkeys/client";

const agent = new AgentKeys({
  server: "http://localhost:8888",
  token: "agt_7f8a9b2c...",
});

// Get a key (cached + auto-expires)
const openaiKey = await agent.get("openai", { ttl: 3600 });

// Or use with auto-cleanup
await agent.withKey("openai", async (key) => {
  const client = new OpenAI({ apiKey: key });
  // ...
});
```

### Python

```python
from agentkeys import AgentKeys

agent = AgentKeys(server="http://localhost:8888", token="agt_...")

with agent.key("openai") as key:
    # use key
    pass
```

## Architecture

```
┌──────────────┐     ┌──────────────────────────┐
│   AI Agent   │────>│     AgentKeys Server     │
│  (SDK/HTTP)  │<────│                          │
└──────────────┘     │  ┌────────────────────┐  │
                     │  │   Policy Engine    │  │
                     │  │  scopes · ttl ·    │  │
                     │  │  budgets · audit   │  │
                     │  └────────┬───────────┘  │
                     │           │              │
                     │  ┌────────▼───────────┐  │
                     │  │  Encrypted Vault   │  │
                     │  │  AES-256-GCM +     │  │
                     │  │  Argon2id master   │  │
                     │  └────────────────────┘  │
                     │                          │
                     │  ┌────────────────────┐  │
                     │  │   SQLite + Drizzle │  │
                     │  │   (embedded, WAL)  │  │
                     │  └────────────────────┘  │
                     └──────────────────────────┘
```

## Agent Key Request Flow

```
1. Agent sends: POST /api/v1/keys/openai (with Bearer token)
2. Server validates agent token
3. Checks agent is active
4. Checks "openai" is in agent's allowed scopes
5. Checks daily budget hasn't been exceeded
6. Decrypts the stored key from vault
7. Records in audit log
8. Returns the key with TTL metadata
```

## SDK Examples

### With OpenAI

```typescript
await agent.withKey("openai", async (key) => {
  const openai = new OpenAI({ apiKey: key });
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "Hello!" }],
  });
});
```

### With Vercel AI SDK

```typescript
await agent.withKey("openai", async (key) => {
  const openai = createOpenAI({ apiKey: key });
  const { text } = await generateText({
    model: openai("gpt-4"),
    prompt: "Hello!",
  });
});
```

### With LangChain (Python)

```python
with agent.key("openai") as key:
    llm = ChatOpenAI(model="gpt-4", api_key=key)
    response = llm.invoke([HumanMessage(content="Hello!")])
```

## CLI Reference

```bash
# Setup
agentkeys init                              # First-time setup
agentkeys serve [--port 8888] [--host 0.0.0.0]  # Start server

# Keys
agentkeys key add <name> --value <value>    # Store a key
agentkeys key add <name> --from-env VAR     # Store from env var
agentkeys key list                          # List stored keys
agentkeys key remove <name>                 # Delete a key

# Agents
agentkeys agent create <name> --scopes a,b  # Create agent (shows token once)
agentkeys agent list                        # List agents
agentkeys agent revoke <name>               # Revoke agent access
agentkeys agent update <name> --scopes a,b  # Update scopes
```

## Security

- **Encryption:** AES-256-GCM with unique nonce per key
- **Key derivation:** Argon2id (64MB memory, 3 iterations)
- **Token storage:** bcrypt hashes (12 rounds)
- **Admin auth:** JWT with 1-hour expiry, httpOnly cookies
- **Rate limiting:** 10 login attempts per minute
- **No key leakage:** values never appear in logs or audit trail
- **Self-hosted:** no data leaves your infrastructure

See [docs/security.md](docs/security.md) for full details.

## Self-Hosting

| Method | Command |
|---|---|
| npm (recommended) | `npm i -g agentkeys && agentkeys serve` |
| Docker | `docker run -d -p 8888:8888 -v agentkeys-data:/data -e AGENTKEYS_ADMIN_PASSWORD=yourpassword ghcr.io/puneethgowda/agentkeys:latest` |
| Docker Compose | `docker compose up -d` |

See [docs/self-hosting.md](docs/self-hosting.md) for production deployment guides.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Backend:** Hono
- **Database:** SQLite (better-sqlite3) + Drizzle ORM
- **Encryption:** AES-256-GCM + Argon2id
- **Auth:** JWT (jose) + bcrypt
- **Dashboard:** React + Tailwind + Vite
- **CLI:** Commander.js + chalk

## Contributing

```bash
# Clone the repo
git clone https://github.com/puneethgowda/agentkeys.git
cd agentkeys

# Install dependencies
pnpm install

# Initialize for development
cd packages/server && npx tsx src/index.ts init

# Start dev server
pnpm dev
```

## License

MIT

---

<div align="center">

If this is useful, give it a star.

**[GitHub](https://github.com/puneethgowda/agentkeys)**

</div>
