import { Request, Response } from "express";
import { Customer } from "../models/Customer";
import { Loan } from "../models/Loan";
import { Car } from "../models/Car";
import { CarSale } from "../models/CarSale";
import { nextId } from "../utils/sequence";
import { resolveCustomerId } from "../utils/resolveIds";
import { createCustomerDocumentUploadSignature, deleteCloudinaryAsset, uploadBufferToCloudinary } from "../utils/cloudinaryUpload";

export async function listCustomers(req:Request,res:Response){
 const search=String(req.query.search??"").trim();
 const filter=search?{$or:[{name:{$regex:search,$options:"i"}},{mobile:{$regex:search,$options:"i"}},{customerId:{$regex:search,$options:"i"}}]}:{};
 res.json({success:true,data:await Customer.find(filter).sort({createdAt:-1})});
}
export async function createCustomer(req:Request,res:Response){
 const allowed=["name","mobile","alternateMobile","email","address","city","occupation","pan","aadhaarLast4","notes"];
 const data:any={customerId:await nextId("CUS","customer")};
 for(const key of allowed) if(req.body[key]!==undefined) data[key]=req.body[key];
 data.name=String(data.name??"").trim();
 data.mobile=String(data.mobile??"").trim();
 if(data.email!==undefined&&data.email!==null)data.email=String(data.email).trim().toLowerCase();
 if(data.pan!==undefined&&data.pan!==null)data.pan=String(data.pan).trim().toUpperCase();
 if(data.aadhaarLast4!==undefined&&data.aadhaarLast4!==null)data.aadhaarLast4=String(data.aadhaarLast4).trim();
 if(!data.name||!data.mobile)return res.status(400).json({success:false,message:"Customer name and mobile are required."});
 res.status(201).json({success:true,data:await Customer.create(data)});
}
export async function createCustomerDocumentUpload(req:Request,res:Response){
 const customerId=await resolveCustomerId(req.params.id);
 if(!customerId)return res.status(404).json({success:false,message:"Customer not found."});
 const customer=await Customer.findById(customerId).select("_id customerId documents");
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});

 const key=String(req.params.documentKey||"");
 const fixedKeys=["idProof","addressProof","incomeProof","bankStatement"];
 const isCustom=key==="custom";
 if(!fixedKeys.includes(key)&&!isCustom)return res.status(400).json({success:false,message:"Invalid customer document type."});

 const originalName=String(req.body?.originalName||"").trim().slice(0,200);
 if(!originalName)return res.status(400).json({success:false,message:"Original document name is required."});

 const documentName=isCustom?String(req.body?.documentName||"").trim().slice(0,100):"";
 if(isCustom&&!documentName)return res.status(400).json({success:false,message:"Document name is required for a custom document."});

 try{
   const signature=createCustomerDocumentUploadSignature(
     String(customer.customerId||customer._id),
     String(customer.name||customer.customerId||customer._id),
     key,
     documentName,
     originalName
   );
   return res.json({
     success:true,
     data:{
       ...signature,
       customerId:String(customer._id),
       documentKey:key,
       documentName,
       originalName
     }
   });
 }catch(error){
   console.error("Customer document signature failed:",error);
   return res.status(500).json({
     success:false,
     message:"Unable to prepare document upload.",
     code:"DOCUMENT_UPLOAD_SIGNATURE_FAILED"
   });
 }
}

