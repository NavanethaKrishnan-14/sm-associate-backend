import { UploadApiResponse } from "cloudinary";
import { cloudinary, assertCloudinaryConfigured } from "../config/cloudinary";

function safeSegment(value:string){
  return value.trim().replace(/[^a-zA-Z0-9_-]/g,"-").replace(/-+/g,"-").slice(0,80)||"document";
}

function extensionOf(name:string){
  const match=String(name||"").toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0]||"";
}

function resourceTypeFor(extension:string){
  // Office/text/binary documents must be stored as raw assets.
  // Keep office/text files and PDFs as raw assets. This avoids Cloudinary
  // attempting to transform document formats during upload.
  if([".pdf",".doc",".docx",".xls",".xlsx",".ppt",".pptx",".txt",".csv"].includes(extension)) return "raw" as const;
  return "auto" as const;
}

export async function uploadBufferToCloudinary(
  buffer:Buffer,
  originalName:string,
  folder:string,
  publicIdBase:string
):Promise<UploadApiResponse>{
  assertCloudinaryConfigured();

  if(!buffer?.length) throw new Error("The selected document is empty.");

  const original=String(originalName||"document");
  const extension=extensionOf(original);
  const resourceType=resourceTypeFor(extension);
  const base=safeSegment(publicIdBase);
  // Raw assets need their extension in the public ID so the downloaded file
  // retains a useful filename/type.
  const publicId=folder+"/"+base+"-"+Date.now()+(resourceType==="raw"?extension:"");

  return new Promise((resolve,reject)=>{
    const stream:any=cloudinary.uploader.upload_stream(
      {
        resource_type:resourceType,
        public_id:publicId,
        use_filename:false,
        unique_filename:false,
        overwrite:false
      },
      (error:unknown,result?:UploadApiResponse)=>{
        if(error){
          const message=error instanceof Error?error.message:String(error);
          return reject(new Error("Cloudinary upload failed for "+(extension||"document")+": "+message));
        }
        if(!result)return reject(new Error("Cloudinary upload completed without a result."));
        resolve(result);
      }
    );

    stream.on("error",(error:unknown)=>{
      reject(new Error("Cloudinary upload stream failed: "+(error instanceof Error?error.message:String(error))));
    });
    stream.end(buffer);
  });
}

export async function deleteCloudinaryAsset(publicId?:string,resourceType?:string){
  if(!publicId)return;
  try{assertCloudinaryConfigured();}catch{
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

export function createCustomerDocumentUploadSignature(
  customerId:string,
  documentKey:string,
  documentName:string,
  originalName:string
){
  assertCloudinaryConfigured();

  const cloudName=String(process.env.CLOUDINARY_CLOUD_NAME||"").trim();
  const apiKey=String(process.env.CLOUDINARY_API_KEY||"").trim();
  const apiSecret=String(process.env.CLOUDINARY_API_SECRET||"").trim();
  const extension=extensionOf(originalName);
  const resourceType=resourceTypeFor(extension);
  const safeCustomer=safeSegment(customerId);
  const safeKey=safeSegment(documentKey);
  const safeName=documentKey==="custom"?safeSegment(documentName||"custom"):safeKey;
  const publicIdBase=safeCustomer+"-"+safeName;
  const publicId="sm-associate/customers/"+publicIdBase+"-"+Date.now()+(resourceType==="raw"?extension:"");
  const timestamp=Math.floor(Date.now()/1000);
  const signature=cloudinary.utils.api_sign_request(
    {public_id:publicId,timestamp},
    apiSecret
  );

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    publicId,
    resourceType,
    uploadUrl:"https://api.cloudinary.com/v1_1/"+cloudName+"/"+resourceType+"/upload"
  };
}
