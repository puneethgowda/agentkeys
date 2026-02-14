const DEFAULT_TTL = 3600; // 1 hour
const MAX_TTL = 86400; // 24 hours

export function resolveTtl(
  requestedTtl: number | undefined,
  agentMaxTtl: number | null
): number {
  const maxAllowed = agentMaxTtl ?? MAX_TTL;
  const requested = requestedTtl ?? DEFAULT_TTL;

  return Math.min(requested, maxAllowed, MAX_TTL);
}

export function getExpiresAt(ttlSeconds: number): string {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}