export async function completeCustomerDocumentUpload(req:Request,res:Response){
 const customerId=await resolveCustomerId(req.params.id);
 if(!customerId)return res.status(404).json({success:false,message:"Customer not found."});

 const customer:any=await Customer.findById(customerId).select("_id customerId documents");
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});

 const key=String(req.params.documentKey||"");
 const fixedKeys=["idProof","addressProof","incomeProof","bankStatement"];
 const isCustom=key==="custom";
 if(!fixedKeys.includes(key)&&!isCustom){
   return res.status(400).json({success:false,message:"Invalid customer document type."});
 }

 const originalName=String(req.body?.originalName||"").trim().slice(0,200);
 const publicId=String(req.body?.publicId||"").trim();
 const secureUrl=String(req.body?.secureUrl||"").trim();
 const resourceType=String(req.body?.resourceType||"").trim().toLowerCase();
 const format=String(req.body?.format||"").trim();
 const size=Number(req.body?.size||0);
 const documentName=isCustom?String(req.body?.documentName||"").trim().slice(0,100):"";

 if(!originalName||!publicId||!secureUrl){
   return res.status(400).json({success:false,message:"Cloudinary upload information is incomplete."});
 }
 if(!/^https:\/\//i.test(secureUrl)){
   return res.status(400).json({success:false,message:"Invalid Cloudinary document URL."});
 }
 if(!["image","raw","video"].includes(resourceType)){
   return res.status(400).json({success:false,message:"Invalid Cloudinary document type."});
 }
 if(isCustom&&!documentName){
   return res.status(400).json({success:false,message:"Document name is required for a custom document."});
 }

 const safePersonName=String(customer.name||customer.customerId||customer._id)
   .trim()
   .replace(/[^a-zA-Z0-9_-]/g,"-")
   .replace(/-+/g,"-")
   .slice(0,80)||"customer";
 const expectedPrefix="sm-associate/customers/"+safePersonName+"/";
 if(!publicId.startsWith(expectedPrefix)){
   return res.status(400).json({success:false,message:"Invalid Cloudinary document identifier."});
 }

 let previous:any=null;

 try{
   const documents:any=customer.documents||{};
   const fileMeta={
     originalName,
     storedName:publicId,
     publicId,
     url:secureUrl,
     resourceType,
     format:format||undefined,
     size:Number.isFinite(size)&&size>0?size:undefined,
     uploadedAt:new Date()
   };

   if(!documents.uploads||typeof documents.uploads!=="object"||Array.isArray(documents.uploads)){
     documents.uploads={};
   }

   if(!isCustom){
     previous=documents.uploads[key];
     documents[key]=true;
     documents.uploads[key]=fileMeta;
   }else{
     const customUploads=Array.isArray(documents.customUploads)?documents.customUploads:[];
     const customDocuments=Array.isArray(documents.customDocuments)?documents.customDocuments:[];

     previous=customUploads.find((item:any)=>
       String(item?.name||"").trim().toLowerCase()===documentName.toLowerCase()
     );

     if(!customDocuments.some((name:string)=>
       String(name).trim().toLowerCase()===documentName.toLowerCase()
     )){
       customDocuments.push(documentName);
     }

     documents.customDocuments=customDocuments.slice(0,50);
     documents.customUploads=[
       ...customUploads.filter((item:any)=>
         String(item?.name||"").trim().toLowerCase()!==documentName.toLowerCase()
       ),
       {name:documentName,...fileMeta}
     ];
   }

   customer.documents=documents;
   customer.markModified("documents");
   const updated=await customer.save();

   if(previous?.publicId||previous?.storedName){
     await deleteCloudinaryAsset(previous.publicId||previous.storedName,previous.resourceType);
   }

   return res.status(201).json({
     success:true,
     message:"Customer document uploaded successfully.",
     data:updated
   });
 }catch(error){
   console.error("Customer document completion failed:",error);

   return res.status(500).json({
     success:false,
     message:"Unable to save document.",
     code:"DOCUMENT_UPLOAD_FAILED",
     details:process.env.NODE_ENV==="production"
       ? undefined
       : error instanceof Error ? error.message : String(error||"Unknown database error.")
   });
 }
}

export async function uploadCustomerDocument(req:Request,res:Response){
 const customerId=await resolveCustomerId(req.params.id);
 if(!customerId)return res.status(404).json({success:false,message:"Customer not found."});
 const customer=await Customer.findById(customerId).select("_id customerId documents");
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});
 if(!req.file)return res.status(400).json({success:false,message:"Please select a document to upload."});
 const key=String(req.params.documentKey||"");
 const fixedKeys=["idProof","addressProof","incomeProof","bankStatement"];
 const isCustom=key==="custom";
 if(!fixedKeys.includes(key)&&!isCustom)return res.status(400).json({success:false,message:"Invalid customer document type."});
 const documentName=isCustom?String(req.body.documentName||"").trim().slice(0,100):"";
 if(isCustom&&!documentName)return res.status(400).json({success:false,message:"Document name is required for a custom document."});
 try{
  const result=await uploadBufferToCloudinary(req.file.buffer,req.file.originalname,"sm-associate/customers",`${customer.customerId||customer._id}-${isCustom?`custom-${documentName}`:key}`);
  const fileMeta={originalName:req.file.originalname,storedName:result.public_id,publicId:result.public_id,url:result.secure_url,resourceType:result.resource_type,format:result.format,size:req.file.size,uploadedAt:new Date()};
  let updated:any;
  let previous:any;
  if(!isCustom){
   previous=(customer as any).documents?.uploads?.[key];
   updated=await Customer.findByIdAndUpdate(customer._id,{$set:{[`documents.${key}`]:true,[`documents.uploads.${key}`]:fileMeta}},{new:true,runValidators:true});
  }else{
   const current:any=(customer as any).documents||{};
   const customUploads=Array.isArray(current.customUploads)?current.customUploads:[];
   previous=customUploads.find((item:any)=>String(item.name).toLowerCase()===documentName.toLowerCase());
   const customDocuments=Array.isArray(current.customDocuments)?current.customDocuments:[];
   const nextDocuments=customDocuments.some((name:string)=>name.toLowerCase()===documentName.toLowerCase())?customDocuments:[...customDocuments,documentName];
   const nextUploads=customUploads.filter((item:any)=>String(item.name).toLowerCase()!==documentName.toLowerCase());
   nextUploads.push({name:documentName,...fileMeta});
   updated=await Customer.findByIdAndUpdate(customer._id,{$set:{"documents.customDocuments":nextDocuments,"documents.customUploads":nextUploads}},{new:true,runValidators:true});
  }
  if(previous?.publicId||previous?.storedName)await deleteCloudinaryAsset(previous.publicId||previous.storedName,previous.resourceType);
  return res.status(201).json({success:true,message:"Customer document uploaded successfully.",data:updated});
 }catch(error){
  console.error("Customer document upload/save failed:",error);
  const message=error instanceof Error?error.message:String(error||"Unknown document upload error.");
  return res.status(500).json({success:false,message:"Unable to save document.",code:"DOCUMENT_UPLOAD_FAILED",details:process.env.NODE_ENV==="production"?undefined:message});
 }
}
export async function getCustomer(req:Request,res:Response){
 const customerId=await resolveCustomerId(req.params.id);
 if(!customerId)return res.status(404).json({success:false,message:"Customer not found."});
 const customer=await Customer.findById(customerId);
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});
 res.json({success:true,data:customer});
}
export async function updateCustomer(req:Request,res:Response){
 const customerId=await resolveCustomerId(req.params.id);
 if(!customerId)return res.status(404).json({success:false,message:"Customer not found."});
 const customer=await Customer.findById(customerId);
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});
 const patch:any={};
 for(const key of ["name","mobile","alternateMobile","email","address","city","occupation","pan","aadhaarLast4","notes"]){
  if(req.body[key]!==undefined)patch[key]=req.body[key];
 }
 const nextName=patch.name!==undefined?String(patch.name).trim():customer.name;
 const nextMobile=patch.mobile!==undefined?String(patch.mobile).trim():customer.mobile;
 if(!nextName||!nextMobile)return res.status(400).json({success:false,message:"Customer name and mobile are required."});
 patch.name=nextName;patch.mobile=nextMobile;
 const updated=await Customer.findByIdAndUpdate(customer._id,{$set:patch},{new:true,runValidators:true});
 res.json({success:true,data:updated});
}

