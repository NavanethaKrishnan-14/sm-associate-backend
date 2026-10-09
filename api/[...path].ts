import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/app";

let initialized: Promise<void> | null = null;

async function initialize() {
  const { connectDatabase } = await import("../src/config/db");
  const { bootstrapAdmin } = await import("../src/utils/bootstrapAdmin");
  await connectDatabase();
  await bootstrapAdmin();
}

function normalizePath(value: unknown): string {
  const raw = String(value ?? "").split("?")[0];
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  // Vercel may expose the serverless function's /api filesystem prefix.
  if (path === "/api") return "/";
  if (path.startsWith("/api/api/")) return path.slice(4);
  if (path.startsWith("/api/v1/api/v1/")) return path.replace("/api/v1/api/v1/", "/api/v1/");
  return path;
}

function isPath(req: VercelRequest, expected: string): boolean {
  return normalizePath(req.url) === expected;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // This health endpoint intentionally does not depend on PostgreSQL.
  if (isPath(req, "/api/v1/health")) {
    return res.status(200).json({
      success: true,
      message: "SM Associate API is running.",
      status: "healthy",
      version: "v1",
      environment: process.env.NODE_ENV || "production"
    });
  }

  // Keep the DB health check independent of admin bootstrap, so a DB check can
  // report PostgreSQL status even if admin env configuration is incomplete.
  if (isPath(req, "/api/v1/health/db")) {
    try {
      const { connectDatabase, prisma } = await import("../src/config/db");
      await connectDatabase();
      await prisma.$queryRaw`SELECT 1`;
      return res.status(200).json({
        success: true,
        database: "connected",
        postgresConfigured: Boolean(process.env.DATABASE_URL),
        jwtConfigured: Boolean(process.env.JWT_SECRET),
        adminConfigured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)
      });
    } catch (error: any) {
      console.error("Database health check failed:", error);
      return res.status(503).json({
        success: false,
        database: "disconnected",
        postgresConfigured: Boolean(process.env.DATABASE_URL),
        jwtConfigured: Boolean(process.env.JWT_SECRET),
        adminConfigured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD),
        message: "PostgreSQL connection failed."
      });
    }
  }

  try {
    if (!initialized) initialized = initialize();
    await initialized;
    req.url = normalizePath(req.url);
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel API initialization failed:", error);
    initialized = null;
    return res.status(503).json({
      success: false,
      message: "Backend initialization failed. Check Vercel function logs.",
      code: "BACKEND_INITIALIZATION_FAILED"
    });
  }
}
