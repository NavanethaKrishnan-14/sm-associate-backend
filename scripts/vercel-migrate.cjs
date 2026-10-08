const { spawnSync } = require("node:child_process");

function getMigrationDatabaseUrl() {
  const raw = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!raw) {
    throw new Error(
      "DATABASE_URL (or DIRECT_URL) is required for Prisma migrations. Configure the Vercel production database connection."
    );
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL is not a valid PostgreSQL connection URL.");
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
