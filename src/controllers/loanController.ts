import { Request, Response } from "express";
import { prisma } from "../config/db";
import { Loan, LOAN_STATUSES } from "../models/Loan";
import { LoanFollowUp } from "../models/LoanFollowUp";
import { Customer } from "../models/Customer";
import { User } from "../models/User";
import { nextId } from "../utils/sequence";
import { resolveCustomerId, resolveLoanId, resolveUserId } from "../utils/resolveIds";
import { deleteStoredDocument, uploadBufferToPostgres } from "../utils/documentStorage";

const STAFF_LOAN_STATUSES=new Set(["ENTERED","DOCUMENTS_PENDING","SUBMITTED","UNDER_REVIEW"]);
const ADMIN_ONLY_LOAN_FIELDS=["approvedAmount","disbursementDate","commission","rejectionReason","assignedTo"];


const LOAN_DOCUMENT_KEYS=["idProof","addressProof","incomeProof","bankStatement"];
export async function uploadLoanDocument(req:Request,res:Response){
 const loanId=await resolveLoanId(req.params.id);
 if(!loanId)return res.status(404).json({success:false,message:"Loan not found."});
 const loan=await Loan.findById(loanId).select("_id loanId documents");
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 if(!req.file)return res.status(400).json({success:false,message:"Please select a document to upload."});
 const key=String(req.params.documentKey||""),isCustom=key==="custom";
 if(!LOAN_DOCUMENT_KEYS.includes(key)&&!isCustom)return res.status(400).json({success:false,message:"Invalid loan document type."});
 const documentName=isCustom?String(req.body.documentName||"").trim().slice(0,100):"";
 if(isCustom&&!documentName)return res.status(400).json({success:false,message:"Document name is required for a custom document."});
 try{
  const result=await uploadBufferToPostgres(req.file.buffer,req.file.originalname,"sm-associate/loans",String(loan.loanId||loan._id)+"-"+(isCustom?"custom-"+documentName:key));
  const fileMeta={originalName:req.file.originalname,storedName:result.public_id,publicId:result.public_id,url:result.secure_url,resourceType:result.resource_type,format:result.format,size:req.file.size,uploadedAt:new Date()};
  const current:any=(loan as any).documents||{};let previous:any;let updated:any;
  if(!isCustom){
   previous=current.uploads?.[key];
   updated=await Loan.findByIdAndUpdate(loan._id,{$set:{["documents."+key]:true,["documents.uploads."+key]:fileMeta}},{new:true,runValidators:true});
  }else{
   const names=Array.isArray(current.customDocuments)?current.customDocuments:[];
   const uploads=Array.isArray(current.customUploads)?current.customUploads:[];
   previous=uploads.find((item:any)=>String(item.name).toLowerCase()===documentName.toLowerCase());
   const nextNames=names.some((name:string)=>name.toLowerCase()===documentName.toLowerCase())?names:[...names,documentName];
   const nextUploads=uploads.filter((item:any)=>String(item.name).toLowerCase()!==documentName.toLowerCase());
   nextUploads.push({name:documentName,...fileMeta});
   updated=await Loan.findByIdAndUpdate(loan._id,{$set:{"documents.customDocuments":nextNames,"documents.customUploads":nextUploads}},{new:true,runValidators:true});
  }
  if(previous?.publicId||previous?.storedName)await deleteStoredDocument(previous.publicId||previous.storedName,previous.resourceType);
  return res.status(201).json({success:true,message:"Loan document uploaded successfully.",data:updated});
 }catch(error){console.error("Loan document upload/save failed:",error);const message=error instanceof Error?error.message:String(error||"Unknown document upload error.");return res.status(500).json({success:false,message:"Unable to save document.",code:"DOCUMENT_UPLOAD_FAILED",details:process.env.NODE_ENV==="production"?undefined:message});}
}
export async function updateLoanDocuments(req:Request,res:Response){
 const loanId=await resolveLoanId(req.params.id);
 if(!loanId)return res.status(404).json({success:false,message:"Loan not found."});
 const loan=await Loan.findById(loanId);if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 const names=Array.isArray(req.body.customDocuments)?req.body.customDocuments.map((x:any)=>String(x).trim()).filter(Boolean).slice(0,50):[];
 const patch:any={"documents.customDocuments":Array.from(new Set(names))};
 for(const key of LOAN_DOCUMENT_KEYS)if(req.body[key]!==undefined)patch["documents."+key]=Boolean(req.body[key]);
 const updated=await Loan.findByIdAndUpdate(loan._id,{$set:patch},{new:true,runValidators:true});
 return res.json({success:true,message:"Loan documents updated successfully.",data:updated});
}

