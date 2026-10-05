export default async function handler(_req: any, res: any) {
  try {
    const { connectDatabase } = await import("../../../src/config/db");
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
