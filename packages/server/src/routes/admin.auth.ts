import { Hono } from "hono";
import { z } from "zod";
import { SignJWT } from "jose";
import { setCookie } from "hono/cookie";
import { verifyAdminPassword, hashAdminPassword } from "../vault/master-key.js";
import { getJwtSecret } from "../middleware/auth.js";
import { adminAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

const adminAuthRoutes = new Hono();

adminAuthRoutes.post(
  "/admin/login",
  rateLimit(10, 60_000),
  async (c) => {
    const body = await c.req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.errors[0].message }, 400);
    }

    const dataDir = c.get("dataDir" as never) as string;
    const configPath = join(dataDir, "config.json");

    if (!existsSync(configPath)) {
      return c.json({ error: "Server not initialized. Run 'agentkeys init' first." }, 500);
    }

    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    const isValid = await verifyAdminPassword(
      config.adminPasswordHash,
      parsed.data.password
    );

    if (!isValid) {
      return c.json({ error: "Invalid password" }, 401);
    }

    const token = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(getJwtSecret());

    setCookie(c, "agentkeys_token", token, {
      httpOnly: true,
      sameSite: "Strict",
      maxAge: 3600,
      path: "/",
    });

    return c.json({ token, expires_in: 3600 });
  }
);

adminAuthRoutes.post(
  "/admin/change-password",
  adminAuth,
  async (c) => {
    const body = await c.req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.errors[0].message }, 400);
    }

    const dataDir = c.get("dataDir" as never) as string;
    const configPath = join(dataDir, "config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));

    const isValid = await verifyAdminPassword(
      config.adminPasswordHash,
      parsed.data.currentPassword
    );

    if (!isValid) {
      return c.json({ error: "Current password is incorrect" }, 401);
    }

    const newHash = await hashAdminPassword(parsed.data.newPassword);
    config.adminPasswordHash = newHash;
    writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });

    return c.json({ message: "Password changed successfully" });
  }
);

export default adminAuthRoutes;
