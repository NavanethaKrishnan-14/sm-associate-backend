import { Request, Response } from "express";
import { prisma } from "../config/db";
import { Car } from "../models/Car";
import { CarExpense } from "../models/CarExpense";
import { CarSale } from "../models/CarSale";
import { Customer } from "../models/Customer";
import { nextId } from "../utils/sequence";
import { resolveCarId, resolveCustomerId } from "../utils/resolveIds";
import { deleteStoredDocument, uploadBufferToPostgres } from "../utils/documentStorage";

export async function uploadSaleDocument(req:Request,res:Response){
 const sale=await CarSale.findOne({carId:req.params.id}).select("_id saleId documents");
 if(!sale)return res.status(404).json({success:false,message:"Sale not found. Complete the vehicle sale first."});
 if(!req.file)return res.status(400).json({success:false,message:"Please select a document to upload."});
 const key=String(req.params.documentKey||"");
 const fixedKeys=["idProof","agreement"];
 if(!fixedKeys.includes(key)&&key!=="custom")return res.status(400).json({success:false,message:"Invalid sale document type."});
 const documentName=key==="custom"?String(req.body.documentName||"").trim().slice(0,100):"";
 if(key==="custom"&&!documentName)return res.status(400).json({success:false,message:"Document name is required for a custom document."});
 const current:any=(sale as any).documents||{};
 if(key==="custom"){
  const customNames=Array.isArray(current.customDocuments)?current.customDocuments:[];
  if(!customNames.some((name:string)=>name.toLowerCase()===documentName.toLowerCase()))return res.status(400).json({success:false,message:"Add the custom document name before uploading its file."});
 }
 try{
  const result=await uploadBufferToPostgres(req.file.buffer,req.file.originalname,"sm-associate/car-sales",`${sale.saleId||sale._id}-${key==="custom"?`custom-${documentName}`:key}`);
  const fileMeta={originalName:req.file.originalname,storedName:result.public_id,publicId:result.public_id,url:result.secure_url,resourceType:result.resource_type,format:result.format,size:req.file.size,uploadedAt:new Date()};
  if(fixedKeys.includes(key)){
   const previous:any=current.uploads?.[key];
   await CarSale.findByIdAndUpdate(sale._id,{$set:{[`documents.${key}`]:true,[`documents.uploads.${key}`]:fileMeta}},{new:true,runValidators:true});
   if(previous?.publicId||previous?.storedName)await deleteStoredDocument(previous.publicId||previous.storedName,previous.resourceType);
  }else{
   const customUploads=Array.isArray(current.customUploads)?current.customUploads:[];
   const previous=customUploads.find((item:any)=>String(item.name).toLowerCase()===documentName.toLowerCase());
   const nextUploads=customUploads.filter((item:any)=>String(item.name).toLowerCase()!==documentName.toLowerCase());
   nextUploads.push({name:documentName,...fileMeta});
   await CarSale.findByIdAndUpdate(sale._id,{$set:{"documents.customUploads":nextUploads}},{new:true,runValidators:true});
   if(previous?.publicId||previous?.storedName)await deleteStoredDocument(previous.publicId||previous.storedName,previous.resourceType);
  }
  const updated=await CarSale.findById(sale._id).populate("buyerId","customerId name mobile");
  return res.status(201).json({success:true,message:"Buyer document uploaded successfully.",data:updated});
 }catch(error){
  console.error("PostgreSQL sale document upload failed:",error);
  const message=error instanceof Error?error.message:String(error||"Unknown document upload error.");
  return res.status(500).json({success:false,message:"Unable to save document.",code:"DOCUMENT_UPLOAD_FAILED",details:process.env.NODE_ENV==="production"?undefined:message});
 }
}
export async function downloadSaleDocument(req:Request,res:Response){
 const sale=await CarSale.findOne({carId:req.params.id});
 if(!sale)return res.status(404).json({success:false,message:"Sale not found."});
 const key=String(req.params.documentKey||"");
 const documents:any=(sale as any).documents||{};
 let metadata:any;
 if(["idProof","agreement"].includes(key))metadata=documents.uploads?.[key];
 else if(key==="custom"){
  const documentName=String(req.query.documentName||"").trim();
  metadata=(Array.isArray(documents.customUploads)?documents.customUploads:[]).find((item:any)=>String(item.name).toLowerCase()===documentName.toLowerCase());
 }
 if(!metadata?.url)return res.status(404).json({success:false,message:"Uploaded buyer document not found."});
 return res.redirect(metadata.url);
}

export async function listCarProfits(_req:Request,res:Response){
 const sales=await CarSale.find().populate("carId","vehicleId registrationNumber make model year purchasePrice").populate("buyerId","customerId name").sort({saleDate:-1});
 const summary=sales.reduce((a,s)=>({sales:a.sales+s.sellingPrice,investment:a.investment+s.totalInvestment,sellingExpenses:a.sellingExpenses+s.sellingExpenses,profit:a.profit+s.profit}),{sales:0,investment:0,sellingExpenses:0,profit:0});
 res.json({success:true,data:{summary,sales}});
}

export async function deleteCar(req:Request,res:Response){
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Car not found."});
 const car=await Car.findById(carId);
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const sale=await CarSale.findOne({carId:car._id});
 if(sale||car.status==="SOLD")return res.status(409).json({success:false,message:"Sold vehicles cannot be deleted."});
 await CarExpense.deleteMany({carId:car._id});
 await car.deleteOne();
 res.json({success:true,message:"Vehicle deleted successfully."});
}

export async function deleteCarExpense(req:Request,res:Response){
 const expenseId=String(req.params.expenseId||"");
 const expense=await prisma.carExpense.findUnique({where:{id:expenseId}});
 if(!expense)return res.status(404).json({success:false,message:"Expense not found."});
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Vehicle not found."});
 if(String(expense.carId)!==String(carId))return res.status(400).json({success:false,message:"Expense does not belong to this vehicle."});
 await prisma.carExpense.delete({where:{id:expenseId}});
 return res.json({success:true,message:"Vehicle expense deleted successfully."});
}
