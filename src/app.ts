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
import { requireAuth } from "./middleware/auth";
import { setupSwagger } from "./config/swagger";
import { prisma } from "./config/db";

const app=express();

const allowedOrigins=(process.env.CLIENT_URL||"")
  .split(",")
  .map(value=>value.trim())
  .filter(Boolean);

app.use(cors({
  origin:(origin,callback)=>{
    if(!origin||allowedOrigins.length===0||allowedOrigins.includes(origin)) return callback(null,true);
    return callback(new Error("CORS origin is not allowed."));
  }
}));

app.use(express.json({limit:"2mb"}));
app.use(morgan(process.env.NODE_ENV==="production"?"combined":"dev"));
setupSwagger(app);

app.get("/api/v1/health",(_req,res)=>res.json({
  success:true,
  message:"SM Associate API is running.",
  environment:process.env.NODE_ENV??"production"
}));

app.get("/api/v1/health/db",async(_req,res)=>{
  try{
    await prisma.$queryRaw`SELECT 1`;
    res.json({success:true,database:"connected"});
  }catch(error){
    console.error("PostgreSQL health check failed:",error);
    res.status(503).json({success:false,database:"disconnected",message:"PostgreSQL connection failed."});
  }
});

app.use("/api/v1/auth",authRoutes);
app.use(requireAuth);
app.use("/api/v1/customers",customerRoutes);
app.use("/api/v1/cars",carRoutes);
app.use("/api/v1/loans",loanRoutes);
app.use("/api/v1/reports",reportRoutes);
app.use("/api/v1/finance-services",financeServiceRoutes);
app.use("/api/v1/finance-enquiries",financeEnquiryRoutes);
app.use("/api/v1/documents",documentRoutes);

app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  console.error(err);
  if(res.headersSent) return;
  const message=err instanceof Error&&err.message==="CORS origin is not allowed."
    ? "CORS origin is not allowed."
    : "Internal server error.";
  res.status(message.startsWith("CORS")?403:500).json({success:false,message});
});

export default app;
