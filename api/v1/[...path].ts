import app from "../../src/app";
import { connectDatabase } from "../../src/config/db";
import { bootstrapAdmin } from "../../src/utils/bootstrapAdmin";

let initialization: Promise<void> | null = null;

async function initialize() {
  await connectDatabase();
  await bootstrapAdmin();
}

export default async function handler(req: any, res: any) {
  // Health must work even when MongoDB/environment initialization is unavailable.
  // This lets Vercel confirm that routing is working independently of the database.
  const requestUrl = String(req.url ?? "");
  if (requestUrl === "/api/v1/health" || requestUrl.startsWith("/api/v1/health?")) {
    return res.status(200).json({
      success: true,
      message: "SM Associate API is running."
    });
  }

  try {
    if (!initialization) initialization = initialize();
    await initialization;
    return app(req, res);
  } catch (error) {
    console.error("Vercel API initialization failed:", error);
    initialization = null;
    return res.status(500).json({
      success: false,
      message: "Backend initialization failed. Check MONGODB_URI, JWT_SECRET and admin environment variables."
    });
  }
}
