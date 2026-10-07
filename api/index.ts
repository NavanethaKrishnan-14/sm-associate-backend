import { connectDatabase } from "../src/config/db";
import { bootstrapAdmin } from "../src/utils/bootstrapAdmin";

let initialization: Promise<void> | null = null;

async function initialize() {
  await connectDatabase();
  await bootstrapAdmin();
}

export default async function handler(req: any, res: any) {
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