const FINANCE_ENQUIRY_LOAN_TYPES:Record<string,string>={
 DSA_FINANCE:"DSA Finance",
 HOME_LOAN:"Home Loan",
 CAR_LOAN:"Car Loan",
 BUSINESS_LOAN:"Business Loan",
 PERSONAL_LOAN:"Personal Loan"
};

// Backfill eligible finance enquiries that existed before automatic loan creation was added.
// The enquiry ID marker makes this operation safe to repeat without creating duplicate loans.
async function syncFinanceEnquiriesToLoans(){
 try{
  const enquiries=await prisma.financeEnquiry.findMany({
   where:{serviceCode:{in:Object.keys(FINANCE_ENQUIRY_LOAN_TYPES)}},
   orderBy:{createdAt:"asc"}
  });
  if(!enquiries.length)return;
  const existingLoans=await prisma.loan.findMany({select:{notes:true}});
  const linkedEnquiryIds=new Set<string>();
  for(const loan of existingLoans){
   const notes=String(loan.notes||"");
   const match=notes.match(/Created from finance enquiry (ENQ-[^\\s]+)/);
   if(match?.[1])linkedEnquiryIds.add(match[1]);
  }
  for(const enquiry of enquiries){
   if(linkedEnquiryIds.has(String(enquiry.enquiryId)))continue;
   const customer=await prisma.customer.findUnique({where:{id:enquiry.customerId},select:{id:true}});
   if(!customer)continue;
   const loanType=FINANCE_ENQUIRY_LOAN_TYPES[enquiry.serviceCode];
   await prisma.loan.create({data:{
    loanId:await nextId("LOAN","loan"),
    customerId:customer.id,
    loanType,
    requiredAmount:enquiry.requiredAmount==null?0:Number(enquiry.requiredAmount),
    financeCompany:enquiry.financeCompany||undefined,
    notes:[enquiry.notes,"Created from finance enquiry "+enquiry.enquiryId].filter(Boolean).join("\\n"),
    status:"ENTERED",
    applicationDate:enquiry.createdAt||new Date()
   }});
   linkedEnquiryIds.add(String(enquiry.enquiryId));
  }
 }catch(error){
  console.error("Finance enquiry to loan sync failed:",error);
 }
}

