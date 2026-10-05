function requestPath(req: any) {
  const values = [req?.url, req?.originalUrl, req?.path]
    .filter(Boolean)
    .map(String);

  return values.find((value) => value.includes("/api/v1/")) ?? values[0] ?? "";
}

function isPath(path: string, expected: string) {
  return path === expected || path.startsWith(expected + "?");
}

let initialization: Promise<void> | null = null;

async function initialize() {
  const { connectDatabase } = await import("../../src/config/db");
  const { bootstrapAdmin } = await import("../../src/utils/bootstrapAdmin");

  await connectDatabase();
  await bootstrapAdmin();
}

export default async function handler(req: any, res: any) {
  const path = requestPath(req);

  // This route intentionally has NO application imports or database access.
  // It must remain available even if another backend module is broken.
  if (isPath(path, "/api/v1/health")) {
    return res.status(200).json({
      success: true,
      message: "SM Associate API is running.",
      environment: process.env.NODE_ENV ?? "production"
    });
  }

  if (isPath(path, "/api/v1/health/db")) {
    try {
      const { connectDatabase } = await import("../../src/config/db");
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
