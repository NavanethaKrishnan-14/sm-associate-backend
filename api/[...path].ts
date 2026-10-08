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
  const path = String(value ?? "").split("?")[0];
  if (path.startsWith("/api/api/v1")) {
    return path.replace("/api/api/v1", "/api/v1");
  }
  if (path.startsWith("/api/v1/api/v1")) {
    return path.replace("/api/v1/api/v1", "/api/v1");
  }
  return path;
}

function isPath(req: VercelRequest, expected: string): boolean {
  return normalizePath(req.url) === expected;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Health endpoints must be dependency-free so Vercel can always verify the function.
  if (isPath(req, "/api/v1/health")) {
    return res.status(200).json({
      success: true,
      message: "SM Associate API is running.",
      status: "healthy",
      version: "v1",
      environment: process.env.NODE_ENV || "production"
    });
  }

  if (isPath(req, "/api/v1/health/db")) {
    try {
      const { connectDatabase } = await import("../src/config/db");
      await connectDatabase();

      return res.status(200).json({
        success: true,
        database: "connected",
        postgresConfigured: Boolean(process.env.DATABASE_URL),
        jwtConfigured: Boolean(process.env.JWT_SECRET),
        adminConfigured: Boolean(
          process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD
        )
      });
    } catch (error: any) {
      console.error("Database health check failed:", error);

      return res.status(503).json({
        success: false,
        database: "disconnected",
        postgresConfigured: Boolean(process.env.DATABASE_URL),
        jwtConfigured: Boolean(process.env.JWT_SECRET),
        adminConfigured: Boolean(
          process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD
        ),
        message: error?.message || "PostgreSQL connection failed."
      });
    }
  }

  try {
    if (!initialized) {
      initialized = initialize();
    }

    await initialized;

    req.url = normalizePath(req.url);
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel API initialization failed:", error);
    initialized = null;

    return res.status(503).json({
      success: false,
      message: error?.message || "Backend initialization failed.",
      code: "BACKEND_INITIALIZATION_FAILED"
    });
  }
}
