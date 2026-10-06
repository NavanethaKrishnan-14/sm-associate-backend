import { UploadApiResponse } from "cloudinary";
import { cloudinary, assertCloudinaryConfigured } from "../config/cloudinary";

function safeSegment(value:string){
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g,"-")
    .replace(/-+/g,"-")
    .slice(0,80)||"document";
}

export async function uploadBufferToCloudinary(
  buffer:Buffer,
  originalName:string,
  folder:string,
  publicIdBase:string
):Promise<UploadApiResponse>{
  assertCloudinaryConfigured();

  const extension=originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf(".")+1).toLowerCase()
    : "";

  const publicId=`${folder}/${safeSegment(publicIdBase)}-${Date.now()}`;

  return new Promise((resolve,reject)=>{
    const stream=cloudinary.uploader.upload_stream(
      {
        resource_type:"auto",
        public_id:publicId,
        use_filename:false,
        unique_filename:false,
        ...(extension ? {format:extension} : {})
      },
      (error,result)=>{
        if(error)return reject(error);
        if(!result)return reject(new Error("Cloudinary upload completed without a result."));
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

export async function deleteCloudinaryAsset(publicId?:string,resourceType?:string){
  if(!publicId)return;
  assertCloudinaryConfigured();

  try{
    await cloudinary.uploader.destroy(publicId,{
      resource_type:(resourceType||"image") as "image"|"video"|"raw",
      invalidate:true
    });
  }catch(error){
    console.error("Unable to remove Cloudinary asset:",error);
  }
}