export async function updateCustomerDocuments(req:Request,res:Response){
 const customerId=await resolveCustomerId(req.params.id);
 if(!customerId)return res.status(404).json({success:false,message:"Customer not found."});
 const customer=await Customer.findById(customerId);
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});
 const names=Array.isArray(req.body.customDocuments)?req.body.customDocuments.map((x:any)=>String(x).trim()).filter(Boolean).slice(0,50):[];
 const allowed=["idProof","addressProof","incomeProof","bankStatement"];
 const patch:any={"documents.customDocuments":Array.from(new Set(names))};
 for(const key of allowed)if(req.body[key]!==undefined)patch["documents."+key]=Boolean(req.body[key]);
 const updated=await Customer.findByIdAndUpdate(customer._id,{$set:patch},{new:true,runValidators:true});
 res.json({success:true,message:"Customer documents updated successfully.",data:updated});
}

export async function deleteCustomer(req:Request,res:Response){
 const customerId=await resolveCustomerId(req.params.id);
 if(!customerId)return res.status(404).json({success:false,message:"Customer not found."});
 const customer=await Customer.findById(customerId);
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});
 const [loanCount,carCount,saleCount]=await Promise.all([Loan.countDocuments({customerId:customer._id}),Car.countDocuments({sellerId:customer._id}),CarSale.countDocuments({buyerId:customer._id})]);
 if(loanCount||carCount||saleCount)return res.status(409).json({success:false,message:"Customer cannot be deleted because transaction history exists.",data:{loanCount,carCount,saleCount}});
 await customer.deleteOne(); res.json({success:true,message:"Customer deleted successfully."});
}
export async function getCustomerHistory(req:Request,res:Response){
 const customerId=await resolveCustomerId(req.params.id);
 if(!customerId)return res.status(404).json({success:false,message:"Customer not found."});
 const customer=await Customer.findById(customerId);
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});
 const [loans,carsBought,carsSold]=await Promise.all([Loan.find({customerId:customer._id}).populate("assignedTo","name email").sort({createdAt:-1}),CarSale.find({buyerId:customer._id}).populate("carId").sort({saleDate:-1}),Car.find({sellerId:customer._id}).sort({createdAt:-1})]);
 const loanCommission=loans.reduce((sum,loan)=>sum+(loan.commission||0),0);
 const loanApprovedAmount=loans.reduce((sum,loan)=>sum+(loan.approvedAmount||0),0);
 const carsBoughtValue=carsBought.reduce((sum,sale)=>sum+sale.sellingPrice,0);
 const carsSoldValue=carsSold.reduce((sum,car)=>sum+car.purchasePrice,0);
 res.json({success:true,data:{customer,loans,carsBought,carsSold,summary:{loanCount:loans.length,loanCommission,loanApprovedAmount,carsBoughtCount:carsBought.length,carsBoughtValue,carsSoldCount:carsSold.length,carsSoldValue}}});
}