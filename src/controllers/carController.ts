import { Request,Response } from "express";
import fs from "fs";
import path from "path";
import { prisma } from "../config/db";
import { nextId,newDatabaseId } from "../utils/sequence";
import { toLegacy } from "../utils/legacy";

function storedCarDocumentPath(name:string){return path.resolve(process.cwd(),"uploads","cars",name);}
async function removeStored(name?:string){if(!name)return;try{await fs.promises.unlink(storedCarDocumentPath(name));}catch(e:any){if(e?.code!=="ENOENT")console.error("Unable to remove old car document:",e);}}
function cleanCustomNames(input:any){const raw=Array.isArray(input)?input.map((x:any)=>String(x).trim().slice(0,100)).filter(Boolean):[];const seen=new Set<string>();return raw.filter((x:string)=>{const k=x.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});}
function legacyDocs(value:any){return value&&typeof value==="object"?value:{};}

export async function listCars(req:Request,res:Response){
 const status=req.query.status?String(req.query.status):undefined,search=String(req.query.search??"").trim();
 const where:any={};if(status)where.status=status;if(search)where.OR=[{registrationNumber:{contains:search,mode:"insensitive"}},{vehicleId:{contains:search,mode:"insensitive"}},{make:{contains:search,mode:"insensitive"}},{model:{contains:search,mode:"insensitive"}}];
 const cars=await prisma.car.findMany({where,include:{seller:{select:{id:true,customerId:true,name:true,mobile:true}}},orderBy:{createdAt:"desc"}});
 const ids=cars.map(c=>c.id);
 const grouped=ids.length?await prisma.carExpense.groupBy({by:["carId"],where:{carId:{in:ids}},_sum:{amount:true}}):[];
 const map=new Map(grouped.map(x=>[x.carId,Number(x._sum.amount||0)]));
 const data=cars.map(car=>{const expenseTotal=map.get(car.id)||0;return {...car,expenseTotal,totalInvestment:car.purchasePrice+expenseTotal};});
 res.json({success:true,data:toLegacy(data)});
}

export async function createCar(req:Request,res:Response){
 let seller:any=null;
 if(req.body.sellerId){seller=await prisma.customer.findUnique({where:{id:String(req.body.sellerId)}});if(!seller)return res.status(400).json({success:false,message:"Seller/customer not found."});}
 else{
  const s=req.body.seller||{},name=String(s.name??"").trim(),mobile=String(s.mobile??"").trim();
  if(!name||!mobile)return res.status(400).json({success:false,message:"Seller name and mobile are required."});
  seller=await prisma.customer.create({data:{id:newDatabaseId(),customerId:await nextId("CUS","customer"),name,mobile,alternateMobile:s.alternateMobile,email:s.email,address:s.address,city:s.city,occupation:s.occupation,pan:s.pan,aadhaarLast4:s.aadhaarLast4,notes:s.notes}});
 }
 const allowed=["registrationNumber","make","model","year","ownerNumber","km","fuel","purchasePrice","purchaseDate","notes"];
 const data:any={id:newDatabaseId(),vehicleId:await nextId("CAR","car"),sellerId:seller.id,status:"AVAILABLE"};
 for(const key of allowed)if(req.body[key]!==undefined)data[key]=req.body[key];
 if(data.year!==undefined)data.year=Number(data.year);if(data.ownerNumber!==undefined)data.ownerNumber=Number(data.ownerNumber);if(data.km!==undefined)data.km=Number(data.km);if(data.purchasePrice!==undefined)data.purchasePrice=Number(data.purchasePrice);
 if(!data.registrationNumber||!data.make||!data.model||!Number.isFinite(data.purchasePrice)||data.purchasePrice<0)return res.status(400).json({success:false,message:"Vehicle registration, make, model and a valid purchase price are required."});
 if(req.body.documents!==undefined){const d=req.body.documents||{};data.documents={carBook:Boolean(d.carBook),carInsurance:Boolean(d.carInsurance),agreement:Boolean(d.agreement),customDocuments:cleanCustomNames(d.customDocuments)};}
 const car=await prisma.car.create({data,include:{seller:{select:{id:true,customerId:true,name:true,mobile:true,email:true,city:true}}}});
 res.status(201).json({success:true,data:toLegacy({...car,car,seller})});
}

