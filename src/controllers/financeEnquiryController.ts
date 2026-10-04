import { Request, Response } from "express";
import { FinanceEnquiry, ENQUIRY_STATUSES } from "../models/FinanceEnquiry";
import { Customer } from "../models/Customer";
import { FinanceService, FINANCE_SERVICE_TYPES } from "../models/FinanceService";
import { nextId } from "../utils/sequence";

export async function listFinanceEnquiries(req:Request,res:Response){
 const filter:any={};
 if(req.query.serviceCode)filter.serviceCode=String(req.query.serviceCode);
 if(req.query.status)filter.status=String(req.query.status);
 if(req.query.customerId)filter.customerId=String(req.query.customerId);
 const data=await FinanceEnquiry.find(filter).populate("customerId","customerId name mobile email").populate("assignedTo","name email role").sort({createdAt:-1});
 res.json({success:true,data});
}

export async function createFinanceEnquiry(req:Request,res:Response){
 const customer=await Customer.findById(req.body.customerId);
 if(!customer)return res.status(400).json({success:false,message:"Customer not found."});
 const serviceCode=String(req.body.serviceCode||"");
 if(!FINANCE_SERVICE_TYPES.includes(serviceCode as any))return res.status(400).json({success:false,message:"Invalid finance service."});
 const service=await FinanceService.findOne({code:serviceCode,active:true});
 if(!service)return res.status(400).json({success:false,message:"Finance service is inactive or unavailable."});
 const data:any={enquiryId:await nextId("ENQ","financeEnquiry"),customerId:customer._id,serviceCode};
 for(const key of ["financeCompany","followUpDate","notes"])if(req.body[key]!==undefined)data[key]=req.body[key];
 if(req.body.requiredAmount!==undefined){data.requiredAmount=Number(req.body.requiredAmount);if(!Number.isFinite(data.requiredAmount)||data.requiredAmount<0)return res.status(400).json({success:false,message:"Required amount must be a valid non-negative number."});}
 if(req.user?.role==="ADMIN"&&req.body.assignedTo!==undefined)data.assignedTo=req.body.assignedTo;
 const enquiry=await FinanceEnquiry.create(data);
 res.status(201).json({success:true,data:await enquiry.populate([{path:"customerId",select:"customerId name mobile email"},{path:"assignedTo",select:"name email role"}])});
}

export async function updateFinanceEnquiry(req:Request,res:Response){
 const allowed=req.user?.role==="ADMIN"
  ?["serviceCode","financeCompany","requiredAmount","status","followUpDate","notes","assignedTo"]
  :["serviceCode","financeCompany","requiredAmount","followUpDate","notes"];
 const patch:any={};
 for(const key of allowed)if(req.body[key]!==undefined)patch[key]=req.body[key];
 if(patch.serviceCode!==undefined){
  const code=String(patch.serviceCode);
  if(!FINANCE_SERVICE_TYPES.includes(code as any))return res.status(400).json({success:false,message:"Invalid finance service."});
  const service=await FinanceService.findOne({code,active:true});if(!service)return res.status(400).json({success:false,message:"Finance service is inactive or unavailable."});
  patch.serviceCode=code;
 }
 if(patch.requiredAmount!==undefined){patch.requiredAmount=Number(patch.requiredAmount);if(!Number.isFinite(patch.requiredAmount)||patch.requiredAmount<0)return res.status(400).json({success:false,message:"Required amount must be a valid non-negative number."});}
 if(patch.status!==undefined&&!ENQUIRY_STATUSES.includes(String(patch.status) as any))return res.status(400).json({success:false,message:"Invalid enquiry status."});
 const enquiry=await FinanceEnquiry.findByIdAndUpdate(req.params.id,{$set:patch},{new:true,runValidators:true}).populate("customerId","customerId name mobile email").populate("assignedTo","name email role");
 if(!enquiry)return res.status(404).json({success:false,message:"Finance enquiry not found."});
 res.json({success:true,data:enquiry});
}
