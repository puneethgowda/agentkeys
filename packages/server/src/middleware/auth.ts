import { createMiddleware } from "hono/factory";
import { jwtVerify } from "jose";
import { getCookie } from "hono/cookie";

let jwtSecret: Uint8Array;

export function setJwtSecret(secret: Uint8Array) {
  jwtSecret = secret;
}

export function getJwtSecret(): Uint8Array {
  return jwtSecret;
}

export const adminAuth = createMiddleware(async (c, next) => {
  // Check Authorization header first, then cookie
  const authHeader = c.req.header("Authorization");
  let token: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    token = getCookie(c, "agentkeys_token");
  }

  if (!token) {
    return c.json({ error: "Authentication required" }, 401);
  }

  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    if (payload.role !== "admin") {
      return c.json({ error: "Admin access required" }, 403);
    }
    c.set("admin" as never, true as never);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});
