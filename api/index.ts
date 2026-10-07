import { connectDatabase } from "../src/config/db";
import { bootstrapAdmin } from "../src/utils/bootstrapAdmin";

let initialization: Promise<void> | null = null;

async function initialize() {
  await connectDatabase();
  await bootstrapAdmin();
}

export default async function handler(req: any, res: any) {
  const rawUrl = String(req?.url || req?.originalUrl || "").split("?")[0];
  const path = rawUrl.startsWith("/api/v1/api/v1")
    ? rawUrl.replace("/api/v1/api/v1", "/api/v1")
    : rawUrl;

  // Public deployment/health checks. These must never require a JWT.
  if (path === "/api/v1" || path === "/api/v1/health") {
    return res.status(200).json({
      success: true,
      message: "SM Associate API is running successfully on Vercel.",
      status: "healthy",
      version: "v1",
      environment: process.env.NODE_ENV || "production",
      mongodbConfigured: Boolean(process.env.MONGODB_URI),
      jwtConfigured: Boolean(process.env.JWT_SECRET),
      cloudinaryConfigured: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      )
    });
  }

  try {
    if (!initialization) {
      initialization = initialize();
    }
    await initialization;

    // Normalize only the accidental duplicate-prefix case.
    if (typeof req.url === "string" && req.url.startsWith("/api/v1/api/v1")) {
      req.url = req.url.replace("/api/v1/api/v1", "/api/v1");
    }

    // Authentication is intentionally handled by Express for every route
    // except POST /api/v1/auth/login.
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
