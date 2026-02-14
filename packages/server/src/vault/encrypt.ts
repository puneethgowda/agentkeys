import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;

export function encrypt(
  plaintext: string,
  masterKey: Buffer
): { encrypted: Buffer; nonce: Buffer } {
  const nonce = randomBytes(NONCE_LENGTH);
  const cipher = createCipheriv(ALGORITHM, masterKey, nonce);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  return { encrypted, nonce };
}

export function decrypt(
  encrypted: Buffer,
  nonce: Buffer,
  masterKey: Buffer
): string {
  const tag = encrypted.subarray(encrypted.length - TAG_LENGTH);
  const ciphertext = encrypted.subarray(0, encrypted.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, masterKey, nonce);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext) + decipher.final("utf8");
}
