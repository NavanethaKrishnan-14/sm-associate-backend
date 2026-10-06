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
import { assertCloudinaryConfigured } from "./config/cloudinary";

const app=express();
app.use(cors({origin:process.env.CLIENT_URL?.split(",")??true}));
app.use(express.json());
app.use(morgan("dev"));
setupSwagger(app);

app.get("/api/v1/health",(_req,res)=>{
  let cloudinaryConfigured=true;
  try{assertCloudinaryConfigured();}catch{cloudinaryConfigured=false;}
  res.json({success:true,message:"SM Associate API is running.",cloudinaryConfigured});
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

app.use((_req,res)=>{
  res.status(404).json({success:false,message:"API endpoint not found.",code:"ENDPOINT_NOT_FOUND"});
});

app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  const error=err as any;
  console.error("API error:",error);

  if(error?.name==="ValidationError"){
    const details=Object.values(error.errors||{}).map((item:any)=>item?.message).filter(Boolean);
    return res.status(400).json({success:false,message:details.length?details.join(" "):"Request validation failed.",code:"VALIDATION_ERROR"});
  }
  if(error?.name==="CastError"){
    return res.status(400).json({success:false,message:"Invalid value for "+(error.path||"request parameter")+"." ,code:"INVALID_VALUE"});
  }
  if(error?.code===11000){
    const fields=Object.keys(error.keyPattern||error.keyValue||{});
    return res.status(409).json({success:false,message:fields.length?"A record with the same "+fields.join(", ")+" already exists.":"A record with the same unique value already exists.",code:"DUPLICATE_RECORD"});
  }
  if(error?.name==="MulterError"){
    return res.status(400).json({success:false,message:error.code==="LIMIT_FILE_SIZE"?"File is too large. Maximum size is 10 MB.":error.message||"File upload failed.",code:"UPLOAD_ERROR"});
  }
  return res.status(500).json({success:false,message:"Internal server error.",code:"INTERNAL_SERVER_ERROR"});
});
export default app;