export async function listLoans(req:Request,res:Response){
 await syncFinanceEnquiriesToLoans();
 const status=req.query.status?String(req.query.status):undefined;
 const customerRef=req.query.customerId?String(req.query.customerId).trim():undefined;
 const search=String(req.query.search??"").trim();

 const where:any={};
 if(status)where.status=status;
 if(customerRef){
  const resolved=await resolveCustomerId(customerRef);
  if(!resolved)return res.json({success:true,data:[]});
  where.customerId=resolved;
 }
 if(search){
  where.OR=[
   {loanId:{contains:search,mode:"insensitive"}},
   {financeCompany:{contains:search,mode:"insensitive"}},
   {loanType:{contains:search,mode:"insensitive"}},
   {customer:{name:{contains:search,mode:"insensitive"}}},
   {customer:{mobile:{contains:search,mode:"insensitive"}}},
   {customer:{customerId:{contains:search,mode:"insensitive"}}}
  ];
 }

 const rows=await prisma.loan.findMany({
  where,
  orderBy:{createdAt:"desc"},
  include:{
   customer:{select:{id:true,customerId:true,name:true,mobile:true,email:true,city:true,occupation:true}},
   assignee:{select:{id:true,name:true,email:true,role:true}}
  }
 });

 const data=rows.map((row:any)=>({
  ...row,
  _id:row.id,
  customerId:row.customer?{...row.customer,_id:row.customer.id}:row.customerId,
  assignedTo:row.assignee?{...row.assignee,_id:row.assignee.id}:row.assignedTo
 }));

 return res.json({success:true,data});
}
export async function getLoan(req:Request,res:Response){
 const loanId=await resolveLoanId(req.params.id);
 if(!loanId)return res.status(404).json({success:false,message:"Loan not found."});
 const loan=await Loan.findById(loanId).populate("customerId","customerId name mobile email city occupation").populate("assignedTo","name email role");
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 const followUps=await LoanFollowUp.find({loanId:loan._id}).populate("createdBy","name").sort({followUpDate:-1,createdAt:-1});
 res.json({success:true,data:{loan,followUps}});
}
export async function createLoan(req:Request,res:Response){
 const customerId=await resolveCustomerId(req.body.customerId);
 const customer=customerId?await Customer.findById(customerId):null;
 if(!customer)return res.status(400).json({success:false,message:"Customer not found."});
 const allowed=["loanType","requiredAmount","financeCompany","notes"];
 if(req.user?.role==="ADMIN") allowed.push("approvedAmount","commission","applicationDate","expectedDisbursementDate","disbursementDate","rejectionReason","assignedTo");
 const data:any={loanId:await nextId("LOAN","loan"),status:"ENTERED"};
 data.customerId=customer._id;
 for(const key of allowed) if(req.body[key]!==undefined) data[key]=req.body[key];
 if(!data.loanType||!Number.isFinite(Number(data.requiredAmount))||Number(data.requiredAmount)<0)return res.status(400).json({success:false,message:"Loan type and a valid required amount are required."});
 data.requiredAmount=Number(data.requiredAmount);
 if(data.commission!==undefined){
  data.commission=Number(data.commission);
  if(!Number.isFinite(data.commission)||data.commission<0)return res.status(400).json({success:false,message:"Commission must be a valid non-negative number."});
 }
 for(const key of ["applicationDate","expectedDisbursementDate","disbursementDate"]){
  if(data[key]!==undefined){
   if(String(data[key]).trim()==="")delete data[key];
   else{
    const date=new Date(data[key]);
    if(Number.isNaN(date.getTime()))return res.status(400).json({success:false,message:key+" must be a valid date."});
    data[key]=date;
   }
  }
 }
 if(data.assignedTo!==undefined){
  if(data.assignedTo==="")data.assignedTo=null;
  else{
   const assigneeId=await resolveUserId(data.assignedTo);
   const assignee=assigneeId?await User.findById(assigneeId).select("_id"):null;
   if(!assignee)return res.status(400).json({success:false,message:"Assigned user not found."});
   data.assignedTo=assignee._id;
  }
 }
 const loan=await Loan.create(data);
 res.status(201).json({success:true,data:await loan.populate("customerId","customerId name mobile email city")});
}
export async function updateLoan(req:Request,res:Response){
 const loanId=await resolveLoanId(req.params.id);
 if(!loanId)return res.status(404).json({success:false,message:"Loan not found."});
 const loan=await Loan.findById(loanId);
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});

 const isAdmin=req.user?.role==="ADMIN";
 const allowed=isAdmin
  ?["customerId","loanType","requiredAmount","approvedAmount","financeCompany","status","applicationDate","expectedDisbursementDate","disbursementDate","commission","rejectionReason","notes","assignedTo"]
  :["customerId","loanType","requiredAmount","financeCompany","status","applicationDate","expectedDisbursementDate","notes"];

 if(!isAdmin){
  const forbidden=ADMIN_ONLY_LOAN_FIELDS.filter(key=>req.body?.[key]!==undefined);
  if(forbidden.length)return res.status(403).json({success:false,message:"Only ADMIN can update: "+forbidden.join(", ")+"."});
 }

 const patch:any={};
 for(const key of allowed) if(req.body[key]!==undefined)patch[key]=req.body[key];

 if(patch.customerId!==undefined){
  const customerId=await resolveCustomerId(patch.customerId);
  const customer=customerId?await Customer.findById(customerId):null;
  if(!customer)return res.status(400).json({success:false,message:"Customer not found."});
  patch.customerId=customer._id;
 }

 for(const key of ["applicationDate","expectedDisbursementDate","disbursementDate"]){
  if(patch[key]!==undefined){
   if(String(patch[key]).trim()===""){
    if(key==="disbursementDate"&&isAdmin)patch[key]=new Date();
    else delete patch[key];
   }else{
    const date=new Date(patch[key]);
    if(Number.isNaN(date.getTime()))return res.status(400).json({success:false,message:key+" must be a valid date."});
    patch[key]=date;
   }
  }
 }

 if(patch.assignedTo!==undefined){
  if(patch.assignedTo==="")patch.assignedTo=null;
  else{
   const assigneeId=await resolveUserId(patch.assignedTo);
   const assignee=assigneeId?await User.findById(assigneeId):null;
   if(!assignee)return res.status(400).json({success:false,message:"Assigned user not found."});
   patch.assignedTo=assignee._id;
  }
 }

 if(patch.requiredAmount!==undefined){
  patch.requiredAmount=Number(patch.requiredAmount);
  if(!Number.isFinite(patch.requiredAmount)||patch.requiredAmount<0)return res.status(400).json({success:false,message:"Required amount must be a valid non-negative number."});
 }
 if(patch.approvedAmount!==undefined){
  patch.approvedAmount=Number(patch.approvedAmount);
  if(!Number.isFinite(patch.approvedAmount)||patch.approvedAmount<0)return res.status(400).json({success:false,message:"Approved amount must be a valid non-negative number."});
 }
 if(patch.commission!==undefined){
  patch.commission=Number(patch.commission);
  if(!Number.isFinite(patch.commission)||patch.commission<0)return res.status(400).json({success:false,message:"Commission must be a valid non-negative number."});
 }

 if(patch.status!==undefined){
  const status=String(patch.status);
  if(!LOAN_STATUSES.includes(status as any))return res.status(400).json({success:false,message:"Invalid loan status."});
  if(!isAdmin&&!STAFF_LOAN_STATUSES.has(status)){
   return res.status(403).json({success:false,message:"Only ADMIN can move a loan to "+status+"."});
  }

  const approvedAmount=patch.approvedAmount!==undefined?patch.approvedAmount:Number(loan.approvedAmount||0);
  if(status==="APPROVED"&&(!Number.isFinite(approvedAmount)||approvedAmount<=0)){
   return res.status(400).json({success:false,message:"Approved amount must be set before a loan can be approved."});
  }
  if(status==="DISBURSED"){
   if(!isAdmin)return res.status(403).json({success:false,message:"Only ADMIN can mark a loan as DISBURSED."});
   if(!Number.isFinite(approvedAmount)||approvedAmount<=0)return res.status(400).json({success:false,message:"An approved amount is required before disbursement."});
   if(patch.disbursementDate===undefined)patch.disbursementDate=new Date();
  }
  if(status==="REJECTED"){
   if(!isAdmin)return res.status(403).json({success:false,message:"Only ADMIN can reject a loan."});
   const reason=String(patch.rejectionReason??loan.rejectionReason??"").trim();
   if(!reason)return res.status(400).json({success:false,message:"Rejection reason is required when rejecting a loan."});
   patch.rejectionReason=reason;
  }
  if(status==="CLOSED"){
   if(!isAdmin)return res.status(403).json({success:false,message:"Only ADMIN can close a loan."});
   if(!["DISBURSED","CLOSED"].includes(String(loan.status))){
    return res.status(400).json({success:false,message:"A loan can be CLOSED only after it is DISBURSED."});
   }
  }
 }

 if(!Object.keys(patch).length)return res.status(400).json({success:false,message:"No loan fields were provided to update."});
 const updated=await Loan.findByIdAndUpdate(loanId,{$set:patch},{new:true,runValidators:true});
 if(!updated)return res.status(404).json({success:false,message:"Loan not found."});
 const populated=await Loan.findById(updated._id).populate("customerId","customerId name mobile email city occupation").populate("assignedTo","name email role");
 return res.json({success:true,data:populated});
}

