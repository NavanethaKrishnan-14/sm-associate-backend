import { connectDatabase } from "../../src/config/db";
import { bootstrapAdmin } from "../../src/utils/bootstrapAdmin";

let initialization: Promise<void> | null = null;

async function initialize() {
  await connectDatabase();
  await bootstrapAdmin();
}

function requestPath(req: any) {
  const values = [req?.url, req?.originalUrl, req?.path]
    .filter(Boolean)
    .map(String);
  return values.find((value) => value.includes("/api/v1/")) ?? values[0] ?? "";
}

function isPath(path: string, expected: string) {
  return path === expected || path.startsWith(expected + "?");
}

export default async function handler(req: any, res: any) {
  const path = requestPath(req);

  // Keep the basic health endpoint completely independent of application
  // imports and MongoDB so Vercel can verify the function itself.
  if (isPath(path, "/api/v1/health")) {
    return res.status(200).json({
      success: true,
      message: "SM Associate API is running.",
      environment: process.env.NODE_ENV ?? "production"
    });
  }

  // Database diagnostics intentionally remain separate from the basic
  // health check and never expose credentials.
  if (isPath(path, "/api/v1/health/db")) {
    try {
      await connectDatabase();
      return res.status(200).json({
        success: true,
        database: "connected",
        mongodbConfigured: Boolean(process.env.MONGODB_URI),
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
        mongodbConfigured: Boolean(process.env.MONGODB_URI),
        jwtConfigured: Boolean(process.env.JWT_SECRET),
        adminConfigured: Boolean(
          process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD
        ),
        message: error?.message || "MongoDB connection failed."
      });
    }
  }

  try {
    if (!initialization) {
      initialization = initialize();
    }

    await initialization;

    // Lazy-load Express only after the serverless function has passed
    // initialization. This prevents unrelated application imports from
    // crashing the basic health endpoint.
    const { default: app } = await import("../../src/app");
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel API initialization failed:", error);
    initialization = null;

    return res.status(503).json({
      success: false,
      message: error?.message || "Backend initialization failed.",
      hint: "Check Vercel environment variables and MongoDB Atlas network access."
    });
  }
}
