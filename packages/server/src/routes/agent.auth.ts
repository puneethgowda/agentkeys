import { Hono } from "hono";
import { agentAuth } from "../middleware/agent-auth.js";

const agentAuthRoutes = new Hono();

// Agent can verify their token is valid
agentAuthRoutes.get("/v1/whoami", agentAuth, (c) => {
  const agent = c.get("agent" as never) as { id: string; name: string; scopes: string[] };
  return c.json({
    id: agent.id,
    name: agent.name,
    scopes: agent.scopes,
  });
});

export default agentAuthRoutes;
