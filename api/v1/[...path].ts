import app from "../../src/app";
import { connectDatabase } from "../../src/config/db";
import { bootstrapAdmin } from "../../src/utils/bootstrapAdmin";

let initialization: Promise<void> | null = null;

async function initialize() {
  await connectDatabase();
  await bootstrapAdmin();
}

function isHealthRequest(req: any) {
  const candidates = [
    req?.url,
    req?.originalUrl,
    req?.path,
    req?.query?.path
  ].filter(Boolean).map(String);

  return candidates.some((value) =>
    value === "/api/v1/health" ||
    value.startsWith("/api/v1/health?")
  );
}

export default async function handler(req: any, res: any) {
  // Keep the basic health endpoint independent from MongoDB.
  // Database readiness is checked by /api/v1/health/db.
  if (isHealthRequest(req)) {
    return res.status(200).json({
      success: true,
      message: "SM Associate API is running.",
      environment: process.env.NODE_ENV ?? "production"
    });
  }

  try {
    if (!initialization) {
      initialization = initialize();
    }

    await initialization;
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel API initialization failed:", error);
    initialization = null;

    const message = error?.message || "Backend initialization failed.";

    return res.status(500).json({
      success: false,
      message,
      hint: "Check MONGODB_URI, JWT_SECRET, ADMIN_EMAIL and ADMIN_PASSWORD in Vercel Project Settings → Environment Variables."
    });
  }
}
