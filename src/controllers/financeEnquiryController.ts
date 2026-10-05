import { Request,Response } from "express";
import { prisma } from "../config/db";
import { nextId,newDatabaseId } from "../utils/sequence";
import { toLegacy, renameRelations } from "../utils/legacy";
export const ENQUIRY_STATUSES=["NEW","IN_PROGRESS","COMPLETED","CANCELLED"] as const;
export const FINANCE_SERVICE_TYPES=["DSA_FINANCE","HOME_LOAN","CAR_LOAN","BUSINESS_LOAN","PERSONAL_LOAN","INSURANCE_RENEWAL","GOLD_RESALE"] as const;
const customerSelect={id:true,customerId:true,name:true,mobile:true,email:true};
const userSelect={id:true,name:true,email:true,role:true};
export async function listFinanceEnquiries(req:Request,res:Response){
const where:any={};if(req.query.serviceCode)where.serviceCode=String(req.query.serviceCode);if(req.query.status)where.status=String(req.query.status);if(req.query.customerId)where.customerId=String(req.query.customerId);
const rows=await prisma.financeEnquiry.findMany({where,include:{customer:{select:customerSelect},assignedTo:{select:userSelect}},orderBy:{createdAt:"desc"}});
res.json({success:true,data:toLegacy(rows.map((row:any)=>renameRelations(row,{customer:"customerId"})))});
}
export async function createFinanceEnquiry(req:Request,res:Response){
const customer=await prisma.customer.findUnique({where:{id:String(req.body.customerId)}});if(!customer)return res.status(400).json({success:false,message:"Customer not found."});
const serviceCode=String(req.body.serviceCode||"");if(!FINANCE_SERVICE_TYPES.includes(serviceCode as any))return res.status(400).json({success:false,message:"Invalid finance service."});
const service=await prisma.financeService.findFirst({where:{code:serviceCode,active:true}});if(!service)return res.status(400).json({success:false,message:"Finance service is inactive or unavailable."});
const data:any={id:newDatabaseId(),enquiryId:await nextId("ENQ","financeEnquiry"),customerId:customer.id,serviceCode};for(const key of ["financeCompany","notes"])if(req.body[key]!==undefined)data[key]=req.body[key];if(req.body.followUpDate!==undefined)data.followUpDate=new Date(req.body.followUpDate);
if(req.body.requiredAmount!==undefined){data.requiredAmount=Number(req.body.requiredAmount);if(!Number.isFinite(data.requiredAmount)||data.requiredAmount<0)return res.status(400).json({success:false,message:"Required amount must be a valid non-negative number."});}
if(req.user?.role==="ADMIN"&&req.body.assignedTo!==undefined)data.assignedToId=String(req.body.assignedTo||"")||null;
const enquiry=await prisma.financeEnquiry.create({data,include:{customer:{select:customerSelect},assignedTo:{select:userSelect},service:true}});
res.status(201).json({success:true,data:toLegacy(renameRelations(enquiry as any,{customer:"customerId"}))});
}
export async function updateFinanceEnquiry(req:Request,res:Response){
const allowed=req.user?.role==="ADMIN"?["serviceCode","financeCompany","requiredAmount","status","followUpDate","notes","assignedTo"]:["serviceCode","financeCompany","requiredAmount","followUpDate","notes"];const patch:any={};
for(const key of allowed)if(req.body[key]!==undefined)patch[key]=req.body[key];
if(patch.serviceCode!==undefined){const code=String(patch.serviceCode);if(!FINANCE_SERVICE_TYPES.includes(code as any))return res.status(400).json({success:false,message:"Invalid finance service."});const service=await prisma.financeService.findFirst({where:{code,active:true}});if(!service)return res.status(400).json({success:false,message:"Finance service is inactive or unavailable."});patch.serviceCode=code;}
if(patch.requiredAmount!==undefined){patch.requiredAmount=Number(patch.requiredAmount);if(!Number.isFinite(patch.requiredAmount)||patch.requiredAmount<0)return res.status(400).json({success:false,message:"Required amount must be a valid non-negative number."});}
if(patch.status!==undefined&&!ENQUIRY_STATUSES.includes(String(patch.status) as any))return res.status(400).json({success:false,message:"Invalid enquiry status."});
if(patch.followUpDate!==undefined)patch.followUpDate=patch.followUpDate?new Date(patch.followUpDate):null;
if(patch.assignedTo!==undefined){const id=String(patch.assignedTo||"");if(id&&!await prisma.user.findUnique({where:{id}}))return res.status(400).json({success:false,message:"Assigned user not found."});patch.assignedToId=id||null;delete patch.assignedTo;}
const row=await prisma.financeEnquiry.update({where:{id:req.params.id},data:patch,include:{customer:{select:customerSelect},assignedTo:{select:userSelect},service:true}}).catch(()=>null);if(!row)return res.status(404).json({success:false,message:"Finance enquiry not found."});
res.json({success:true,data:toLegacy(renameRelations(row as any,{customer:"customerId"}))});
}