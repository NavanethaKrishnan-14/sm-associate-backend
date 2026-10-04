import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { Loan, LOAN_STATUSES } from "../models/Loan";
import { LoanFollowUp } from "../models/LoanFollowUp";
import { Customer } from "../models/Customer";
import { User } from "../models/User";
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
 const patch:any={};
 for(const key of ["customerId","loanType","requiredAmount","approvedAmount","financeCompany","status","applicationDate","expectedDisbursementDate","disbursementDate","commission","rejectionReason","notes","assignedTo"]){
  if(req.body[key]!==undefined)patch[key]=req.body[key];
 }
 if(patch.customerId!==undefined){
  const customer=await Customer.findById(patch.customerId);
  if(!customer)return res.status(400).json({success:false,message:"Customer not found."});
 }
 if(patch.assignedTo!==undefined&&patch.assignedTo!==""){
  const assignee=await User.findById(patch.assignedTo);
  if(!assignee)return res.status(400).json({success:false,message:"Assigned user not found."});
 }
 if(patch.requiredAmount!==undefined){patch.requiredAmount=Number(patch.requiredAmount);if(!Number.isFinite(patch.requiredAmount)||patch.requiredAmount<0)return res.status(400).json({success:false,message:"Required amount must be a valid non-negative number."});}
 if(patch.approvedAmount!==undefined){patch.approvedAmount=Number(patch.approvedAmount);if(!Number.isFinite(patch.approvedAmount)||patch.approvedAmount<0)return res.status(400).json({success:false,message:"Approved amount must be a valid non-negative number."});}
 if(patch.commission!==undefined){patch.commission=Number(patch.commission);if(!Number.isFinite(patch.commission)||patch.commission<0)return res.status(400).json({success:false,message:"Commission must be a valid non-negative number."});}
 if(patch.status!==undefined&&!LOAN_STATUSES.includes(String(patch.status) as any))return res.status(400).json({success:false,message:"Invalid loan status."});
 if(patch.assignedTo==="")patch.assignedTo=null;
 const loan=await Loan.findByIdAndUpdate(req.params.id,{$set:patch},{new:true,runValidators:true}).populate("customerId","customerId name mobile email city occupation").populate("assignedTo","name email role");
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
function storedLoanDocumentPath(storedName:string){
 return path.resolve(process.cwd(),"uploads","loans",storedName);
}

async function removeStoredLoanDocument(storedName?:string){
 if(!storedName)return;
 try{await fs.promises.unlink(storedLoanDocumentPath(storedName));}catch(error:any){if(error?.code!=="ENOENT")console.error("Unable to remove old loan document:",error);}
}

export async function updateLoanDocuments(req:Request,res:Response){
 const loan=await Loan.findById(req.params.id);
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 const input=req.body||{};
 const current:any=(loan as any).documents||{};
 const customInput=Array.isArray(input.customDocuments)?input.customDocuments.map((name:any)=>String(name).trim().slice(0,100)).filter((name:string)=>name.length>0):[];
 const seen=new Set<string>();
 const customDocuments=customInput.filter((name:string)=>{const key=name.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;});
 const next:any={
  idProof:Boolean(input.idProof),
  addressProof:Boolean(input.addressProof),
  incomeProof:Boolean(input.incomeProof),
  bankStatement:Boolean(input.bankStatement),
  customDocuments
 };
 next.uploads=current.uploads||{};
 next.customUploads=Array.isArray(current.customUploads)?current.customUploads:[];
 for(const key of ["idProof","addressProof","incomeProof","bankStatement"]){
  if(!next[key]&&next.uploads?.[key]){await removeStoredLoanDocument(next.uploads[key].storedName);delete next.uploads[key];}
 }
 next.customUploads=next.customUploads.filter((item:any)=>customDocuments.some((name:string)=>name.toLowerCase()===String(item.name).toLowerCase()));
 await Promise.all((Array.isArray(current.customUploads)?current.customUploads:[]).filter((item:any)=>!customDocuments.some((name:string)=>name.toLowerCase()===String(item.name).toLowerCase())).map((item:any)=>removeStoredLoanDocument(item.storedName)));
 (loan as any).documents=next;
 await loan.save();
 const updated=await Loan.findById(loan._id).populate("customerId","customerId name mobile email city occupation").populate("assignedTo","name email role");
 res.json({success:true,data:updated});
}

export async function uploadLoanDocument(req:Request,res:Response){
 const loan=await Loan.findById(req.params.id);
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 if(!req.file)return res.status(400).json({success:false,message:"Please select a document to upload."});
 const key=String(req.params.documentKey||"");
 const fixedKeys=["idProof","addressProof","incomeProof","bankStatement"];
 const fileMeta={originalName:req.file.originalname,storedName:req.file.filename,size:req.file.size,uploadedAt:new Date()};
 const documents:any=(loan as any).documents||(loan as any).set("documents",{});
 if(fixedKeys.includes(key)){
  const previous=documents.uploads?.[key];
  await removeStoredLoanDocument(previous?.storedName);
  documents[key]=true;
  documents.uploads=documents.uploads||{};
  documents.uploads[key]=fileMeta;
 }else if(key==="custom"){
  const documentName=String(req.body.documentName||"").trim().slice(0,100);
  if(!documentName){await removeStoredLoanDocument(req.file.filename);return res.status(400).json({success:false,message:"Document name is required for a custom document."});}
  const customNames=Array.isArray(documents.customDocuments)?documents.customDocuments:[];
  if(!customNames.some((name:string)=>String(name).toLowerCase()===documentName.toLowerCase()))documents.customDocuments=[...customNames,documentName];
  const customUploads=Array.isArray(documents.customUploads)?documents.customUploads:[];
  const previous=customUploads.find((item:any)=>String(item.name).toLowerCase()===documentName.toLowerCase());
  await removeStoredLoanDocument(previous?.storedName);
  documents.customUploads=customUploads.filter((item:any)=>String(item.name).toLowerCase()!==documentName.toLowerCase());
  documents.customUploads.push({name:documentName,...fileMeta});
 }else{
  await removeStoredLoanDocument(req.file.filename);
  return res.status(400).json({success:false,message:"Invalid document type."});
 }
 await loan.save();
 const updated=await Loan.findById(loan._id).populate("customerId","customerId name mobile email city occupation").populate("assignedTo","name email role");
 res.status(201).json({success:true,message:"Loan document uploaded successfully.",data:updated});
}

export async function downloadLoanDocument(req:Request,res:Response){
 const loan=await Loan.findById(req.params.id);
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 const key=String(req.params.documentKey||"");
 const documents:any=(loan as any).documents||{};
 let metadata:any;
 if(["idProof","addressProof","incomeProof","bankStatement"].includes(key))metadata=documents.uploads?.[key];
 else if(key==="custom"){
  const documentName=String(req.query.documentName||"").trim();
  metadata=(Array.isArray(documents.customUploads)?documents.customUploads:[]).find((item:any)=>String(item.name).toLowerCase()===documentName.toLowerCase());
 }
 if(!metadata?.storedName)return res.status(404).json({success:false,message:"Uploaded loan document not found."});
 const filePath=storedLoanDocumentPath(metadata.storedName);
 if(!fs.existsSync(filePath))return res.status(404).json({success:false,message:"Document file is no longer available on the server."});
 res.download(filePath,metadata.originalName);
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
