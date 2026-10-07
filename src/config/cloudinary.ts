import { v2 as cloudinary } from "cloudinary";

function getCloudinaryConfig(){
  return {
    cloudName:String(process.env.CLOUDINARY_CLOUD_NAME||"").trim(),
    apiKey:String(process.env.CLOUDINARY_API_KEY||"").trim(),
    apiSecret:String(process.env.CLOUDINARY_API_SECRET||"").trim()
  };
}

function configureCloudinary(){
  const {cloudName,apiKey,apiSecret}=getCloudinaryConfig();
  if(!cloudName||!apiKey||!apiSecret) return false;

  cloudinary.config({
    cloud_name:cloudName,
    api_key:apiKey,
    api_secret:apiSecret,
    secure:true
  });
  return true;
}

export function assertCloudinaryConfigured(){
  if(!configureCloudinary()){
    throw new Error("Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to the deployment environment.");
  }
}

export { cloudinary };
