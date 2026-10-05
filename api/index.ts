import app from "../src/app";
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
    return app(req, res);
  } catch (error) {
    console.error("Vercel API initialization failed:", error);
    initialization = null;

    return res.status(500).json({
      success: false,
      message: "Backend initialization failed. Check MONGODB_URI, JWT_SECRET and Vercel environment variables."
    });
  }
}
