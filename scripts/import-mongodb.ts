import "dotenv/config";
import { MongoClient } from "mongodb";
import { prisma } from "../src/config/db";
import { createHash } from "crypto";

const mongoUri=process.env.MONGODB_URI?.trim();
if(!mongoUri)throw new Error("MONGODB_URI is required only while running the MongoDB import.");
const mongoDbName=process.env.MONGODB_DATABASE?.trim();

function idOf(v:any){return String(v?._id??v);}
function dateOf(v:any, fallback=new Date()){const d=v?new Date(v):fallback;return Number.isNaN(d.getTime())?fallback:d;}
function stableId(value:string){return createHash("sha256").update(value).digest("hex").slice(0,24);}
function jsonDoc(value:any){
 if(!value||typeof value!=="object")return {};
 const clone=JSON.parse(JSON.stringify(value,(_k,x)=>x instanceof Date?x.toISOString():x));
 return clone;
}
function num(v:any, fallback=0){const n=Number(v);return Number.isFinite(n)?n:fallback;}
const failures:{collection:string,id:string,error:string}[]=[];
async function attempt(collection:string,id:string,fn:()=>Promise<void>){try{await fn();}catch(error:any){failures.push({collection,id,error:error?.message||String(error)});}}

async function importAll(){
 const client=new MongoClient(mongoUri!,{serverSelectionTimeoutMS:10000});
 await client.connect();const db=mongoDbName?client.db(mongoDbName):client.db();
 console.log("Connected to MongoDB source:",db.databaseName);

 const users=await db.collection("users").find({}).toArray();
 for(const x of users)await attempt("users",idOf(x),async()=>prisma.user.upsert({where:{id:idOf(x)},update:{name:String(x.name||""),email:String(x.email||"").toLowerCase(),passwordHash:String(x.passwordHash||""),role:x.role==="ADMIN"?"ADMIN":"STAFF",isActive:x.isActive!==false,createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)},create:{id:idOf(x),name:String(x.name||""),email:String(x.email||"").toLowerCase(),passwordHash:String(x.passwordHash||""),role:x.role==="ADMIN"?"ADMIN":"STAFF",isActive:x.isActive!==false,createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)}}));

 const customers=await db.collection("customers").find({}).toArray();
 for(const x of customers)await attempt("customers",idOf(x),async()=>prisma.customer.upsert({where:{id:idOf(x)},update:{customerId:String(x.customerId),name:String(x.name||""),mobile:String(x.mobile||""),alternateMobile:x.alternateMobile,email:x.email,address:x.address,city:x.city,occupation:x.occupation,pan:x.pan,aadhaarLast4:x.aadhaarLast4,notes:x.notes,createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)},create:{id:idOf(x),customerId:String(x.customerId),name:String(x.name||""),mobile:String(x.mobile||""),alternateMobile:x.alternateMobile,email:x.email,address:x.address,city:x.city,occupation:x.occupation,pan:x.pan,aadhaarLast4:x.aadhaarLast4,notes:x.notes,createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)}}));

 const services=await db.collection("financeservices").find({}).toArray();
 for(const x of services)await attempt("financeservices",idOf(x),async()=>prisma.financeService.upsert({where:{id:idOf(x)},update:{code:String(x.code),name:String(x.name||""),category:["DSA","DSA_PRODUCT","SERVICE"].includes(String(x.category))?x.category:"SERVICE",parentCode:x.parentCode,description:x.description,active:x.active!==false,sortOrder:num(x.sortOrder),createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)},create:{id:idOf(x),code:String(x.code),name:String(x.name||""),category:["DSA","DSA_PRODUCT","SERVICE"].includes(String(x.category))?x.category:"SERVICE",parentCode:x.parentCode,description:x.description,active:x.active!==false,sortOrder:num(x.sortOrder),createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)}}));

 const cars=await db.collection("cars").find({}).toArray();
 for(const x of cars)await attempt("cars",idOf(x),async()=>prisma.car.upsert({where:{id:idOf(x)},update:{vehicleId:String(x.vehicleId),sellerId:idOf(x.sellerId),registrationNumber:String(x.registrationNumber||"").toUpperCase(),make:String(x.make||""),model:String(x.model||""),year:x.year==null?null:num(x.year),ownerNumber:x.ownerNumber==null?null:num(x.ownerNumber),km:x.km==null?null:num(x.km),fuel:x.fuel,purchasePrice:num(x.purchasePrice),status:["AVAILABLE","RESERVED","SOLD"].includes(String(x.status))?x.status:"AVAILABLE",purchaseDate:dateOf(x.purchaseDate),notes:x.notes,documents:jsonDoc(x.documents),createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)},create:{id:idOf(x),vehicleId:String(x.vehicleId),sellerId:idOf(x.sellerId),registrationNumber:String(x.registrationNumber||"").toUpperCase(),make:String(x.make||""),model:String(x.model||""),year:x.year==null?null:num(x.year),ownerNumber:x.ownerNumber==null?null:num(x.ownerNumber),km:x.km==null?null:num(x.km),fuel:x.fuel,purchasePrice:num(x.purchasePrice),status:["AVAILABLE","RESERVED","SOLD"].includes(String(x.status))?x.status:"AVAILABLE",purchaseDate:dateOf(x.purchaseDate),notes:x.notes,documents:jsonDoc(x.documents),createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)}}));

 const expenses=await db.collection("carexpenses").find({}).toArray();
 for(const x of expenses)await attempt("carexpenses",idOf(x),async()=>prisma.carExpense.upsert({where:{id:idOf(x)},update:{carId:idOf(x.carId),category:String(x.category||""),amount:num(x.amount),description:x.description,date:dateOf(x.date),createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)},create:{id:idOf(x),carId:idOf(x.carId),category:String(x.category||""),amount:num(x.amount),description:x.description,date:dateOf(x.date),createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)}}));

 const loans=await db.collection("loans").find({}).toArray();
 for(const x of loans)await attempt("loans",idOf(x),async()=>prisma.loan.upsert({where:{id:idOf(x)},update:{loanId:String(x.loanId),customerId:idOf(x.customerId),loanType:String(x.loanType||""),requiredAmount:num(x.requiredAmount),approvedAmount:x.approvedAmount==null?null:num(x.approvedAmount),financeCompany:x.financeCompany,status:["ENTERED","DOCUMENTS_PENDING","SUBMITTED","UNDER_REVIEW","APPROVED","REJECTED","DISBURSED","CLOSED"].includes(String(x.status))?x.status:"ENTERED",applicationDate:dateOf(x.applicationDate),expectedDisbursementDate:x.expectedDisbursementDate?dateOf(x.expectedDisbursementDate):null,disbursementDate:x.disbursementDate?dateOf(x.disbursementDate):null,commission:num(x.commission),rejectionReason:x.rejectionReason,notes:x.notes,assignedToId:x.assignedTo?idOf(x.assignedTo):null,documents:jsonDoc(x.documents),createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)},create:{id:idOf(x),loanId:String(x.loanId),customerId:idOf(x.customerId),loanType:String(x.loanType||""),requiredAmount:num(x.requiredAmount),approvedAmount:x.approvedAmount==null?null:num(x.approvedAmount),financeCompany:x.financeCompany,status:["ENTERED","DOCUMENTS_PENDING","SUBMITTED","UNDER_REVIEW","APPROVED","REJECTED","DISBURSED","CLOSED"].includes(String(x.status))?x.status:"ENTERED",applicationDate:dateOf(x.applicationDate),expectedDisbursementDate:x.expectedDisbursementDate?dateOf(x.expectedDisbursementDate):null,disbursementDate:x.disbursementDate?dateOf(x.disbursementDate):null,commission:num(x.commission),rejectionReason:x.rejectionReason,notes:x.notes,assignedToId:x.assignedTo?idOf(x.assignedTo):null,documents:jsonDoc(x.documents),createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)}}));

 const followups=await db.collection("loanfollowups").find({}).toArray();
 for(const x of followups)await attempt("loanfollowups",idOf(x),async()=>prisma.loanFollowUp.upsert({where:{id:idOf(x)},update:{loanId:idOf(x.loanId),followUpDate:dateOf(x.followUpDate),nextFollowUpDate:x.nextFollowUpDate?dateOf(x.nextFollowUpDate):null,note:String(x.note||""),status:["OPEN","COMPLETED","CANCELLED"].includes(String(x.status))?x.status:"OPEN",createdById:x.createdBy?idOf(x.createdBy):null,createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)},create:{id:idOf(x),loanId:idOf(x.loanId),followUpDate:dateOf(x.followUpDate),nextFollowUpDate:x.nextFollowUpDate?dateOf(x.nextFollowUpDate):null,note:String(x.note||""),status:["OPEN","COMPLETED","CANCELLED"].includes(String(x.status))?x.status:"OPEN",createdById:x.createdBy?idOf(x.createdBy):null,createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)}}));

 const sales=await db.collection("carsales").find({}).toArray();
 for(const x of sales)await attempt("carsales",idOf(x),async()=>prisma.carSale.upsert({where:{id:idOf(x)},update:{saleId:String(x.saleId),carId:idOf(x.carId),buyerId:idOf(x.buyerId),sellingPrice:num(x.sellingPrice),sellingExpenses:num(x.sellingExpenses),totalInvestment:num(x.totalInvestment),profit:num(x.profit),saleDate:dateOf(x.saleDate),notes:x.notes,documents:jsonDoc(x.documents),createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)},create:{id:idOf(x),saleId:String(x.saleId),carId:idOf(x.carId),buyerId:idOf(x.buyerId),sellingPrice:num(x.sellingPrice),sellingExpenses:num(x.sellingExpenses),totalInvestment:num(x.totalInvestment),profit:num(x.profit),saleDate:dateOf(x.saleDate),notes:x.notes,documents:jsonDoc(x.documents),createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)}}));

 const enquiries=await db.collection("financeenquiries").find({}).toArray();
 for(const x of enquiries)await attempt("financeenquiries",idOf(x),async()=>prisma.financeEnquiry.upsert({where:{id:idOf(x)},update:{enquiryId:String(x.enquiryId),customerId:idOf(x.customerId),serviceCode:String(x.serviceCode),financeCompany:x.financeCompany,requiredAmount:x.requiredAmount==null?null:num(x.requiredAmount),status:["NEW","IN_PROGRESS","COMPLETED","CANCELLED"].includes(String(x.status))?x.status:"NEW",followUpDate:x.followUpDate?dateOf(x.followUpDate):null,notes:x.notes,assignedToId:x.assignedTo?idOf(x.assignedTo):null,createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)},create:{id:idOf(x),enquiryId:String(x.enquiryId),customerId:idOf(x.customerId),serviceCode:String(x.serviceCode),financeCompany:x.financeCompany,requiredAmount:x.requiredAmount==null?null:num(x.requiredAmount),status:["NEW","IN_PROGRESS","COMPLETED","CANCELLED"].includes(String(x.status))?x.status:"NEW",followUpDate:x.followUpDate?dateOf(x.followUpDate):null,notes:x.notes,assignedToId:x.assignedTo?idOf(x.assignedTo):null,createdAt:dateOf(x.createdAt),updatedAt:dateOf(x.updatedAt)}}));

 const counters=await db.collection("counters").find({}).toArray();
 for(const c of counters)await prisma.sequence.upsert({where:{name:String(c.name)},update:{value:num(c.value)},create:{name:String(c.name),value:num(c.value)}});

 const docSets=[
  {collection:"cars",sourceType:"Car Buying",rows:cars,field:"documents",recordId:(x:any)=>idOf(x),url:(x:any,k:string)=>"/cars/"+idOf(x)+"/documents/"+k+"/download"},
  {collection:"loans",sourceType:"Loan",rows:loans,field:"documents",recordId:(x:any)=>idOf(x),url:(x:any,k:string)=>"/loans/"+idOf(x)+"/documents/"+k+"/download"},
  {collection:"carsales",sourceType:"Car Sold",rows:sales,field:"documents",recordId:(x:any)=>idOf(x),url:(x:any,k:string)=>"/cars/"+idOf(x.carId)+"/sale/documents/"+k+"/download"}
 ];
 for(const set of docSets)for(const row of set.rows){const d:any=row[set.field]||{};const fixed=Object.keys(d.uploads||{});for(const key of fixed){const m=d.uploads[key];if(!m?.storedName)continue;await prisma.document.upsert({where:{id:stableId(set.sourceType+":"+set.recordId(row)+":"+key+":"+m.storedName)},update:{name:key,originalName:m.originalName||key,fileSize:m.size,fileUrl:set.url(row,key),storageKey:m.storedName,uploadedAt:dateOf(m.uploadedAt)},create:{id:stableId(set.sourceType+":"+set.recordId(row)+":"+key+":"+m.storedName),sourceType:set.sourceType,recordId:set.recordId(row),name:key,originalName:m.originalName||key,fileSize:m.size,fileUrl:set.url(row,key),storageKey:m.storedName,uploadedAt:dateOf(m.uploadedAt)}});}
 for(const set of docSets)for(const row of set.rows){const d:any=row[set.field]||{};for(const m of Array.isArray(d.customUploads)?d.customUploads:[]){if(!m?.storedName)continue;const key=String(m.name||"custom");await prisma.document.upsert({where:{id:stableId(set.sourceType+":"+set.recordId(row)+":custom:"+key+":"+m.storedName)},update:{name:key,originalName:m.originalName||key,fileSize:m.size,fileUrl:set.url(row,"custom"),storageKey:m.storedName,uploadedAt:dateOf(m.uploadedAt)},create:{id:stableId(set.sourceType+":"+set.recordId(row)+":custom:"+key+":"+m.storedName),sourceType:set.sourceType,recordId:set.recordId(row),name:key,originalName:m.originalName||key,fileSize:m.size,fileUrl:set.url(row,"custom"),storageKey:m.storedName,uploadedAt:dateOf(m.uploadedAt)}});}}

 await client.close();console.log("MongoDB import finished.");console.log("Failed records:",failures.length);if(failures.length)console.table(failures);
 if(failures.length)process.exitCode=2;
}
importAll().catch(async e=>{console.error("MongoDB import failed:",e);await prisma.$disconnect();process.exit(1);});