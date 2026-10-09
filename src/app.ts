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
const allowedOrigins = (process.env.CLIENT_URL ?? "").split(",").map(v => v.trim()).filter(Boolean);
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(null, false);
}, credentials: false }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(morgan("dev"));

app.get("/", (_req, res) => res.json({ success:true, message:"SM Associate API is running.", version:"v1" }));
app.get("/api/v1/health", (_req, res) => res.json({ success:true, message:"SM Associate API is running.", status:"healthy", version:"v1" }));
app.get("/api/v1", (_req, res) => res.json({ success:true, message:"SM Associate API is running.", version:"v1" }));
app.get("/api/v1/health/db", async (_req, res, next) => {
  try { const { connectDatabase, prisma } = await import("./config/db"); await connectDatabase(); await prisma.$queryRaw`SELECT 1`;
    return res.json({ success:true, database:"connected", postgresConfigured:Boolean(process.env.DATABASE_URL) });
  } catch (error) { return next(error); }
});

app.use("/api/v1/auth", authRoutes);
setupSwagger(app);

// Authenticate known business API namespaces, but let unknown paths reach the JSON 404 handler.
app.use((req, res, next) => {
  const protectedPrefixes = ["/api/v1/customers", "/api/v1/cars", "/api/v1/loans", "/api/v1/reports", "/api/v1/finance-services", "/api/v1/finance-enquiries", "/api/v1/documents", "/api/v1/dashboard/notes"];
  if (protectedPrefixes.some(prefix => req.path === prefix || req.path.startsWith(prefix + "/"))) return requireAuth(req, res, next);
  return next();
});
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/cars", carRoutes);
app.use("/api/v1/loans", loanRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/finance-services", financeServiceRoutes);
app.use("/api/v1/finance-enquiries", financeEnquiryRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/dashboard/notes", dashboardNoteRoutes);

app.use((req, res) => res.status(404).json({ success:false, message:`No route matches ${req.method} ${req.originalUrl}.`, code:"ENDPOINT_NOT_FOUND" }));
app.use((err:any, req:express.Request, res:express.Response, _next:express.NextFunction) => {
  const rawStatus = Number(err?.status ?? err?.statusCode);
  const status = Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus < 500 ? rawStatus : 500;
  console.error(JSON.stringify({ level:"error", method:req.method, url:req.originalUrl, status, name:err?.name||"Error", message:err?.message||"Unknown error", stack:err?.stack }));
  if (res.headersSent) return;
  if (err?.name === "MulterError") return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ success:false, message:err.code === "LIMIT_FILE_SIZE" ? "File is too large. Maximum size is 10 MB." : err.message, code:"UPLOAD_ERROR" });
  if (status < 500) return res.status(status).json({ success:false, message:err?.message||"Invalid request.", code:err?.code||"REQUEST_ERROR" });
  return res.status(500).json({ success:false, message:"Internal server error.", code:"INTERNAL_SERVER_ERROR" });
});
export default app;
