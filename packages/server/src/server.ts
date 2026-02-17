import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "@hono/node-server/serve-static";
import { requestLogger } from "./middleware/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIR = path.resolve(__dirname, "../dashboard");
import healthRoutes from "./routes/health.js";
import adminAuthRoutes from "./routes/admin.auth.js";
import adminKeys from "./routes/admin.keys.js";
import adminAgents from "./routes/admin.agents.js";
import adminAudit from "./routes/admin.audit.js";
import adminStats from "./routes/admin.stats.js";
import agentAuthRoutes from "./routes/agent.auth.js";
import agentKeys from "./routes/agent.keys.js";

export function createApp(config: { masterKey: Buffer; dataDir: string }) {
  const app = new Hono();

  // Global middleware
  app.use("*", secureHeaders());
  app.use("*", requestLogger);
  app.use("/api/*", cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  }));

  // Inject config into context
  app.use("*", async (c, next) => {
    c.set("masterKey" as never, config.masterKey as never);
    c.set("dataDir" as never, config.dataDir as never);
    await next();
  });

  // API routes
  app.route("/api", healthRoutes);
  app.route("/api", adminAuthRoutes);
  app.route("/api", adminKeys);
  app.route("/api", adminAgents);
  app.route("/api", adminAudit);
  app.route("/api", adminStats);
  app.route("/api", agentAuthRoutes);
  app.route("/api", agentKeys);

  // Also mount health at root /api/v1/health
  app.get("/api/v1/health", (c) => {
    return c.json({ status: "ok", version: "0.1.0" });
  });

  // Serve dashboard static files (production)
  app.use("/*", serveStatic({ root: DASHBOARD_DIR }));

  // SPA fallback — serve index.html for non-API routes
  app.get("*", (c) => {
    if (c.req.path.startsWith("/api")) {
      return c.json({ error: "Not found" }, 404);
    }
    return c.html("<!DOCTYPE html><html><body><h1>AgentKeys</h1><p>Dashboard not built. Run: pnpm build</p></body></html>");
  });

  return app;
}
