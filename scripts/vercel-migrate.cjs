const path = require("node:path");
const { spawnSync } = require("node:child_process");
const dotenv = require("dotenv");

// Resolve .env from the repository root, not from whichever directory invoked Node.
// Vercel environment variables still take precedence over values in .env.
const envFile = path.resolve(__dirname, "../.env");
const dotenvResult = dotenv.config({ path: envFile });
const fileEnv = dotenvResult.parsed || {};

function firstNonEmpty(values) {
  return values.find(
    (value) => typeof value === "string" && value.trim().length > 0
  );
}

function getMigrationDatabaseUrl() {
  const raw = firstNonEmpty([
    process.env.DIRECT_URL,
    process.env.DATABASE_URL,
    fileEnv.DIRECT_URL,
    fileEnv.DATABASE_URL,
  ]);

  if (!raw) {
    const envFileStatus = dotenvResult.error
      ? `could not be read (${dotenvResult.error.code || "unknown error"})`
      : "was read, but contains neither DATABASE_URL nor DIRECT_URL";
    throw new Error(
      `Prisma migrations need DATABASE_URL or DIRECT_URL. Checked the process environment and ${envFile} (${envFileStatus}). On Vercel, configure DATABASE_URL in Project Settings > Environment Variables for the deployment environment.`
    );
  }

  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error(
      "DATABASE_URL or DIRECT_URL is not a valid PostgreSQL connection URL. Check the value without printing credentials to logs."
    );
  }

  // Prisma Postgres uses a transaction pooler at pooled.db.prisma.io.
  // Prisma Migrate requires a direct session-based PostgreSQL connection.
  if (url.hostname === "pooled.db.prisma.io") {
    url.hostname = "db.prisma.io";
  }

  return url.toString();
}

const migrationUrl = getMigrationDatabaseUrl();
const env = {
  ...process.env,
  DATABASE_URL: migrationUrl,
};

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(
  command,
  ["--no-install", "prisma", "migrate", "deploy"],
  {
    stdio: "inherit",
    env,
  }
);

if (result.error) {
  console.error("Failed to start Prisma migrate deploy:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
