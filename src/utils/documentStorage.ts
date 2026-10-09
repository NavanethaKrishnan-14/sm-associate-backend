import { prisma } from "../config/db";

function extensionOf(name:string){
  const m=String(name||"").toLowerCase().match(/\.[a-z0-9]+$/);
  return m?.[0]||"";
}

function safe(value:string){
  return value.trim().replace(/[^a-zA-Z0-9._-]/g,"-").replace(/-+/g,"-").slice(0,100)||"document";
}

export async function uploadBufferToPostgres(buffer:Buffer,originalName:string,_folder:string,publicIdBase:string,mimeType?:string):Promise<any>{
  if(!buffer?.length) throw new Error("The selected document is empty.");
  if(buffer.length>10*1024*1024) throw new Error("File is too large. Maximum size is 10 MB.");
  const publicId=safe(publicIdBase)+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);
  const row=await prisma.document.create({
    data:{
      publicId,
      originalName:String(originalName||"document"),
      mimeType:String(mimeType||"application/octet-stream"),
      size:buffer.length,
      data:Buffer.from(buffer)
    }
  });
  return {
    public_id:row.publicId,
    secure_url:"/api/v1/documents/file/"+row.publicId,
    resource_type:"raw",
    format:extensionOf(originalName).replace(".","")||undefined
  };
}

export async function deleteStoredDocument(publicId?:string,_resourceType?:string){
  if(!publicId)return;
  await prisma.document.deleteMany({where:{publicId}});
}

export function createCustomerDocumentUploadInfo(customerId:string,_customerName:string,documentKey:string,documentName:string,originalName:string){
  return {
    storage:"postgresql",
    customerId,
    documentKey,
    documentName,
    originalName,
    uploadUrl:"/api/v1/customers/"+encodeURIComponent(customerId)+"/documents/"+encodeURIComponent(documentKey),
    uploadMethod:"POST",
    uploadEncoding:"multipart/form-data",
    resourceType:"database"
  };
}