export async function updateCarStatus(req:Request,res:Response){req.body={status:req.body.status};return updateCar(req,res);}

export async function updateCar(req:Request,res:Response){
 const car=await prisma.car.findUnique({where:{id:req.params.id}});
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const patch:any={};
 for(const key of ["sellerId","registrationNumber","make","model","year","ownerNumber","km","fuel","purchasePrice","purchaseDate","notes","status"])if(req.body[key]!==undefined)patch[key]=req.body[key];
 if(patch.sellerId!==undefined){const seller=await prisma.customer.findUnique({where:{id:String(patch.sellerId)}});if(!seller)return res.status(400).json({success:false,message:"Seller/customer not found."});patch.sellerId=seller.id;}
 if(patch.status!==undefined){const status=String(patch.status);if(!["AVAILABLE","RESERVED","SOLD"].includes(status))return res.status(400).json({success:false,message:"Invalid car status."});if(status==="SOLD"&&!await prisma.carSale.findUnique({where:{carId:car.id}}))return res.status(400).json({success:false,message:"A car can be marked SOLD only after a sale is recorded."});}
 for(const key of ["year","ownerNumber","km"])if(patch[key]!==undefined)patch[key]=Number(patch[key]);
 if(patch.purchasePrice!==undefined){patch.purchasePrice=Number(patch.purchasePrice);if(!Number.isFinite(patch.purchasePrice)||patch.purchasePrice<0)return res.status(400).json({success:false,message:"Purchase price must be a valid non-negative number."});}
 const updated=await prisma.car.update({where:{id:car.id},data:patch,include:{seller:{select:{id:true,customerId:true,name:true,mobile:true,email:true,city:true}}}});
 res.json({success:true,data:toLegacy(updated)});
}

export async function updateCarDocuments(req:Request,res:Response){
 const car=await prisma.car.findUnique({where:{id:req.params.id}});
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const current:any=legacyDocs(car.documents),next:any={carBook:Boolean(req.body?.carBook),carInsurance:Boolean(req.body?.carInsurance),agreement:Boolean(req.body?.agreement),customDocuments:cleanCustomNames(req.body?.customDocuments),uploads:current.uploads||{},customUploads:Array.isArray(current.customUploads)?current.customUploads:[]};
 for(const key of ["carBook","carInsurance","agreement"])if(!next[key]&&next.uploads?.[key]){await removeStored(next.uploads[key].storedName);delete next.uploads[key];}
 const names=new Set(next.customDocuments.map((x:string)=>x.toLowerCase()));
 const oldUploads=next.customUploads;next.customUploads=oldUploads.filter((x:any)=>names.has(String(x.name).toLowerCase()));
 await Promise.all(oldUploads.filter((x:any)=>!names.has(String(x.name).toLowerCase())).map((x:any)=>removeStored(x.storedName)));
 const updated=await prisma.car.update({where:{id:car.id},data:{documents:next},include:{seller:{select:{id:true,customerId:true,name:true,mobile:true,email:true,city:true}}}});
 res.json({success:true,data:toLegacy(updated)});
}