export async function updateLoanStatus(req:Request,res:Response){
 req.body={
  status:req.body?.status,
  approvedAmount:req.body?.approvedAmount,
  disbursementDate:req.body?.disbursementDate,
  rejectionReason:req.body?.rejectionReason
 };
 return updateLoan(req,res);
}
export async function listFollowUps(req:Request,res:Response){
 const filter:any={}; if(req.params.id){const loanId=await resolveLoanId(req.params.id);if(!loanId)return res.status(404).json({success:false,message:"Loan not found."});filter.loanId=loanId;} if(req.query.status)filter.status=String(req.query.status);
 const rows=await LoanFollowUp.find(filter).populate({path:"loanId",populate:{path:"customerId",select:"customerId name mobile"}}).populate("createdBy","name").sort({followUpDate:1});
 const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate()),tomorrow=new Date(start); tomorrow.setDate(tomorrow.getDate()+1);
 const nextWeek=new Date(start); nextWeek.setDate(nextWeek.getDate()+7);
 const open=rows.filter(x=>x.status==="OPEN"),overdue=open.filter(x=>x.followUpDate<start),dueToday=open.filter(x=>x.followUpDate>=start&&x.followUpDate<tomorrow),upcoming=open.filter(x=>x.followUpDate>=tomorrow&&x.followUpDate<nextWeek);
 res.json({success:true,data:rows,summary:{open:open.length,overdue:overdue.length,dueToday:dueToday.length,upcoming:upcoming.length}});
}
export async function createFollowUp(req:Request,res:Response){
 const loanId=await resolveLoanId(req.params.id);
 if(!loanId)return res.status(404).json({success:false,message:"Loan not found."});
 const loan=await Loan.findById(loanId);
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 const note=String(req.body.note??"").trim();
 const date=new Date(req.body.followUpDate);
 if(!note||!req.body.followUpDate)return res.status(400).json({success:false,message:"Follow-up date and note are required."});
 if(Number.isNaN(date.getTime()))return res.status(400).json({success:false,message:"Follow-up date must be valid."});
 const followUp=await LoanFollowUp.create({followUpDate:date,note,status:"OPEN",loanId:loan._id,createdBy:req.user?.id});
 res.status(201).json({success:true,data:await followUp.populate("createdBy","name")});
}
export async function updateFollowUp(req:Request,res:Response){
 const followUp=await LoanFollowUp.findById(req.params.followUpId);
 if(!followUp)return res.status(404).json({success:false,message:"Follow-up not found."});
 const loanId=await resolveLoanId(req.params.id);
 if(!loanId)return res.status(404).json({success:false,message:"Loan not found."});
 if(String(followUp.loanId)!==String(loanId))return res.status(400).json({success:false,message:"Follow-up does not belong to this loan."});

 const patch:any={};
 if(req.body.status!==undefined){
  const status=String(req.body.status);
  if(!["OPEN","COMPLETED","CANCELLED"].includes(status))return res.status(400).json({success:false,message:"Invalid follow-up status."});
  patch.status=status;
 }
 if(req.body.nextFollowUpDate!==undefined){
  if(String(req.body.nextFollowUpDate).trim()==="")patch.nextFollowUpDate=null;
  else{
   const nextDate=new Date(req.body.nextFollowUpDate);
   if(Number.isNaN(nextDate.getTime()))return res.status(400).json({success:false,message:"Next follow-up date must be valid."});
   patch.nextFollowUpDate=nextDate;
  }
 }

 if(patch.status==="COMPLETED"&&req.body.nextFollowUpDate){
  const note=String(req.body.nextNote??"").trim();
  if(!note)return res.status(400).json({success:false,message:"Next follow-up note is required when scheduling the next follow-up."});
  const nextDate=new Date(req.body.nextFollowUpDate);
  if(Number.isNaN(nextDate.getTime()))return res.status(400).json({success:false,message:"Next follow-up date must be valid."});
  const next=await LoanFollowUp.create({loanId:followUp.loanId,followUpDate:nextDate,note,status:"OPEN",createdBy:req.user?.id});
  patch.nextFollowUpDate=nextDate;
  const updated=await LoanFollowUp.findByIdAndUpdate(followUp._id,{$set:patch},{new:true,runValidators:true});
  const populated=updated?await LoanFollowUp.findById(updated._id).populate("createdBy","name"):null;
  return res.json({success:true,data:populated,nextFollowUp:await next.populate("createdBy","name")});
 }

 if(!Object.keys(patch).length)return res.status(400).json({success:false,message:"No follow-up fields were provided to update."});
 const updated=await LoanFollowUp.findByIdAndUpdate(followUp._id,{$set:patch},{new:true,runValidators:true});
 const populated=updated?await LoanFollowUp.findById(updated._id).populate("createdBy","name"):null;
 res.json({success:true,data:populated});
}

export async function deleteLoan(req:Request,res:Response){
 const loanId=await resolveLoanId(req.params.id);
 if(!loanId)return res.status(404).json({success:false,message:"Loan not found."});
 const loan=await Loan.findById(loanId);
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 await LoanFollowUp.deleteMany({loanId:loan._id});
 await loan.deleteOne();
 res.json({success:true,message:"Loan deleted successfully."});
}

export async function deleteFollowUp(req:Request,res:Response){
 const followUp=await LoanFollowUp.findById(req.params.followUpId);
 if(!followUp)return res.status(404).json({success:false,message:"Follow-up not found."});
 const loanId=await resolveLoanId(req.params.id);
 if(!loanId)return res.status(404).json({success:false,message:"Loan not found."});
 if(String(followUp.loanId)!==String(loanId))return res.status(400).json({success:false,message:"Follow-up does not belong to this loan."});
 await followUp.deleteOne();
 res.json({success:true,message:"Follow-up deleted successfully."});
}
