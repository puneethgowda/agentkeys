import { createMiddleware } from "hono/factory";
import { getDb } from "../db/connection.js";
import { agents } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { verifyToken } from "../vault/tokens.js";

export const agentAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer agt_")) {
    return c.json(
      { error: "Agent authentication required. Provide a Bearer token starting with 'agt_'." },
      401
    );
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  const db = getDb();

  const activeAgents = db
    .select()
    .from(agents)
    .where(eq(agents.isActive, true))
    .all();

  let matchedAgent = null;
  for (const agent of activeAgents) {
    const isValid = await verifyToken(token, agent.tokenHash);
    if (isValid) {
      matchedAgent = agent;
      break;
    }
  }

  if (!matchedAgent) {
    return c.json({ error: "Invalid agent token" }, 401);
  }

  c.set("agent" as never, matchedAgent as never);
  await next();
});
