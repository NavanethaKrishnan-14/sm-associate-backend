import app from "../../src/app";
import { connectDatabase } from "../../src/config/db";
import { bootstrapAdmin } from "../../src/utils/bootstrapAdmin";
import mongoose from "mongoose";

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

export default async function handler(req: any, res: any) {
  const path = requestPath(req);

  // Routing health check: never depends on MongoDB.
  if (path === "/api/v1/health" || path.startsWith("/api/v1/health?")) {
    return res.status(200).json({
      success: true,
      message: "SM Associate API is running.",
      environment: process.env.NODE_ENV ?? "production"
    });
  }

  // Deployment diagnostics without exposing secrets.
  if (path === "/api/v1/health/db" || path.startsWith("/api/v1/health/db?")) {
    try {
      await connectDatabase();
      return res.status(200).json({
        success: true,
        database: "connected",
        mongodbConfigured: Boolean(process.env.MONGODB_URI),
        jwtConfigured: Boolean(process.env.JWT_SECRET),
        adminConfigured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)
      });
    } catch (error: any) {
      console.error("Database health check failed:", error);
      return res.status(503).json({
        success: false,
        database: "disconnected",
        mongodbConfigured: Boolean(process.env.MONGODB_URI),
        jwtConfigured: Boolean(process.env.JWT_SECRET),
        adminConfigured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD),
        message: error?.message || "MongoDB connection failed."
      });
    }
  }

  try {
    if (!initialization) initialization = initialize();
    await initialization;
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel API initialization failed:", error);
    initialization = null;

    return res.status(503).json({
      success: false,
      message: error?.message || "Backend initialization failed.",
      hint: "Check the Vercel Environment Variables and MongoDB Atlas network access."
    });
  }
}
