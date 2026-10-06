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

  if(!buffer?.length){
    throw new Error("The selected document is empty.");
  }

  const original=String(originalName||"document");
  const extension=(original.match(/\.[^.]+$/)?.[0]||"").toLowerCase();
  const base=safeSegment(publicIdBase);
  const publicId=`${folder}/${base}-${Date.now()}`;

  return new Promise((resolve,reject)=>{
    const stream=cloudinary.uploader.upload_stream(
      {
        resource_type:"auto",
        public_id:publicId,
        use_filename:false,
        unique_filename:false,
        overwrite:false
      },
      (error,result)=>{
        if(error){
          const message=error instanceof Error?error.message:String(error);
          return reject(new Error(`Cloudinary upload failed for ${extension||"document"}: ${message}`));
        }
        if(!result)return reject(new Error("Cloudinary upload completed without a result."));
        resolve(result);
      }
    );

    stream.on("error",error=>reject(error));
    stream.end(buffer);
  });
}

export async function deleteCloudinaryAsset(publicId?:string,resourceType?:string){
  if(!publicId)return;

  // Old-file cleanup must never turn a successful new upload into a failed save.
  try{
    assertCloudinaryConfigured();
  }catch{
    console.warn("Skipping Cloudinary cleanup because Cloudinary is not configured.");
    return;
  }

  try{
    await cloudinary.uploader.destroy(publicId,{
      resource_type:(resourceType||"image") as "image"|"video"|"raw",
      invalidate:true
    });
  }catch(error){
    console.error("Unable to remove Cloudinary asset:",error);
  }
}
