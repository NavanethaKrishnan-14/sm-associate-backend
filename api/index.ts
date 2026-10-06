import { connectDatabase } from "../src/config/db";
import { bootstrapAdmin } from "../src/utils/bootstrapAdmin";

let initialization: Promise<void> | null = null;

function isPath(req: any, expected: string) {
  const values = [req?.url, req?.originalUrl, req?.path]
    .filter(Boolean)
    .map(String);
  return values.some((value) => value === expected || value.startsWith(expected + "?"));
}

async function initialize() {
  await connectDatabase();
  await bootstrapAdmin();
}

export default async function handler(req: any, res: any) {
  // Keep health checks independent from Express imports and application startup.
  if (isPath(req, "/api/v1/health")) {
    return res.status(200).json({
      success: true,
      message: "SM Associate API is running.",
      environment: process.env.NODE_ENV ?? "production",
      mongodbConfigured: Boolean(process.env.MONGODB_URI),
      jwtConfigured: Boolean(process.env.JWT_SECRET),
      cloudinaryConfigured: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      )
    });
  }

  if (isPath(req, "/api/v1/health/db")) {
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

    // Load the Express application only after the database is ready.
    const { default: app } = await import("../src/app");
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel API initialization failed:", error);
    initialization = null;

    return res.status(503).json({
      success: false,
      message:
        error?.message ||
        "Backend initialization failed. Check MongoDB Atlas and Vercel environment variables.",
      code: "BACKEND_INITIALIZATION_FAILED"
    });
  }
};
