import { Request, Response } from "express";
import { Loan, LOAN_STATUSES } from "../models/Loan";
import { LoanFollowUp } from "../models/LoanFollowUp";
import { Customer } from "../models/Customer";
import { nextId } from "../utils/sequence";

export async function listLoans(req:Request,res:Response){
 const status=req.query.status?String(req.query.status):undefined, customerId=req.query.customerId?String(req.query.customerId):undefined, search=req.query.search?String(req.query.search).trim():undefined;
 const filter:any={...(status?{status}:{}),...(customerId?{customerId}:{})};
 if(search){const customers=await Customer.find({$or:[{name:{$regex:search,$options:"i"}},{mobile:{$regex:search,$options:"i"}},{customerId:{$regex:search,$options:"i"}}]}).select("_id");filter.$or=[{loanId:{$regex:search,$options:"i"}},{financeCompany:{$regex:search,$options:"i"}},{customerId:{$in:customers.map(c=>c._id)}}];}
 res.json({success:true,data:await Loan.find(filter).populate("customerId","customerId name mobile email city").sort({createdAt:-1})});
}
export async function getLoan(req:Request,res:Response){
 const loan=await Loan.findById(req.params.id).populate("customerId","customerId name mobile email city occupation").populate("assignedTo","name email role");
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 const followUps=await LoanFollowUp.find({loanId:loan._id}).populate("createdBy","name").sort({followUpDate:-1,createdAt:-1});
 res.json({success:true,data:{loan,followUps}});
}
export async function createLoan(req:Request,res:Response){
 const customer=await Customer.findById(req.body.customerId);
 if(!customer)return res.status(400).json({success:false,message:"Customer not found."});
 const allowed=["customerId","loanType","requiredAmount","financeCompany","notes"];
 if(req.user?.role==="ADMIN") allowed.push("approvedAmount","commission","applicationDate","expectedDisbursementDate","disbursementDate","rejectionReason","assignedTo");
 const data:any={loanId:await nextId("LOAN","loan"),status:"ENTERED"};
 for(const key of allowed) if(req.body[key]!==undefined) data[key]=req.body[key];
 if(!data.loanType||!Number.isFinite(Number(data.requiredAmount))||Number(data.requiredAmount)<0)return res.status(400).json({success:false,message:"Loan type and a valid required amount are required."});
 data.requiredAmount=Number(data.requiredAmount); if(data.commission!==undefined)data.commission=Number(data.commission);
 const loan=await Loan.create(data);
 res.status(201).json({success:true,data:await loan.populate("customerId","customerId name mobile email city")});
}
export async function updateLoan(req:Request,res:Response){
 const allowed=req.user?.role==="ADMIN"?["loanType","requiredAmount","approvedAmount","financeCompany","applicationDate","expectedDisbursementDate","disbursementDate","commission","rejectionReason","notes","assignedTo"]:["loanType","requiredAmount","financeCompany","notes"];
 const patch:any={}; for(const key of allowed) if(req.body[key]!==undefined) patch[key]=req.body[key];
 if(patch.requiredAmount!==undefined){patch.requiredAmount=Number(patch.requiredAmount);if(!Number.isFinite(patch.requiredAmount)||patch.requiredAmount<0)return res.status(400).json({success:false,message:"Required amount must be a valid non-negative number."});}
 const loan=await Loan.findByIdAndUpdate(req.params.id,{$set:patch},{new:true,runValidators:true}).populate("customerId","customerId name mobile email city");
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 res.json({success:true,data:loan});
}
export async function updateLoanStatus(req:Request,res:Response){
 const rawStatus=String(req.body.status||"");
 const status=rawStatus==="NEW"?"ENTERED":rawStatus;
 if(!LOAN_STATUSES.includes(status as any))return res.status(400).json({success:false,message:"Invalid loan status."});
 const patch:any={status};
 if(status==="APPROVED"&&req.body.approvedAmount!==undefined){if(req.user?.role!=="ADMIN")return res.status(403).json({success:false,message:"Only ADMIN can set an approved loan amount."});patch.approvedAmount=Number(req.body.approvedAmount);if(!Number.isFinite(patch.approvedAmount)||patch.approvedAmount<0)return res.status(400).json({success:false,message:"Approved amount must be a valid non-negative number."});}
 if(status==="DISBURSED")patch.disbursementDate=req.body.disbursementDate||new Date();
 if(status==="REJECTED")patch.rejectionReason=req.body.rejectionReason||"";
 const loan=await Loan.findByIdAndUpdate(req.params.id,{$set:patch},{new:true,runValidators:true}).populate("customerId","customerId name mobile email city");
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 res.json({success:true,data:loan});
}
export async function listFollowUps(req:Request,res:Response){
 const filter:any={}; if(req.params.id)filter.loanId=req.params.id; if(req.query.status)filter.status=String(req.query.status);
 const rows=await LoanFollowUp.find(filter).populate({path:"loanId",populate:{path:"customerId",select:"customerId name mobile"}}).populate("createdBy","name").sort({followUpDate:1});
 const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate()),tomorrow=new Date(start); tomorrow.setDate(tomorrow.getDate()+1);
 const nextWeek=new Date(start); nextWeek.setDate(nextWeek.getDate()+7);
 const open=rows.filter(x=>x.status==="OPEN"),overdue=open.filter(x=>x.followUpDate<start),dueToday=open.filter(x=>x.followUpDate>=start&&x.followUpDate<tomorrow),upcoming=open.filter(x=>x.followUpDate>=tomorrow&&x.followUpDate<nextWeek);
 res.json({success:true,data:rows,summary:{open:open.length,overdue:overdue.length,dueToday:dueToday.length,upcoming:upcoming.length}});
}
export async function createFollowUp(req:Request,res:Response){
 const loan=await Loan.findById(req.params.id); if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 if(!req.body.note||!req.body.followUpDate)return res.status(400).json({success:false,message:"Follow-up date and note are required."});
 const followUp=await LoanFollowUp.create({followUpDate:new Date(req.body.followUpDate),note:String(req.body.note).trim(),status:"OPEN",loanId:loan._id,createdBy:req.user?.id});
 res.status(201).json({success:true,data:await followUp.populate("createdBy","name")});
}
export async function updateFollowUp(req:Request,res:Response){
 const followUp=await LoanFollowUp.findById(req.params.followUpId); if(!followUp)return res.status(404).json({success:false,message:"Follow-up not found."});
 if(String(followUp.loanId)!==String(req.params.id))return res.status(400).json({success:false,message:"Follow-up does not belong to this loan."});
 const patch:any={}; for(const key of ["status","nextFollowUpDate"]) if(req.body[key]!==undefined)patch[key]=req.body[key];
 if(req.body.status==="COMPLETED"&&req.body.nextFollowUpDate){
   if(!req.body.nextNote||!String(req.body.nextNote).trim())return res.status(400).json({success:false,message:"Next follow-up note is required when scheduling the next follow-up."});
   const next=await LoanFollowUp.create({loanId:followUp.loanId,followUpDate:new Date(req.body.nextFollowUpDate),note:String(req.body.nextNote).trim(),status:"OPEN",createdBy:req.user?.id});
   patch.nextFollowUpDate=new Date(req.body.nextFollowUpDate);
   const updated=await LoanFollowUp.findByIdAndUpdate(followUp._id,{$set:patch},{new:true,runValidators:true}).populate("createdBy","name");
   return res.json({success:true,data:updated,nextFollowUp:await next.populate("createdBy","name")});
 }
 const updated=await LoanFollowUp.findByIdAndUpdate(followUp._id,{$set:patch},{new:true,runValidators:true}).populate("createdBy","name");
 res.json({success:true,data:updated});
}

export async function deleteLoan(req:Request,res:Response){
 const loan=await Loan.findById(req.params.id);
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 await LoanFollowUp.deleteMany({loanId:loan._id});
 await loan.deleteOne();
 res.json({success:true,message:"Loan deleted successfully."});
}

export async function deleteFollowUp(req:Request,res:Response){
 const followUp=await LoanFollowUp.findById(req.params.followUpId);
 if(!followUp)return res.status(404).json({success:false,message:"Follow-up not found."});
 if(String(followUp.loanId)!==String(req.params.id))return res.status(400).json({success:false,message:"Follow-up does not belong to this loan."});
 await followUp.deleteOne();
 res.json({success:true,message:"Follow-up deleted successfully."});
}