export async function uploadCarDocument(req:Request,res:Response){
 const car=await prisma.car.findUnique({where:{id:req.params.id}});
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 if(!req.file)return res.status(400).json({success:false,message:"Please select a document to upload."});
 const key=String(req.params.documentKey||""),fixed=["carBook","carInsurance","agreement"],current:any=legacyDocs(car.documents),docs:any={...current,uploads:{...(current.uploads||{})},customUploads:Array.isArray(current.customUploads)?current.customUploads:[],customDocuments:Array.isArray(current.customDocuments)?current.customDocuments:[]};
 const meta={originalName:req.file.originalname,storedName:req.file.filename,size:req.file.size,uploadedAt:new Date().toISOString()};
 let docName:string|undefined;
 if(fixed.includes(key)){await removeStored(docs.uploads[key]?.storedName);docs[key]=true;docs.uploads[key]=meta;}
 else if(key==="custom"){docName=String(req.body.documentName||"").trim().slice(0,100);if(!docName){await removeStored(req.file.filename);return res.status(400).json({success:false,message:"Document name is required for a custom document."});}if(!docs.customDocuments.some((x:string)=>x.toLowerCase()===docName!.toLowerCase()))docs.customDocuments.push(docName);const old=docs.customUploads.find((x:any)=>String(x.name).toLowerCase()===docName!.toLowerCase());await removeStored(old?.storedName);docs.customUploads=docs.customUploads.filter((x:any)=>String(x.name).toLowerCase()!==docName!.toLowerCase());docs.customUploads.push({name:docName,...meta});}
 else {await removeStored(req.file.filename);return res.status(400).json({success:false,message:"Invalid document type."});}
 const updated=await prisma.car.update({where:{id:car.id},data:{documents:docs},include:{seller:{select:{id:true,customerId:true,name:true,mobile:true,email:true,city:true}}}});
 await prisma.document.create({data:{id:newDatabaseId(),sourceType:"Car Buying",recordId:car.id,name:docName||key,originalName:req.file.originalname,fileType:req.file.mimetype,fileSize:req.file.size,fileUrl:"/cars/"+car.id+"/documents/"+key+"/download",storageKey:req.file.filename}});
 res.status(201).json({success:true,message:"Document uploaded successfully.",data:toLegacy(updated)});
}

export async function downloadCarDocument(req:Request,res:Response){
 const car=await prisma.car.findUnique({where:{id:req.params.id}});if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const d:any=legacyDocs(car.documents),key=String(req.params.documentKey||"");let meta:any;
 if(["carBook","carInsurance","agreement"].includes(key))meta=d.uploads?.[key];else if(key==="custom"){const n=String(req.query.documentName||"").trim();meta=(d.customUploads||[]).find((x:any)=>String(x.name).toLowerCase()===n.toLowerCase());}
 if(!meta?.storedName)return res.status(404).json({success:false,message:"Uploaded document not found."});
 const filePath=storedCarDocumentPath(meta.storedName);if(!fs.existsSync(filePath))return res.status(404).json({success:false,message:"Document file is no longer available on the server."});res.download(filePath,meta.originalName);
}

