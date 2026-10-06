import app from "../src/app";
import { connectDatabase } from "../src/config/db";

export default async function handler(req: any, res: any) {
  try {
    await connectDatabase();
    return app(req, res);
  } catch (error: any) {
    console.error("MongoDB connection failed:", error);

    return res.status(503).json({
      success: false,
      message:
        "Database temporarily unavailable. Check MongoDB Atlas Network Access and the MONGODB_URI environment variable."
    });
  }
}
