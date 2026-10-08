import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes";
import customerRoutes from "./routes/customerRoutes";
import carRoutes from "./routes/carRoutes";
import loanRoutes from "./routes/loanRoutes";
import reportRoutes from "./routes/reportRoutes";
import financeServiceRoutes from "./routes/financeServiceRoutes";
import financeEnquiryRoutes from "./routes/financeEnquiryRoutes";
import documentRoutes from "./routes/documentRoutes";
import dashboardNoteRoutes from "./routes/dashboardNoteRoutes";
import { requireAuth } from "./middleware/auth";
import { setupSwagger } from "./config/swagger";

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CLIENT_URL ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: false
}));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "SM Associate API is running.",
    version: "v1"
  });
});

app.use("/api/v1/auth", authRoutes);

app.get("/api/v1/health", (_req, res) => {
  res.json({
    success: true,
    message: "SM Associate API is running.",
    status: "healthy",
    version: "v1"
  });
});

app.get("/api/v1/health/db", async (_req, res) => {
  try {
    const { connectDatabase } = await import("./config/db");
    await connectDatabase();

    return res.json({
      success: true,
      database: "connected",
      postgresConfigured: Boolean(process.env.DATABASE_URL)
    });
  } catch (error: any) {
    return res.status(503).json({
      success: false,
      database: "disconnected",
      postgresConfigured: Boolean(process.env.DATABASE_URL),
      message: error?.message || "PostgreSQL connection failed."
    });
  }
});

app.get("/api/v1", (_req, res) => {
  res.json({
    success: true,
    message: "SM Associate API is running.",
    version: "v1"
  });
});

setupSwagger(app);

app.use(requireAuth);

app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/cars", carRoutes);
app.use("/api/v1/loans", loanRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/finance-services", financeServiceRoutes);
app.use("/api/v1/finance-enquiries", financeEnquiryRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/dashboard/notes", dashboardNoteRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
    code: "ENDPOINT_NOT_FOUND"
  });
});

app.use((
  err: unknown,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) => {
  const error = err as any;
  console.error("API error:", error);

  if (error?.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? "File is too large. Maximum size is 10 MB."
          : error.message || "File upload failed.",
      code: "UPLOAD_ERROR"
    });
  }

  if (
    error instanceof Error &&
    /Unsupported document format|File upload failed|Unexpected field/i.test(
      error.message || ""
    )
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: "UPLOAD_ERROR"
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error.",
    code: "INTERNAL_SERVER_ERROR"
  });
});

export default app;
