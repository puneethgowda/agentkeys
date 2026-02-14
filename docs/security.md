# Security

## Encryption

- All stored API keys are encrypted with **AES-256-GCM**
- Each key uses a unique random nonce (12 bytes)
- The master encryption key is derived from your passphrase using **Argon2id** (memory: 64MB, iterations: 3)
- Authentication tags ensure tamper detection

## Agent Tokens

- Generated using 32 bytes of cryptographic randomness (`crypto.randomBytes`)
- Stored as **bcrypt** hashes (12 rounds) — the original token is never stored
- Prefixed with `agt_` for easy identification in logs and configs

## Admin Authentication

- Admin password hashed with Argon2id
- JWT tokens with 1-hour expiry
- HttpOnly cookies prevent XSS token theft
- Rate limiting on login: 10 attempts per minute

## Network Security

- Server binds to `127.0.0.1` by default (localhost only)
- In Docker, binds to `0.0.0.0` — use a reverse proxy with TLS in production
- All responses include security headers (X-Content-Type-Options, etc.)
- Dashboard served on same origin — no CORS issues

## Data Security

- SQLite database file permissions set to `0600`
- No key values ever appear in logs or audit trail
- Audit log tracks all access but never records the actual key
- Agent tokens shown only once at creation time

## Self-Hosted

- All data stays on your infrastructure
- No external service dependencies
- No telemetry or phone-home
- You control the encryption keys
