import app from "../../src/app";
import { connectDatabase } from "../../src/config/db";
import { bootstrapAdmin } from "../../src/utils/bootstrapAdmin";
let initialization:Promise<void>|null=null;
function requestPath(req:any){const values=[req?.url,req?.originalUrl,req?.path].filter(Boolean).map(String);return values.find((v:string)=>v.includes("/api/v1/"))??values[0]??"";}
async function initialize(){await connectDatabase();await bootstrapAdmin();}
export default async function handler(req:any,res:any){
 const p=requestPath(req);
 if(p==="/api/v1/health"||p.startsWith("/api/v1/health?"))return res.status(200).json({success:true,message:"SM Associate API is running.",environment:process.env.NODE_ENV??"production"});
 if(p==="/api/v1/health/db"||p.startsWith("/api/v1/health/db?")){try{await connectDatabase();return res.status(200).json({success:true,database:"connected"});}catch(error){console.error("Database health check failed:",error);return res.status(503).json({success:false,database:"disconnected",message:"PostgreSQL connection failed."});}}
 try{if(!initialization)initialization=initialize();await initialization;return app(req,res);}catch(error){console.error("Vercel API initialization failed:",error);initialization=null;return res.status(503).json({success:false,message:"Backend initialization failed. Check DATABASE_URL and server environment variables."});}
}