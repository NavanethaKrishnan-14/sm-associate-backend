import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes";
import customerRoutes from "./routes/customerRoutes";
import carRoutes from "./routes/carRoutes";
import loanRoutes from "./routes/loanRoutes";
import reportRoutes from "./routes/reportRoutes";
import { requireAuth } from "./middleware/auth";

const app=express();
app.use(cors({origin:process.env.CLIENT_URL?.split(",")??true}));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/v1/health",(_req,res)=>res.json({success:true,message:"SM Associate API is running."}));
app.use("/api/v1/auth",authRoutes);

app.use(requireAuth);
app.use("/api/v1/customers",customerRoutes);
app.use("/api/v1/cars",carRoutes);
app.use("/api/v1/loans",loanRoutes);
app.use("/api/v1/reports",reportRoutes);

app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  console.error(err);
  res.status(500).json({success:false,message:"Internal server error."});
});
export default app;