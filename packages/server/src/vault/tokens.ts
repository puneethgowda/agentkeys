import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";

const TOKEN_PREFIX = "agt_";
const BCRYPT_ROUNDS = 12;

export function generateAgentToken(): string {
  const raw = randomBytes(32).toString("hex");
  return `${TOKEN_PREFIX}${raw}`;
}

export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, BCRYPT_ROUNDS);
}

export async function verifyToken(
  token: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(token, hash);
}
