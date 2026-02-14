import { createMiddleware } from "hono/factory";

export const requestLogger = createMiddleware(async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  const color =
    status >= 500 ? "\x1b[31m" : // red
    status >= 400 ? "\x1b[33m" : // yellow
    status >= 300 ? "\x1b[36m" : // cyan
    "\x1b[32m"; // green

  const reset = "\x1b[0m";

  console.log(
    `${color}${method}${reset} ${path} ${color}${status}${reset} ${duration}ms`
  );
});
