import argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SALT_FILE = "master.salt";

export async function deriveMasterKey(
  passphrase: string,
  dataDir: string
): Promise<Buffer> {
  const saltPath = join(dataDir, SALT_FILE);
  let salt: Buffer;

  if (existsSync(saltPath)) {
    salt = readFileSync(saltPath);
  } else {
    salt = randomBytes(32);
    writeFileSync(saltPath, salt, { mode: 0o600 });
  }

  const key = await argon2.hash(passphrase, {
    type: argon2.argon2id,
    salt,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
    raw: true,
  });

  return Buffer.from(key);
}

export async function hashAdminPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verifyAdminPassword(
  hash: string,
  password: string
): Promise<boolean> {
  return argon2.verify(hash, password);
}
