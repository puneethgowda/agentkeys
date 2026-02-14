# Getting Started

## Quick Start (Docker)

```bash
docker run -d \
  -p 8888:8888 \
  -v agentkeys-data:/data \
  -e AGENTKEYS_ADMIN_PASSWORD=your-password \
  agentkeys/server
```

Open http://localhost:8888 to access the dashboard.

## Quick Start (npm)

```bash
# Install and initialize
npx agentkeys init
npx agentkeys serve
```

## Add Your First Key

```bash
npx agentkeys key add openai --value "sk-your-key-here"
```

Or use the dashboard at http://localhost:8888.

## Create an Agent

```bash
npx agentkeys agent create my-bot --scopes openai
# Output: Token: agt_7f8a9b2c... (save this!)
```

## Use in Your Code

```typescript
import { AgentKeys } from "agentkeys";

const agent = new AgentKeys({
  server: "http://localhost:8888",
  token: "agt_7f8a9b2c...",
});

const key = await agent.get("openai");
```

## Next Steps

- [Security](./security.md) — encryption details
- [Self-Hosting](./self-hosting.md) — deployment options
- [SDK Reference](./sdk-reference.md) — full API docs
