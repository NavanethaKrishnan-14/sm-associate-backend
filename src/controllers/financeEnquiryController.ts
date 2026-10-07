import { Request, Response } from "express";
import { FinanceEnquiry, ENQUIRY_STATUSES } from "../models/FinanceEnquiry";
import { Customer } from "../models/Customer";
import { FinanceService, FINANCE_SERVICE_TYPES } from "../models/FinanceService";
import { nextId } from "../utils/sequence";
import { User } from "../models/User";
import { resolveCustomerId, resolveEnquiryId, resolveUserId } from "../utils/resolveIds";

export async function listFinanceEnquiries(req:Request,res:Response){
 const filter:any={};
 if(req.query.serviceCode)filter.serviceCode=String(req.query.serviceCode);
 if(req.query.status)filter.status=String(req.query.status);
 if(req.query.customerId){
  const customerId=await resolveCustomerId(req.query.customerId);
  if(!customerId)return res.json({success:true,data:[]});
  filter.customerId=customerId;
 }
 const data=await FinanceEnquiry.find(filter).populate("customerId","customerId name mobile email").populate("assignedTo","name email role").sort({createdAt:-1});
 res.json({success:true,data});
}

export async function createFinanceEnquiry(req:Request,res:Response){
 const customerId=await resolveCustomerId(req.body.customerId);
 const customer=customerId?await Customer.findById(customerId):null;
 if(!customer)return res.status(400).json({success:false,message:"Customer not found."});
 const serviceCode=String(req.body.serviceCode||"");
 if(!FINANCE_SERVICE_TYPES.includes(serviceCode as any))return res.status(400).json({success:false,message:"Invalid finance service."});
 const service=await FinanceService.findOne({code:serviceCode,active:true});
 if(!service)return res.status(400).json({success:false,message:"Finance service is inactive or unavailable."});
 const data:any={enquiryId:await nextId("ENQ","financeEnquiry"),customerId:customer._id,serviceCode};
 for(const key of ["financeCompany","followUpDate","notes"])if(req.body[key]!==undefined)data[key]=req.body[key];
 if(req.body.requiredAmount!==undefined){data.requiredAmount=Number(req.body.requiredAmount);if(!Number.isFinite(data.requiredAmount)||data.requiredAmount<0)return res.status(400).json({success:false,message:"Required amount must be a valid non-negative number."});}
 if(req.user?.role==="ADMIN"&&req.body.assignedTo!==undefined){
  if(req.body.assignedTo==="")data.assignedTo=null;
  else{
   const assigneeId=await resolveUserId(req.body.assignedTo);
   const assignee=assigneeId?await User.findById(assigneeId).select("_id"):null;
   if(!assignee)return res.status(400).json({success:false,message:"Assigned user not found."});
   data.assignedTo=assignee._id;
  }
 }
 if(data.followUpDate!==undefined){
  const date=new Date(data.followUpDate);
  if(Number.isNaN(date.getTime()))return res.status(400).json({success:false,message:"Follow-up date must be valid."});
  data.followUpDate=date;
 }
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
 if(patch.followUpDate!==undefined){
  if(String(patch.followUpDate).trim()==="")patch.followUpDate=null;
  else{
   const date=new Date(patch.followUpDate);
   if(Number.isNaN(date.getTime()))return res.status(400).json({success:false,message:"Follow-up date must be valid."});
   patch.followUpDate=date;
  }
 }
 if(patch.assignedTo!==undefined){
  if(patch.assignedTo==="")patch.assignedTo=null;
  else{
   const assigneeId=await resolveUserId(patch.assignedTo);
   const assignee=assigneeId?await User.findById(assigneeId).select("_id"):null;
   if(!assignee)return res.status(400).json({success:false,message:"Assigned user not found."});
   patch.assignedTo=assignee._id;
  }
 }
 if(patch.status!==undefined&&!ENQUIRY_STATUSES.includes(String(patch.status) as any))return res.status(400).json({success:false,message:"Invalid enquiry status."});
 if(!Object.keys(patch).length)return res.status(400).json({success:false,message:"No enquiry fields were provided to update."});
 const enquiryId=await resolveEnquiryId(req.params.id);
 if(!enquiryId)return res.status(404).json({success:false,message:"Finance enquiry not found."});
 const enquiry=await FinanceEnquiry.findByIdAndUpdate(enquiryId,{$set:patch},{new:true,runValidators:true}).populate("customerId","customerId name mobile email").populate("assignedTo","name email role");
 if(!enquiry)return res.status(404).json({success:false,message:"Finance enquiry not found."});
 res.json({success:true,data:enquiry});
}
