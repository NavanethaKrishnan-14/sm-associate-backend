import { Request,Response } from "express";
import fs from "fs";
import path from "path";
import { prisma } from "../config/db";
import { nextId,newDatabaseId } from "../utils/sequence";
import { toLegacy } from "../utils/legacy";

export const LOAN_STATUSES=["ENTERED","DOCUMENTS_PENDING","SUBMITTED","UNDER_REVIEW","APPROVED","REJECTED","DISBURSED","CLOSED"] as const;
function storedLoanDocumentPath(name:string){return path.resolve(process.cwd(),"uploads","loans",name);}
async function removeStored(name?:string){if(!name)return;try{await fs.promises.unlink(storedLoanDocumentPath(name));}catch(e:any){if(e?.code!=="ENOENT")console.error("Unable to remove old loan document:",e);}}
function customNames(input:any){const raw=Array.isArray(input)?input.map((x:any)=>String(x).trim().slice(0,100)).filter(Boolean):[];const seen=new Set<string>();return raw.filter((x:string)=>{const k=x.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});}
function docs(value:any){return value&&typeof value==="object"?value:{};}

const customerBrief={id:true,customerId:true,name:true,mobile:true,email:true,city:true};
const assignedBrief={id:true,name:true,email:true,role:true};

export async function listLoans(req:Request,res:Response){
 const status=req.query.status?String(req.query.status):undefined,customerId=req.query.customerId?String(req.query.customerId):undefined,search=req.query.search?String(req.query.search).trim():undefined;
 const where:any={};if(status)where.status=status;if(customerId)where.customerId=customerId;
 if(search){const customers=await prisma.customer.findMany({where:{OR:[{name:{contains:search,mode:"insensitive"}},{mobile:{contains:search,mode:"insensitive"}},{customerId:{contains:search,mode:"insensitive"}}]},select:{id:true}});where.OR=[{loanId:{contains:search,mode:"insensitive"}},{financeCompany:{contains:search,mode:"insensitive"}},{customerId:{in:customers.map(x=>x.id)}}];}
 const rows=await prisma.loan.findMany({where,include:{customer:{select:customerBrief},assignedTo:{select:assignedBrief}},orderBy:{createdAt:"desc"}});
 res.json({success:true,data:toLegacy(rows)});
}
export async function getLoan(req:Request,res:Response){
 const loan=await prisma.loan.findUnique({where:{id:req.params.id},include:{customer:{select:{...customerBrief,occupation:true}},assignedTo:{select:assignedBrief},followUps:{include:{createdBy:{select:{id:true,name:true}}},orderBy:[{followUpDate:"desc"},{createdAt:"desc"}]}}});
 if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 res.json({success:true,data:toLegacy({loan,followUps:loan.followUps})});
}
export async function createLoan(req:Request,res:Response){
 const customer=await prisma.customer.findUnique({where:{id:String(req.body.customerId)}});if(!customer)return res.status(400).json({success:false,message:"Customer not found."});
 const allowed=["customerId","loanType","requiredAmount","financeCompany","notes","documents"];if(req.user?.role==="ADMIN")allowed.push("approvedAmount","commission","applicationDate","expectedDisbursementDate","disbursementDate","rejectionReason","assignedTo");
 const data:any={id:newDatabaseId(),loanId:await nextId("LOAN","loan"),status:"ENTERED"};for(const key of allowed)if(req.body[key]!==undefined)data[key]=req.body[key];
 data.customerId=customer.id;if(data.assignedTo!==undefined){data.assignedToId=String(data.assignedTo||"")||null;delete data.assignedTo;}
 if(data.documents){const d=data.documents||{};data.documents={idProof:Boolean(d.idProof),addressProof:Boolean(d.addressProof),incomeProof:Boolean(d.incomeProof),bankStatement:Boolean(d.bankStatement),customDocuments:customNames(d.customDocuments)};}
 if(!data.loanType||!Number.isFinite(Number(data.requiredAmount))||Number(data.requiredAmount)<0)return res.status(400).json({success:false,message:"Loan type and a valid required amount are required."});
 data.requiredAmount=Number(data.requiredAmount);if(data.approvedAmount!==undefined)data.approvedAmount=Number(data.approvedAmount);if(data.commission!==undefined)data.commission=Number(data.commission);
 if(data.applicationDate)data.applicationDate=new Date(data.applicationDate);if(data.expectedDisbursementDate)data.expectedDisbursementDate=new Date(data.expectedDisbursementDate);if(data.disbursementDate)data.disbursementDate=new Date(data.disbursementDate);
 const loan=await prisma.loan.create({data,include:{customer:{select:customerBrief}}});
 res.status(201).json({success:true,data:toLegacy(loan)});
}
export async function updateLoan(req:Request,res:Response){
 const current=await prisma.loan.findUnique({where:{id:req.params.id}});if(!current)return res.status(404).json({success:false,message:"Loan not found."});
 const patch:any={};for(const key of ["customerId","loanType","requiredAmount","approvedAmount","financeCompany","status","applicationDate","expectedDisbursementDate","disbursementDate","commission","rejectionReason","notes"])if(req.body[key]!==undefined)patch[key]=req.body[key];
 if(patch.customerId!==undefined){const c=await prisma.customer.findUnique({where:{id:String(patch.customerId)}});if(!c)return res.status(400).json({success:false,message:"Customer not found."});patch.customerId=c.id;}
 if(req.body.assignedTo!==undefined){const id=String(req.body.assignedTo||"");if(id){const u=await prisma.user.findUnique({where:{id}});if(!u)return res.status(400).json({success:false,message:"Assigned user not found."});}patch.assignedToId=id||null;}
 for(const key of ["requiredAmount","approvedAmount","commission"])if(patch[key]!==undefined){patch[key]=Number(patch[key]);if(!Number.isFinite(patch[key])||patch[key]<0)return res.status(400).json({success:false,message:key+" must be a valid non-negative number."});}
 if(patch.status!==undefined&&!LOAN_STATUSES.includes(String(patch.status) as any))return res.status(400).json({success:false,message:"Invalid loan status."});
 for(const key of ["applicationDate","expectedDisbursementDate","disbursementDate"])if(patch[key]!==undefined)patch[key]=patch[key]?new Date(patch[key]):null;
 const loan=await prisma.loan.update({where:{id:current.id},data:patch,include:{customer:{select:{...customerBrief,occupation:true}},assignedTo:{select:assignedBrief}}});
 res.json({success:true,data:toLegacy(loan)});
}
export async function updateLoanStatus(req:Request,res:Response){
 const raw=String(req.body.status||""),status=raw==="NEW"?"ENTERED":raw;if(!LOAN_STATUSES.includes(status as any))return res.status(400).json({success:false,message:"Invalid loan status."});
 const patch:any={status};if(status==="APPROVED"&&req.body.approvedAmount!==undefined){if(req.user?.role!=="ADMIN")return res.status(403).json({success:false,message:"Only ADMIN can set an approved loan amount."});patch.approvedAmount=Number(req.body.approvedAmount);if(!Number.isFinite(patch.approvedAmount)||patch.approvedAmount<0)return res.status(400).json({success:false,message:"Approved amount must be a valid non-negative number."});}
 if(status==="DISBURSED")patch.disbursementDate=req.body.disbursementDate?new Date(req.body.disbursementDate):new Date();if(status==="REJECTED")patch.rejectionReason=req.body.rejectionReason||"";
 const loan=await prisma.loan.update({where:{id:req.params.id},data:patch,include:{customer:{select:customerBrief}}}).catch(()=>null);if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 res.json({success:true,data:toLegacy(loan)});
}
export async function updateLoanDocuments(req:Request,res:Response){
 const loan=await prisma.loan.findUnique({where:{id:req.params.id}});if(!loan)return res.status(404).json({success:false,message:"Loan not found."});
 const current:any=docs(loan.documents),names=customNames(req.body?.customDocuments),next:any={idProof:Boolean(req.body?.idProof),addressProof:Boolean(req.body?.addressProof),incomeProof:Boolean(req.body?.incomeProof),bankStatement:Boolean(req.body?.bankStatement),customDocuments:names,uploads:current.uploads||{},customUploads:Array.isArray(current.customUploads)?current.customUploads:[]};
 for(const key of ["idProof","addressProof","incomeProof","bankStatement"])if(!next[key]&&next.uploads?.[key]){await removeStored(next.uploads[key].storedName);delete next.uploads[key];}
 const set=new Set(names.map((x:string)=>x.toLowerCase())),old=next.customUploads;next.customUploads=old.filter((x:any)=>set.has(String(x.name).toLowerCase()));await Promise.all(old.filter((x:any)=>!set.has(String(x.name).toLowerCase())).map((x:any)=>removeStored(x.storedName)));
 const updated=await prisma.loan.update({where:{id:loan.id},data:{documents:next},include:{customer:{select:customerBrief},assignedTo:{select:assignedBrief}}});
 res.json({success:true,data:toLegacy(updated)});
}
export async function uploadLoanDocument(req:Request,res:Response){
 const loan=await prisma.loan.findUnique({where:{id:req.params.id}});if(!loan)return res.status(404).json({success:false,message:"Loan not found."});if(!req.file)return res.status(400).json({success:false,message:"Please select a document to upload."});
 const key=String(req.params.documentKey||""),fixed=["idProof","addressProof","incomeProof","bankStatement"],current:any=docs(loan.documents),next:any={...current,uploads:{...(current.uploads||{})},customUploads:Array.isArray(current.customUploads)?current.customUploads:[],customDocuments:Array.isArray(current.customDocuments)?current.customDocuments:[]},meta={originalName:req.file.originalname,storedName:req.file.filename,size:req.file.size,uploadedAt:new Date().toISOString()};let name:string|undefined;
 if(fixed.includes(key)){await removeStored(next.uploads[key]?.storedName);next[key]=true;next.uploads[key]=meta;}
 else if(key==="custom"){name=String(req.body.documentName||"").trim().slice(0,100);if(!name){await removeStored(req.file.filename);return res.status(400).json({success:false,message:"Document name is required for a custom document."});}if(!next.customDocuments.some((x:string)=>x.toLowerCase()===name!.toLowerCase()))next.customDocuments.push(name);const old=next.customUploads.find((x:any)=>String(x.name).toLowerCase()===name!.toLowerCase());await removeStored(old?.storedName);next.customUploads=next.customUploads.filter((x:any)=>String(x.name).toLowerCase()!==name!.toLowerCase());next.customUploads.push({name,...meta});}
 else{await removeStored(req.file.filename);return res.status(400).json({success:false,message:"Invalid document type."});}
 const updated=await prisma.loan.update({where:{id:loan.id},data:{documents:next},include:{customer:{select:customerBrief},assignedTo:{select:assignedBrief}}});
 await prisma.document.create({data:{id:newDatabaseId(),sourceType:"Loan",recordId:loan.id,name:name||key,originalName:req.file.originalname,fileType:req.file.mimetype,fileSize:req.file.size,fileUrl:"/loans/"+loan.id+"/documents/"+key+"/download",storageKey:req.file.filename}});
 res.status(201).json({success:true,message:"Loan document uploaded successfully.",data:toLegacy(updated)});
}
export async function downloadLoanDocument(req:Request,res:Response){
 const loan=await prisma.loan.findUnique({where:{id:req.params.id}});if(!loan)return res.status(404).json({success:false,message:"Loan not found."});const d:any=docs(loan.documents),key=String(req.params.documentKey||"");let meta:any;if(["idProof","addressProof","incomeProof","bankStatement"].includes(key))meta=d.uploads?.[key];else if(key==="custom"){const n=String(req.query.documentName||"").trim();meta=(d.customUploads||[]).find((x:any)=>String(x.name).toLowerCase()===n.toLowerCase());}if(!meta?.storedName)return res.status(404).json({success:false,message:"Uploaded loan document not found."});const p=storedLoanDocumentPath(meta.storedName);if(!fs.existsSync(p))return res.status(404).json({success:false,message:"Document file is no longer available on the server."});res.download(p,meta.originalName);
}
export async function listFollowUps(req:Request,res:Response){
 const where:any={};if(req.params.id)where.loanId=req.params.id;if(req.query.status)where.status=String(req.query.status);
 const rows=await prisma.loanFollowUp.findMany({where,include:{loan:{include:{customer:{select:{id:true,customerId:true,name:true,mobile:true}}}},createdBy:{select:{id:true,name:true}}},orderBy:{followUpDate:"asc"}});
 const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate()),tomorrow=new Date(start);tomorrow.setDate(tomorrow.getDate()+1),nextWeek=new Date(start);nextWeek.setDate(nextWeek.getDate()+7);
 const open=rows.filter(x=>x.status==="OPEN"),overdue=open.filter(x=>x.followUpDate<start),dueToday=open.filter(x=>x.followUpDate>=start&&x.followUpDate<tomorrow),upcoming=open.filter(x=>x.followUpDate>=tomorrow&&x.followUpDate<nextWeek);
 res.json({success:true,data:toLegacy(rows),summary:{open:open.length,overdue:overdue.length,dueToday:dueToday.length,upcoming:upcoming.length}});
}
export async function createFollowUp(req:Request,res:Response){
 const loan=await prisma.loan.findUnique({where:{id:req.params.id}});if(!loan)return res.status(404).json({success:false,message:"Loan not found."});if(!req.body.note||!req.body.followUpDate)return res.status(400).json({success:false,message:"Follow-up date and note are required."});
 const row=await prisma.loanFollowUp.create({data:{id:newDatabaseId(),loanId:loan.id,followUpDate:new Date(req.body.followUpDate),note:String(req.body.note).trim(),status:"OPEN",createdById:req.user?.id},include:{createdBy:{select:{id:true,name:true}}}});
 res.status(201).json({success:true,data:toLegacy(row)});
}
export async function updateFollowUp(req:Request,res:Response){
 const row=await prisma.loanFollowUp.findUnique({where:{id:req.params.followUpId}});if(!row)return res.status(404).json({success:false,message:"Follow-up not found."});if(row.loanId!==req.params.id)return res.status(400).json({success:false,message:"Follow-up does not belong to this loan."});
 const patch:any={};for(const key of ["status","nextFollowUpDate"])if(req.body[key]!==undefined)patch[key]=req.body[key];if(patch.nextFollowUpDate)patch.nextFollowUpDate=new Date(patch.nextFollowUpDate);
 if(req.body.status==="COMPLETED"&&req.body.nextFollowUpDate){if(!req.body.nextNote||!String(req.body.nextNote).trim())return res.status(400).json({success:false,message:"Next follow-up note is required when scheduling the next follow-up."});const result=await prisma.$transaction(async tx=>{const updated=await tx.loanFollowUp.update({where:{id:row.id},data:patch,include:{createdBy:{select:{id:true,name:true}}}});const next=await tx.loanFollowUp.create({data:{id:newDatabaseId(),loanId:row.loanId,followUpDate:new Date(req.body.nextFollowUpDate),note:String(req.body.nextNote).trim(),status:"OPEN",createdById:req.user?.id},include:{createdBy:{select:{id:true,name:true}}}});return {updated,next};});return res.json({success:true,data:toLegacy(result.updated),nextFollowUp:toLegacy(result.next)});}
 const updated=await prisma.loanFollowUp.update({where:{id:row.id},data:patch,include:{createdBy:{select:{id:true,name:true}}}});res.json({success:true,data:toLegacy(updated)});
}
export async function deleteLoan(req:Request,res:Response){const loan=await prisma.loan.findUnique({where:{id:req.params.id}});if(!loan)return res.status(404).json({success:false,message:"Loan not found."});await prisma.loan.delete({where:{id:loan.id}});res.json({success:true,message:"Loan deleted successfully."});}
export async function deleteFollowUp(req:Request,res:Response){const row=await prisma.loanFollowUp.findUnique({where:{id:req.params.followUpId}});if(!row)return res.status(404).json({success:false,message:"Follow-up not found."});if(row.loanId!==req.params.id)return res.status(400).json({success:false,message:"Follow-up does not belong to this loan."});await prisma.loanFollowUp.delete({where:{id:row.id}});res.json({success:true,message:"Follow-up deleted successfully."});}