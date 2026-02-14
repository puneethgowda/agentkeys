export function checkScope(
  agentScopes: string[],
  requestedKey: string
): { allowed: boolean; reason?: string } {
  if (!agentScopes || agentScopes.length === 0) {
    return { allowed: false, reason: "Agent has no scopes configured" };
  }

  if (agentScopes.includes("*")) {
    return { allowed: true };
  }

  if (agentScopes.includes(requestedKey)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Agent does not have access to key "${requestedKey}". Allowed scopes: ${agentScopes.join(", ")}`,
  };
}