export async function listCarExpenses(req:Request,res:Response){
 const where:any=req.query.carId?{carId:String(req.query.carId)}:{};
 const rows=await prisma.carExpense.findMany({where,include:{car:{select:{id:true,vehicleId:true,registrationNumber:true,make:true,model:true,year:true,purchasePrice:true}}},orderBy:[{date:"desc"},{createdAt:"desc"}]});
 res.json({success:true,data:toLegacy(rows)});
}
export async function addCarExpense(req:Request,res:Response){
 const car=await prisma.car.findUnique({where:{id:req.params.id}});if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const amount=Number(req.body.amount);if(!Number.isFinite(amount)||amount<0)return res.status(400).json({success:false,message:"Expense amount must be a valid positive number."});
 const data:any={id:newDatabaseId(),carId:car.id,amount,category:String(req.body.category||"").trim()};if(req.body.description!==undefined)data.description=String(req.body.description).trim();if(req.body.date!==undefined)data.date=new Date(req.body.date);
 const expense=await prisma.carExpense.create({data});res.status(201).json({success:true,data:toLegacy(expense)});
}
export async function updateCarExpense(req:Request,res:Response){
 const expense=await prisma.carExpense.findUnique({where:{id:req.params.expenseId}});if(!expense)return res.status(404).json({success:false,message:"Expense not found."});
 const data:any={};if(req.body.carId!==undefined){const car=await prisma.car.findUnique({where:{id:String(req.body.carId)}});if(!car)return res.status(400).json({success:false,message:"Vehicle not found."});data.carId=car.id;}
 if(req.body.amount!==undefined){const amount=Number(req.body.amount);if(!Number.isFinite(amount)||amount<0)return res.status(400).json({success:false,message:"Expense amount must be a valid non-negative number."});data.amount=amount;}
 if(req.body.category!==undefined)data.category=String(req.body.category).trim();if(req.body.description!==undefined)data.description=String(req.body.description).trim();if(req.body.date!==undefined)data.date=new Date(req.body.date);
 const updated=await prisma.carExpense.update({where:{id:expense.id},data,include:{car:{select:{id:true,vehicleId:true,registrationNumber:true,make:true,model:true,year:true,purchasePrice:true}}}});
 res.json({success:true,data:toLegacy(updated)});
}
export async function getCarFinancials(req:Request,res:Response){
 const car=await prisma.car.findUnique({where:{id:req.params.id},include:{seller:{select:{id:true,customerId:true,name:true,mobile:true}},expenses:{orderBy:{date:"desc"}}}});
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const expenseTotal=car.expenses.reduce((s,e)=>s+e.amount,0),totalInvestment=car.purchasePrice+expenseTotal;
 const sale=await prisma.carSale.findUnique({where:{carId:car.id},include:{buyer:{select:{id:true,customerId:true,name:true,mobile:true}}}});\n res.json({success:true,data:toLegacy({car,expenses:car.expenses,expenseTotal,totalInvestment,sale,netProfit:sale?sale.profit:null})});
}
export async function sellCar(req:Request,res:Response){
 const car=await prisma.car.findUnique({where:{id:req.params.id}});if(!car)return res.status(404).json({success:false,message:"Car not found."});
 if(car.status==="SOLD")return res.status(409).json({success:false,message:"Car is already sold."});
 const buyer=await prisma.customer.findUnique({where:{id:String(req.body.buyerId)}});if(!buyer)return res.status(400).json({success:false,message:"Buyer/customer not found."});
 if(await prisma.carSale.findUnique({where:{carId:car.id}}))return res.status(409).json({success:false,message:"Sale already exists for this car."});
 const expenses=await prisma.carExpense.findMany({where:{carId:car.id},select:{amount:true}}),expenseTotal=expenses.reduce((s,e)=>s+e.amount,0),totalInvestment=car.purchasePrice+expenseTotal;
 const sellingPrice=Number(req.body.sellingPrice),sellingExpenses=Number(req.body.sellingExpenses??0);if(!Number.isFinite(sellingPrice)||sellingPrice<0)return res.status(400).json({success:false,message:"Selling price must be a valid number."});if(!Number.isFinite(sellingExpenses)||sellingExpenses<0)return res.status(400).json({success:false,message:"Selling expenses must be a valid number."});
 const profit=sellingPrice-totalInvestment-sellingExpenses,saleId=await nextId("SALE","carSale"),documents={idProof:Boolean(req.body.documents?.idProof),agreement:Boolean(req.body.documents?.agreement),customDocuments:cleanCustomNames(req.body.documents?.customDocuments)};
 const result=await prisma.$transaction(async tx=>{const sale=await tx.carSale.create({data:{id:newDatabaseId(),saleId,carId:car.id,buyerId:buyer.id,sellingPrice,sellingExpenses,totalInvestment,profit,saleDate:req.body.saleDate?new Date(req.body.saleDate):new Date(),notes:req.body.notes,documents}});await tx.car.update({where:{id:car.id},data:{status:"SOLD"}});return sale;});
 res.status(201).json({success:true,data:toLegacy(result)});
}
export async function uploadSaleDocument(req:Request,res:Response){
 const sale=await prisma.carSale.findUnique({where:{carId:req.params.id}});if(!sale)return res.status(404).json({success:false,message:"Sale not found. Complete the vehicle sale first."});if(!req.file)return res.status(400).json({success:false,message:"Please select a document to upload."});
 const key=String(req.params.documentKey||""),fixed=["idProof","agreement"],current:any=legacyDocs(sale.documents),docs:any={...current,uploads:{...(current.uploads||{})},customUploads:Array.isArray(current.customUploads)?current.customUploads:[],customDocuments:Array.isArray(current.customDocuments)?current.customDocuments:[]},meta={originalName:req.file.originalname,storedName:req.file.filename,size:req.file.size,uploadedAt:new Date().toISOString()};let docName:string|undefined;
 if(fixed.includes(key)){await removeStored(docs.uploads[key]?.storedName);docs[key]=true;docs.uploads[key]=meta;}
 else if(key==="custom"){docName=String(req.body.documentName||"").trim().slice(0,100);if(!docName){await removeStored(req.file.filename);return res.status(400).json({success:false,message:"Document name is required for a custom document."});}if(!docs.customDocuments.some((x:string)=>x.toLowerCase()===docName!.toLowerCase())){await removeStored(req.file.filename);return res.status(400).json({success:false,message:"Add the custom document name before uploading its file."});}const old=docs.customUploads.find((x:any)=>String(x.name).toLowerCase()===docName!.toLowerCase());await removeStored(old?.storedName);docs.customUploads=docs.customUploads.filter((x:any)=>String(x.name).toLowerCase()!==docName!.toLowerCase());docs.customUploads.push({name:docName,...meta});}
 else{await removeStored(req.file.filename);return res.status(400).json({success:false,message:"Invalid sale document type."});}
 const updated=await prisma.carSale.update({where:{id:sale.id},data:{documents:docs},include:{buyer:{select:{id:true,customerId:true,name:true,mobile:true}}}});
 await prisma.document.create({data:{id:newDatabaseId(),sourceType:"Car Sold",recordId:sale.id,name:docName||key,originalName:req.file.originalname,fileType:req.file.mimetype,fileSize:req.file.size,fileUrl:"/cars/"+req.params.id+"/sale/documents/"+key+"/download",storageKey:req.file.filename}});
 res.status(201).json({success:true,message:"Buyer document uploaded successfully.",data:toLegacy(updated)});
}
export async function downloadSaleDocument(req:Request,res:Response){
 const sale=await prisma.carSale.findUnique({where:{carId:req.params.id}});if(!sale)return res.status(404).json({success:false,message:"Sale not found."});const d:any=legacyDocs(sale.documents),key=String(req.params.documentKey||"");let meta:any;if(["idProof","agreement"].includes(key))meta=d.uploads?.[key];else if(key==="custom"){const n=String(req.query.documentName||"").trim();meta=(d.customUploads||[]).find((x:any)=>String(x.name).toLowerCase()===n.toLowerCase());}if(!meta?.storedName)return res.status(404).json({success:false,message:"Uploaded buyer document not found."});const p=storedCarDocumentPath(meta.storedName);if(!fs.existsSync(p))return res.status(404).json({success:false,message:"Document file is no longer available on the server."});res.download(p,meta.originalName);
}
export async function listCarProfits(_req:Request,res:Response){
 const sales=await prisma.carSale.findMany({include:{car:{select:{id:true,vehicleId:true,registrationNumber:true,make:true,model:true,year:true,purchasePrice:true}},buyer:{select:{id:true,customerId:true,name:true}}},orderBy:{saleDate:"desc"}});
 const summary=sales.reduce((a,s)=>({sales:a.sales+s.sellingPrice,investment:a.investment+s.totalInvestment,sellingExpenses:a.sellingExpenses+s.sellingExpenses,profit:a.profit+s.profit}),{sales:0,investment:0,sellingExpenses:0,profit:0});
 res.json({success:true,data:toLegacy({summary,sales})});
}
export async function deleteCar(req:Request,res:Response){
 const car=await prisma.car.findUnique({where:{id:req.params.id}});if(!car)return res.status(404).json({success:false,message:"Car not found."});if(await prisma.carSale.findUnique({where:{carId:car.id}})||car.status==="SOLD")return res.status(409).json({success:false,message:"Sold vehicles cannot be deleted."});await prisma.car.delete({where:{id:car.id}});res.json({success:true,message:"Vehicle deleted successfully."});
}
export async function deleteCarExpense(req:Request,res:Response){
 const expense=await prisma.carExpense.findUnique({where:{id:req.params.expenseId}});if(!expense)return res.status(404).json({success:false,message:"Expense not found."});if(expense.carId!==req.params.id)return res.status(400).json({success:false,message:"Expense does not belong to this vehicle."});await prisma.carExpense.delete({where:{id:expense.id}});res.json({success:true,message:"Expense deleted successfully."});
}