import { Request, Response } from "express";
import { Loan, LOAN_STATUSES } from "../models/Loan";
import { LoanFollowUp } from "../models/LoanFollowUp";
import { Customer } from "../models/Customer";
import { nextId } from "../utils/sequence";

export async function listLoans(req:Request,res:Response){
 const status=req.query.status?String(req.query.status):undefined;
 const customerId=req.query.customerId?String(req.query.customerId):undefined;
 const search=req.query.search?String(req.query.search).trim():undefined;
 const filter:any={...(status?{status}:{}),...(customerId?{customerId}: {})};
 let loans=Loan.find(filter).populate("customerId","customerId name mobile email city").sort({createdAt:-1});
 if(search){
   const customers=await Customer.find({$or:[
     {name:{$regex:search,$options:"i"}},{mobile:{$regex:search,$options:"i"}},{customerId:{$regex:search,$options:"i"}}
   ]}).select("_id");
   filter.$or=[{loanId:{$regex:search,$options:"i"}},{financeCompany:{$regex:search,$options:"i"}},{customerId:{$in:customers.map(c=>c._id)}}];
   loans=Loan.find(filter).populate("customerId","customerId name mobile email city").sort({createdAt:-1});
 }
 res.json({success:true,data:await loans});
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
 const loan=await Loan.create({...req.body,loanId:await nextId("LOAN","loan")});
 res.status(201).json({success:true,data:await loan.populate("customerId","customerId name mobile email city")});
}

export async function updateLoan(req:Request,res:Response){
 const allowed=["loanType","requiredAmount","approvedAmount","financeCompany","applicationDate","expectedDisbursementDate","disbursementDate","commission","rejectionReason","notes","assignedTo"];
 const patch:any={};
 for(const key of allowed) if(req.body[key]!==undefined) patch[key]=req.body[key];
 const loan=await Loan.findByIdAndUpdate(req.params.id,{$set:patch},{new:true,runValidators:true}).populate("customerId","customerId name mobile email city");
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 res.json({success:true,data:loan});
}

export async function updateLoanStatus(req:Request,res:Response){
 const status=String(req.body.status||"");
 if(!LOAN_STATUSES.includes(status as any))return res.status(400).json({success:false,message:"Invalid loan status."});
 const patch:any={status};
 if(status==="APPROVED" && req.body.approvedAmount!==undefined) patch.approvedAmount=Number(req.body.approvedAmount);
 if(status==="DISBURSED") patch.disbursementDate=req.body.disbursementDate||new Date();
 if(status==="REJECTED") patch.rejectionReason=req.body.rejectionReason||"";
 const loan=await Loan.findByIdAndUpdate(req.params.id,{$set:patch},{new:true,runValidators:true}).populate("customerId","customerId name mobile email city");
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 res.json({success:true,data:loan});
}

export async function listFollowUps(req:Request,res:Response){
 const filter:any={};
 if(req.params.id)filter.loanId=req.params.id;
 if(req.query.status)filter.status=String(req.query.status);
 const followUps=await LoanFollowUp.find(filter).populate({path:"loanId",populate:{path:"customerId",select:"customerId name mobile"}}).populate("createdBy","name").sort({followUpDate:1});
 res.json({success:true,data:followUps});
}

export async function createFollowUp(req:Request,res:Response){
 const loan=await Loan.findById(req.params.id);
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 if(!req.body.note || !req.body.followUpDate)return res.status(400).json({success:false,message:"Follow-up date and note are required."});
 const followUp=await LoanFollowUp.create({...req.body,loanId:loan._id,createdBy:(req as any).user?.id});
 res.status(201).json({success:true,data:await followUp.populate("createdBy","name")});
}

export async function updateFollowUp(req:Request,res:Response){
 const followUp=await LoanFollowUp.findByIdAndUpdate(req.params.followUpId,{$set:req.body},{new:true,runValidators:true}).populate("createdBy","name");
 if(!followUp)return res.status(404).json({success:false,message:"Follow-up not found."});
 res.json({success:true,data:followUp});
}