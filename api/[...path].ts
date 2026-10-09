import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/app";
let initialized: Promise<void> | null = null;
async function initialize() {
  const { connectDatabase } = await import("../src/config/db");
  const { bootstrapAdmin } = await import("../src/utils/bootstrapAdmin");
  await connectDatabase(); await bootstrapAdmin();
}
function normalizePath(value:unknown):string {
  const raw=String(value??"").split("?")[0]; const path=raw.startsWith("/")?raw:`/${raw}`;
  if(path==="/api")return "/";
  if(path.startsWith("/api/api/"))return path.slice(4);
  if(path.startsWith("/api/v1/api/v1/"))return path.replace("/api/v1/api/v1/","/api/v1/");
  return path;
}
function isPath(req:VercelRequest,expected:string){return normalizePath(req.url)===expected;}
export default async function handler(req:VercelRequest,res:VercelResponse) {
  if(isPath(req,"/api/v1/health"))return res.status(200).json({success:true,message:"SM Associate API is running.",status:"healthy",version:"v1",environment:process.env.NODE_ENV||"production"});
  try { if(!initialized)initialized=initialize(); await initialized; req.url=normalizePath(req.url); return app(req,res); }
  catch(error:any) { console.error("Vercel API initialization failed:",error); initialized=null; return res.status(503).json({success:false,message:"Backend initialization failed.",code:"BACKEND_INITIALIZATION_FAILED"}); }
}
