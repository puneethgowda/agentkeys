import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { serve } from "@hono/node-server";
import { initDb } from "./db/connection.js";
import { runMigrations } from "./db/migrate.js";
import { deriveMasterKey, hashAdminPassword, verifyAdminPassword } from "./vault/master-key.js";
import { encrypt } from "./vault/encrypt.js";
import { generateAgentToken, hashToken } from "./vault/tokens.js";
import { setJwtSecret } from "./middleware/auth.js";
import { createApp } from "./server.js";
import { nanoid } from "nanoid";
import { getDb } from "./db/connection.js";
import { keys, agents } from "./db/schema.js";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function promptPassword(question: string): Promise<string> {
  // Simple password prompt
  const answer = await prompt(question);
  return answer;
}

export function createCli() {
  const program = new Command();

  program
    .name("agentkeys")
    .description("Self-hosted API key manager for AI agents")
    .version("0.1.0");

  // ─── init ──────────────────────────────────────────
  program
    .command("init")
    .description("Initialize AgentKeys (first-time setup)")
    .option("-d, --data <dir>", "Data directory", "./agentkeys-data")
    .action(async (opts) => {
      const dataDir = resolve(opts.data);
      console.log(chalk.blue("\n  AgentKeys Setup\n"));

      if (existsSync(join(dataDir, "config.json"))) {
        console.log(chalk.yellow("  Already initialized at:"), dataDir);
        console.log(chalk.gray("  To reinitialize, delete the data directory first.\n"));
        return;
      }

      // Get admin password
      const password = process.env.AGENTKEYS_ADMIN_PASSWORD ?? await promptPassword("  Admin password: ");
      if (!password || password.length < 4) {
        console.log(chalk.red("  Password must be at least 4 characters.\n"));
        process.exit(1);
      }

      const spinner = ora("Setting up AgentKeys...").start();

      // Create data directory
      mkdirSync(dataDir, { recursive: true });

      // Derive master key
      spinner.text = "Deriving master encryption key (Argon2id)...";
      const masterKeyPassphrase = process.env.AGENTKEYS_MASTER_KEY ?? randomBytes(32).toString("hex");
      const masterKey = await deriveMasterKey(masterKeyPassphrase, dataDir);

      // Hash admin password
      spinner.text = "Hashing admin password...";
      const adminPasswordHash = await hashAdminPassword(password);

      // Generate JWT secret
      const jwtSecret = randomBytes(32).toString("hex");

      // Save config
      const config = {
        adminPasswordHash,
        jwtSecret,
        masterKeyPassphrase: process.env.AGENTKEYS_MASTER_KEY ? undefined : masterKeyPassphrase,
        version: "0.1.0",
        createdAt: new Date().toISOString(),
      };
      writeFileSync(join(dataDir, "config.json"), JSON.stringify(config, null, 2), { mode: 0o600 });

      // Initialize database
      spinner.text = "Creating database...";
      initDb(join(dataDir, "agentkeys.db"));
      runMigrations();

      spinner.succeed("AgentKeys initialized!");

      console.log();
      console.log(chalk.green("  Data directory:"), dataDir);
      if (!process.env.AGENTKEYS_MASTER_KEY) {
        console.log(chalk.yellow("  Master key:"), masterKeyPassphrase);
        console.log(chalk.gray("  Save this master key! You'll need it to decrypt your data."));
      }
      console.log();
      console.log(chalk.blue("  Next steps:"));
      console.log(chalk.gray("  1."), `agentkeys serve --data ${opts.data}`);
      console.log(chalk.gray("  2."), "Open http://localhost:8888 in your browser");
      console.log(chalk.gray("  3."), "Add your first API key and create an agent");
      console.log();
    });

  // ─── serve ─────────────────────────────────────────
  program
    .command("serve")
    .description("Start the AgentKeys server")
    .option("-p, --port <port>", "Port", "8888")
    .option("-d, --data <dir>", "Data directory", "./agentkeys-data")
    .option("-H, --host <host>", "Host to bind to", "127.0.0.1")
    .action(async (opts) => {
      const dataDir = resolve(opts.data);
      const port = parseInt(opts.port);
      const host = process.env.AGENTKEYS_HOST ?? opts.host;

      const configPath = join(dataDir, "config.json");
      if (!existsSync(configPath)) {
        console.log(chalk.red("\n  Not initialized. Run: agentkeys init --data " + opts.data + "\n"));
        process.exit(1);
      }

      const config = JSON.parse(readFileSync(configPath, "utf-8"));

      // Derive master key
      const masterKeyPassphrase = process.env.AGENTKEYS_MASTER_KEY ?? config.masterKeyPassphrase;
      if (!masterKeyPassphrase) {
        console.log(chalk.red("\n  Master key not found. Set AGENTKEYS_MASTER_KEY environment variable.\n"));
        process.exit(1);
      }

      const masterKey = await deriveMasterKey(masterKeyPassphrase, dataDir);

      // Set JWT secret
      const jwtSecret = new TextEncoder().encode(config.jwtSecret);
      setJwtSecret(jwtSecret);

      // Initialize database
      initDb(join(dataDir, "agentkeys.db"));
      runMigrations();

      // Create and start app
      const app = createApp({ masterKey, dataDir });

      console.log(chalk.blue("\n  AgentKeys Server\n"));
      console.log(chalk.gray("  Port:"), chalk.white(String(port)));
      console.log(chalk.gray("  Host:"), chalk.white(host));
      console.log(chalk.gray("  Data:"), chalk.white(dataDir));
      console.log(chalk.gray("  Dashboard:"), chalk.white(`http://${host === "0.0.0.0" ? "localhost" : host}:${port}`));
      console.log();

      serve({
        fetch: app.fetch,
        port,
        hostname: host,
      });
    });

  // ─── key add ───────────────────────────────────────
  program
    .command("key")
    .description("Manage API keys")
    .addCommand(
      new Command("add")
        .description("Store a new API key")
        .argument("<name>", "Key name (e.g., openai, gmail)")
        .option("-v, --value <value>", "Key value")
        .option("--from-env <var>", "Read value from environment variable")
        .option("-p, --provider <provider>", "Provider name")
        .option("-d, --data <dir>", "Data directory", "./agentkeys-data")
        .action(async (name, opts) => {
          const dataDir = resolve(opts.data);
          const value = opts.value ?? (opts.fromEnv ? process.env[opts.fromEnv] : null);

          if (!value) {
            console.log(chalk.red("\n  Provide --value or --from-env\n"));
            process.exit(1);
          }

          await ensureDb(dataDir);
          const masterKey = await getMasterKey(dataDir);
          const db = getDb();

          const existing = db.select().from(keys).where(eq(keys.name, name)).get();
          if (existing) {
            console.log(chalk.red(`\n  Key "${name}" already exists. Use a different name.\n`));
            process.exit(1);
          }

          const { encrypted, nonce } = encrypt(value, masterKey);
          db.insert(keys).values({
            id: nanoid(),
            name,
            provider: opts.provider ?? null,
            encryptedValue: encrypted,
            nonce,
          }).run();

          console.log(chalk.green(`\n  Key "${name}" stored successfully.\n`));
        })
    )
    .addCommand(
      new Command("list")
        .description("List all stored keys")
        .option("-d, --data <dir>", "Data directory", "./agentkeys-data")
        .action(async (opts) => {
          const dataDir = resolve(opts.data);
          await ensureDb(dataDir);

          const db = getDb();
          const allKeys = db.select({ name: keys.name, provider: keys.provider, createdAt: keys.createdAt }).from(keys).all();

          if (allKeys.length === 0) {
            console.log(chalk.gray("\n  No keys stored yet.\n"));
            return;
          }

          console.log(chalk.blue("\n  Stored Keys:\n"));
          for (const k of allKeys) {
            console.log(`  ${chalk.white(k.name)}${k.provider ? chalk.gray(` (${k.provider})`) : ""} ${chalk.gray(`— ${k.createdAt}`)}`);
          }
          console.log();
        })
    )
    .addCommand(
      new Command("remove")
        .description("Remove a stored key")
        .argument("<name>", "Key name")
        .option("-d, --data <dir>", "Data directory", "./agentkeys-data")
        .action(async (name, opts) => {
          const dataDir = resolve(opts.data);
          await ensureDb(dataDir);

          const db = getDb();
          const existing = db.select().from(keys).where(eq(keys.name, name)).get();
          if (!existing) {
            console.log(chalk.red(`\n  Key "${name}" not found.\n`));
            process.exit(1);
          }

          db.delete(keys).where(eq(keys.name, name)).run();
          console.log(chalk.green(`\n  Key "${name}" removed.\n`));
        })
    );

  // ─── agent ────────────────────────────────────────
  program
    .command("agent")
    .description("Manage agents")
    .addCommand(
      new Command("create")
        .description("Create a new agent")
        .argument("<name>", "Agent name (e.g., email-bot)")
        .requiredOption("-s, --scopes <scopes>", "Comma-separated scopes (key names)")
        .option("--ttl <seconds>", "Max TTL in seconds", "3600")
        .option("--budget <limit>", "Daily request budget")
        .option("-d, --data <dir>", "Data directory", "./agentkeys-data")
        .action(async (name, opts) => {
          const dataDir = resolve(opts.data);
          await ensureDb(dataDir);

          const db = getDb();
          const existing = db.select().from(agents).where(eq(agents.name, name)).get();
          if (existing) {
            console.log(chalk.red(`\n  Agent "${name}" already exists.\n`));
            process.exit(1);
          }

          const scopes = opts.scopes.split(",").map((s: string) => s.trim());
          const token = generateAgentToken();
          const tokenHash = await hashToken(token);

          db.insert(agents).values({
            id: nanoid(),
            name,
            tokenHash,
            scopes,
            maxTtlSeconds: parseInt(opts.ttl),
            budgetLimitDaily: opts.budget ? parseInt(opts.budget) : null,
            isActive: true,
          }).run();

          console.log(chalk.green(`\n  Agent "${name}" created.\n`));
          console.log(chalk.yellow("  Token:"), token);
          console.log(chalk.gray("  Save this token — it will not be shown again.\n"));
        })
    )
    .addCommand(
      new Command("list")
        .description("List all agents")
        .option("-d, --data <dir>", "Data directory", "./agentkeys-data")
        .action(async (opts) => {
          const dataDir = resolve(opts.data);
          await ensureDb(dataDir);

          const db = getDb();
          const allAgents = db.select({
            name: agents.name,
            scopes: agents.scopes,
            isActive: agents.isActive,
            lastAccessed: agents.lastAccessed,
          }).from(agents).all();

          if (allAgents.length === 0) {
            console.log(chalk.gray("\n  No agents created yet.\n"));
            return;
          }

          console.log(chalk.blue("\n  Agents:\n"));
          for (const a of allAgents) {
            const status = a.isActive ? chalk.green("active") : chalk.red("inactive");
            const scopes = (a.scopes as string[]).join(", ");
            console.log(`  ${chalk.white(a.name)} [${status}] — scopes: ${chalk.gray(scopes)}`);
          }
          console.log();
        })
    )
    .addCommand(
      new Command("revoke")
        .description("Revoke an agent's access")
        .argument("<name>", "Agent name")
        .option("-d, --data <dir>", "Data directory", "./agentkeys-data")
        .action(async (name, opts) => {
          const dataDir = resolve(opts.data);
          await ensureDb(dataDir);

          const db = getDb();
          const existing = db.select().from(agents).where(eq(agents.name, name)).get();
          if (!existing) {
            console.log(chalk.red(`\n  Agent "${name}" not found.\n`));
            process.exit(1);
          }

          db.update(agents).set({ isActive: false }).where(eq(agents.name, name)).run();
          console.log(chalk.green(`\n  Agent "${name}" revoked.\n`));
        })
    )
    .addCommand(
      new Command("update")
        .description("Update agent scopes")
        .argument("<name>", "Agent name")
        .requiredOption("-s, --scopes <scopes>", "New comma-separated scopes")
        .option("-d, --data <dir>", "Data directory", "./agentkeys-data")
        .action(async (name, opts) => {
          const dataDir = resolve(opts.data);
          await ensureDb(dataDir);

          const db = getDb();
          const existing = db.select().from(agents).where(eq(agents.name, name)).get();
          if (!existing) {
            console.log(chalk.red(`\n  Agent "${name}" not found.\n`));
            process.exit(1);
          }

          const scopes = opts.scopes.split(",").map((s: string) => s.trim());
          db.update(agents).set({ scopes }).where(eq(agents.name, name)).run();
          console.log(chalk.green(`\n  Agent "${name}" scopes updated to: ${scopes.join(", ")}\n`));
        })
    );

  return program;
}

async function ensureDb(dataDir: string) {
  const configPath = join(dataDir, "config.json");
  if (!existsSync(configPath)) {
    console.log(chalk.red(`\n  Not initialized. Run: agentkeys init --data ${dataDir}\n`));
    process.exit(1);
  }
  initDb(join(dataDir, "agentkeys.db"));
  runMigrations();
}

async function getMasterKey(dataDir: string): Promise<Buffer> {
  const configPath = join(dataDir, "config.json");
  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  const passphrase = process.env.AGENTKEYS_MASTER_KEY ?? config.masterKeyPassphrase;
  if (!passphrase) {
    console.log(chalk.red("\n  Master key not found. Set AGENTKEYS_MASTER_KEY.\n"));
    process.exit(1);
  }
  return deriveMasterKey(passphrase, dataDir);
}
