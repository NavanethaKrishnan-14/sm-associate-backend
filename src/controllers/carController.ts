import { Request, Response } from "express";
import { prisma } from "../config/db";
import { Car } from "../models/Car";
import { CarExpense } from "../models/CarExpense";
import { CarSale } from "../models/CarSale";
import { Customer } from "../models/Customer";
import { nextId } from "../utils/sequence";
import { resolveCarId, resolveCustomerId } from "../utils/resolveIds";
import { deleteStoredDocument, uploadBufferToPostgres } from "../utils/documentStorage";

export async function updateCarDocuments(req:Request,res:Response){
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Car not found."});
 const car=await Car.findById(carId);
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const input=req.body||{};
 const current:any=(car as any).documents||{};
 const customInput=input.customDocuments!==undefined&&Array.isArray(input.customDocuments)
  ?input.customDocuments.map((name:any)=>String(name).trim().slice(0,100)).filter((name:string)=>name.length>0)
  :((current.customDocuments as string[])||[]);
 const seen=new Set<string>();
 const customDocuments=customInput.filter((name:string)=>{const key=name.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;});
 const next:any={
  carBook:input.carBook!==undefined?Boolean(input.carBook):Boolean(current.carBook),
  carInsurance:input.carInsurance!==undefined?Boolean(input.carInsurance):Boolean(current.carInsurance),
  agreement:input.agreement!==undefined?Boolean(input.agreement):Boolean(current.agreement),
  customDocuments
 };
 next.uploads=current.uploads||{};
 next.customUploads=Array.isArray(current.customUploads)?current.customUploads:[];
 for(const key of ["carBook","carInsurance","agreement"]){
  if(!next[key]&&next.uploads?.[key]){await deleteStoredDocument(next.uploads[key]?.publicId||next.uploads[key]?.storedName,next.uploads[key]?.resourceType);delete next.uploads[key];}
 }
 next.customUploads=next.customUploads.filter((item:any)=>customDocuments.some((name:string)=>name.toLowerCase()===String(item.name).toLowerCase()));
 await Promise.all((Array.isArray(current.customUploads)?current.customUploads:[]).filter((item:any)=>!customDocuments.some((name:string)=>name.toLowerCase()===String(item.name).toLowerCase())).map((item:any)=>deleteStoredDocument(item?.publicId||item?.storedName,item?.resourceType)));
 (car as any).documents=next;
 await car.save();
 const updated=await Car.findById(car._id).populate("sellerId","customerId name mobile email city");
 res.json({success:true,data:updated});
}

export async function uploadCarDocument(req:Request,res:Response){
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Car not found."});
 if(!req.file)return res.status(400).json({success:false,message:"Please select a document to upload."});
 const key=String(req.params.documentKey||"");
 const fixedKeys=["carBook","carInsurance","agreement"];
 if(!fixedKeys.includes(key)&&key!=="custom")return res.status(400).json({success:false,message:"Invalid document type."});
 const documentName=key==="custom"?String(req.body.documentName||"").trim().slice(0,100):"";
 if(key==="custom"&&!documentName)return res.status(400).json({success:false,message:"Document name is required for a custom document."});
 let createdPublicId:string|undefined;
 try{
  const car=await prisma.car.findUnique({where:{id:carId},select:{id:true,vehicleId:true,documents:true}});
  if(!car)return res.status(404).json({success:false,message:"Car not found."});
  const result=await uploadBufferToPostgres(req.file.buffer,req.file.originalname,"sm-associate/cars",`${car.vehicleId||car.id}-${key==="custom"?`custom-${documentName}`:key}`,req.file.mimetype);
  createdPublicId=result.public_id;
  const fileMeta={originalName:req.file.originalname,storedName:result.public_id,publicId:result.public_id,url:result.secure_url,resourceType:result.resource_type,format:result.format,size:req.file.size,uploadedAt:new Date().toISOString()};
  const current:any=car.documents&&typeof car.documents==="object"?car.documents:{};
  const next:any={...current,uploads:{...(current.uploads||{})},customDocuments:Array.isArray(current.customDocuments)?[...current.customDocuments]:[],customUploads:Array.isArray(current.customUploads)?[...current.customUploads]:[]};
  let previous:any=null;
  if(fixedKeys.includes(key)){
   previous=next.uploads[key];
   next[key]=true;
   next.uploads[key]=fileMeta;
  }else{
   previous=next.customUploads.find((item:any)=>String(item.name).toLowerCase()===documentName.toLowerCase());
   if(!next.customDocuments.some((name:string)=>String(name).toLowerCase()===documentName.toLowerCase()))next.customDocuments.push(documentName);
   next.customUploads=next.customUploads.filter((item:any)=>String(item.name).toLowerCase()!==documentName.toLowerCase());
   next.customUploads.push({name:documentName,...fileMeta});
  }
  const updated=await prisma.car.update({where:{id:car.id},data:{documents:next},include:{seller:{select:{id:true,customerId:true,name:true,mobile:true,email:true,city:true}}}});
  if(previous?.publicId||previous?.storedName){
   try{await deleteStoredDocument(previous.publicId||previous.storedName,previous.resourceType);}catch(cleanupError){console.warn("Previous car document cleanup failed:",cleanupError);}
  }
  return res.status(201).json({success:true,message:"Car document uploaded successfully.",data:{...updated,_id:updated.id,sellerId:updated.seller?{...updated.seller,_id:updated.seller.id}:null}});
 }catch(error){
  if(createdPublicId){try{await deleteStoredDocument(createdPublicId,"raw");}catch(cleanupError){console.warn("Failed to clean up incomplete car document upload:",cleanupError);}}
  console.error("Car document upload/save failed:",error);
  const message=error instanceof Error?error.message:String(error||"Unknown document upload error.");
  return res.status(500).json({success:false,message:"Unable to save document.",code:"DOCUMENT_UPLOAD_FAILED",details:process.env.NODE_ENV==="production"?undefined:message});
 }
}

export async function downloadCarDocument(req:Request,res:Response){
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Car not found."});
 const car=await Car.findById(carId);
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const key=String(req.params.documentKey||"");
 const documents:any=(car as any).documents||{};
 let metadata:any;
 if(["carBook","carInsurance","agreement"].includes(key))metadata=documents.uploads?.[key];
 else if(key==="custom"){
  const documentName=String(req.query.documentName||"").trim();
  metadata=(Array.isArray(documents.customUploads)?documents.customUploads:[]).find((item:any)=>String(item.name).toLowerCase()===documentName.toLowerCase());
 }
 if(!metadata?.url)return res.status(404).json({success:false,message:"Uploaded document not found."});
 return res.redirect(metadata.url);
}

export async function getCar(req:Request,res:Response){
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Car not found."});
 const car=await Car.findById(carId).populate("sellerId","customerId name mobile email city occupation");
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const expenses=await CarExpense.find({carId:car._id}).sort({date:-1,createdAt:-1});
 const expenseTotal=expenses.reduce((sum,item)=>sum+Number(item.amount||0),0);
 // The Prisma-backed model adapter returns plain objects for queries.
 const carData=typeof (car as any).toObject==="function"?(car as any).toObject():{...(car as any)};
 return res.json({success:true,data:{...carData,expenseTotal,totalInvestment:Number(car.purchasePrice||0)+expenseTotal}});
}

export async function listCars(req:Request,res:Response){
 const status=req.query.status?String(req.query.status):undefined;
 const search=String(req.query.search??"").trim();
 const where:any={};
 if(status)where.status=status;
 if(search){
  where.OR=[
   {registrationNumber:{contains:search,mode:"insensitive"}},
   {vehicleId:{contains:search,mode:"insensitive"}},
   {make:{contains:search,mode:"insensitive"}},
   {model:{contains:search,mode:"insensitive"}}
  ];
 }

 const cars=await prisma.car.findMany({
  where,
  orderBy:{createdAt:"desc"},
  include:{
   seller:{select:{id:true,customerId:true,name:true,mobile:true,email:true,city:true,occupation:true}},
   expenses:{select:{amount:true}}
  }
 });

 const data=cars.map((row:any)=>{
  const expenseTotal=(row.expenses||[]).reduce((sum:number,item:any)=>sum+Number(item.amount||0),0);
  const {expenses,...car}=row;
  return {
   ...car,
   _id:car.id,
   sellerId:car.seller?{...car.seller,_id:car.seller.id}:car.sellerId,
   expenseTotal,
   totalInvestment:Number(car.purchasePrice||0)+expenseTotal
  };
 });

 return res.json({success:true,data});
}

export async function updateCarStatus(req:Request,res:Response){
 const status=String(req.body.status||"");
 req.body={status};
 return updateCar(req,res);
}

export async function updateCar(req:Request,res:Response){
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Car not found."});
 const car=await prisma.car.findUnique({where:{id:carId}});
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const body=req.body||{};
 const patch:any={};
 if(body.status!==undefined&&req.user?.role!=="ADMIN"){
  return res.status(403).json({success:false,message:"Only ADMIN can change vehicle status."});
 }
 for(const key of ["registrationNumber","make","model","fuel","notes","purchaseDate","status"]){
  if(body[key]!==undefined)patch[key]=body[key];
 }
 if(body.sellerId!==undefined){
  const sellerId=await resolveCustomerId(body.sellerId);
  const seller=sellerId?await prisma.customer.findUnique({where:{id:sellerId}}):null;
  if(!seller)return res.status(400).json({success:false,message:"Seller/customer not found."});
  patch.sellerId=seller.id;
 }
 for(const key of ["year","ownerNumber","km","purchasePrice"]){
  if(body[key]!==undefined&&body[key]!==null&&String(body[key]).trim()!==""){
   const value=Number(body[key]);
   if(!Number.isFinite(value))return res.status(400).json({success:false,message:key+" must be a valid number."});
   patch[key]=value;
  }
 }
 if(patch.year!==undefined&&(patch.year<1900||patch.year>new Date().getFullYear()+1))return res.status(400).json({success:false,message:"Year must be between 1900 and next year."});
 if(patch.ownerNumber!==undefined&&patch.ownerNumber<1)return res.status(400).json({success:false,message:"Owner number must be at least 1."});
 if(patch.km!==undefined&&patch.km<0)return res.status(400).json({success:false,message:"KM cannot be negative."});
 if(patch.purchasePrice!==undefined&&patch.purchasePrice<0)return res.status(400).json({success:false,message:"Purchase price cannot be negative."});
 if(patch.status!==undefined){
  const status=String(patch.status);
  if(!["AVAILABLE","RESERVED","SOLD"].includes(status))return res.status(400).json({success:false,message:"Invalid car status."});
  if(status==="SOLD"){
   const sale=await CarSale.findOne({carId:car.id});
   if(!sale)return res.status(400).json({success:false,message:"A car can be marked SOLD only after a sale is recorded."});
  }
 }
 if(!Object.keys(patch).length)return res.status(400).json({success:false,message:"No vehicle fields were provided to update."});
 const updated=await prisma.car.update({where:{id:car.id},data:patch,include:{seller:{select:{id:true,customerId:true,name:true,mobile:true,email:true,city:true}}}});
 return res.json({success:true,data:{...updated,_id:updated.id,sellerId:updated.seller?{...updated.seller,_id:updated.seller.id}:null}});
}

export async function createCar(req:Request,res:Response){
 let seller:any=null;
 if(req.body.sellerId){
  const sellerId=await resolveCustomerId(req.body.sellerId);
  if(!sellerId)return res.status(400).json({success:false,message:"Seller/customer not found."});
  seller=await Customer.findById(sellerId);
  if(!seller)return res.status(400).json({success:false,message:"Seller/customer not found."});
 }else{
  const sellerInput=req.body.seller||{};
  const sellerName=String(sellerInput.name??"").trim();
  const sellerMobile=String(sellerInput.mobile??"").trim();
  if(!sellerName||!sellerMobile)return res.status(400).json({success:false,message:"Seller name and mobile are required."});
  seller=await Customer.create({
   customerId:await nextId("CUS","customer"),
   name:sellerName,
   mobile:sellerMobile,
   alternateMobile:sellerInput.alternateMobile,
   email:sellerInput.email,
   address:sellerInput.address,
   city:sellerInput.city,
   occupation:sellerInput.occupation,
   pan:sellerInput.pan,
   aadhaarLast4:sellerInput.aadhaarLast4,
   notes:sellerInput.notes
  });
 }
 const data:any={vehicleId:await nextId("CAR","car"),sellerId:seller._id,status:"AVAILABLE"};
 const textFields=["registrationNumber","make","model","fuel","purchaseDate","notes"];
 for(const key of textFields) if(req.body[key]!==undefined) data[key]=req.body[key];
 for(const key of ["year","ownerNumber","km","purchasePrice"]){
  if(req.body[key]!==undefined&&req.body[key]!==null&&String(req.body[key]).trim()!==""){
   const value=Number(req.body[key]);
   if(!Number.isFinite(value))return res.status(400).json({success:false,message:key+" must be a valid number."});
   data[key]=value;
  }
 }
 if(data.year!==undefined&&(data.year<1900||data.year>new Date().getFullYear()+1))return res.status(400).json({success:false,message:"Year must be between 1900 and next year."});
 if(data.ownerNumber!==undefined&&data.ownerNumber<1)return res.status(400).json({success:false,message:"Owner number must be at least 1."});
 if(data.km!==undefined&&data.km<0)return res.status(400).json({success:false,message:"KM cannot be negative."});
 if(!Number.isFinite(Number(data.purchasePrice))||Number(data.purchasePrice)<0)return res.status(400).json({success:false,message:"Purchase price must be a valid non-negative number."});
 if(req.body.documents!==undefined){
  const documents=req.body.documents||{};
  const customDocuments=Array.isArray(documents.customDocuments)?documents.customDocuments.map((name:any)=>String(name).trim().slice(0,100)).filter((name:string)=>name.length>0):[];
  const seen=new Set<string>();
  const uniqueCustomDocuments=customDocuments.filter((name:string)=>{const key=name.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;});
  data.documents={carBook:Boolean(documents.carBook),carInsurance:Boolean(documents.carInsurance),agreement:Boolean(documents.agreement),customDocuments:uniqueCustomDocuments};
 }
 const car=await Car.create(data);

 // Query.populate() in the Prisma-backed compatibility repository returns a
 // plain object, not a Mongoose document. Calling populated.toObject() here
 // throws after the INSERT has committed, so the client sees HTTP 500 even
 // though the vehicle is already saved.
 let populated:any=null;
 try{
  populated=await Car.findById(car._id).populate("sellerId","customerId name mobile email city");
 }catch(error){
  console.error("Vehicle created but relation lookup failed:",error);
 }

 const createdData=typeof (car as any).toObject==="function"
  ?(car as any).toObject()
  :{...(car as any)};
 const populatedData=populated
  ?(typeof populated.toObject==="function"?populated.toObject():{...populated})
  :createdData;
 return res.status(201).json({
  success:true,
  message:"Vehicle created successfully.",
  data:{...populatedData,car:populatedData,seller:seller?{...(typeof seller.toObject==="function"?seller.toObject():seller)}:null}
 });
}
function serializeCarExpense(row:any){
 const car=row?.car||null;
 const expense={...row};
 delete expense.car;
 expense._id=String(row.id);
 expense.carId=car?{...car,_id:String(car.id)}:String(row.carId||"");
 return expense;
}

function parseExpenseDate(value:unknown):Date|null{
 if(value===undefined||value===null||String(value).trim()==="")return null;
 const date=new Date(String(value));
 return Number.isNaN(date.getTime())?null:date;
}

export async function listCarExpenses(req:Request,res:Response){
 const rawCarId=req.query.carId?String(req.query.carId):undefined;
 const resolvedCarId=rawCarId?await resolveCarId(rawCarId):null;
 if(rawCarId&&!resolvedCarId)return res.status(404).json({success:false,message:"Vehicle not found."});
 const rows=await prisma.carExpense.findMany({
  where:resolvedCarId?{carId:resolvedCarId}:undefined,
  include:{car:{select:{id:true,vehicleId:true,registrationNumber:true,make:true,model:true,year:true,purchasePrice:true}}},
  orderBy:[{date:"desc"},{createdAt:"desc"}]
 });
 return res.json({success:true,data:rows.map(serializeCarExpense)});
}

export async function addCarExpense(req:Request,res:Response){
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Vehicle not found."});
 const car=await prisma.car.findUnique({where:{id:carId},select:{id:true}});
 if(!car)return res.status(404).json({success:false,message:"Vehicle not found."});
 const amount=Number(req.body.amount);
 const category=String(req.body.category??"").trim();
 if(!Number.isFinite(amount)||amount<0)return res.status(400).json({success:false,message:"Expense amount must be a valid non-negative number."});
 if(!category)return res.status(400).json({success:false,message:"Expense category is required."});
 const data:any={carId,amount,category};
 if(req.body.description!==undefined)data.description=String(req.body.description).trim()||null;
 if(req.body.date!==undefined&&String(req.body.date).trim()!==""){
  const date=parseExpenseDate(req.body.date);
  if(!date)return res.status(400).json({success:false,message:"Expense date is invalid. Use YYYY-MM-DD."});
  data.date=date;
 }
 const row=await prisma.carExpense.create({
  data,
  include:{car:{select:{id:true,vehicleId:true,registrationNumber:true,make:true,model:true,year:true,purchasePrice:true}}}
 });
 return res.status(201).json({success:true,message:"Vehicle expense saved successfully.",data:serializeCarExpense(row)});
}

export async function updateCarExpense(req:Request,res:Response){
 const expenseId=String(req.params.expenseId||"");
 const existing=await prisma.carExpense.findUnique({where:{id:expenseId}});
 if(!existing)return res.status(404).json({success:false,message:"Expense not found."});
 const data:any={};
 if(req.body.carId!==undefined){
  const resolvedCarId=await resolveCarId(req.body.carId);
  if(!resolvedCarId)return res.status(400).json({success:false,message:"Vehicle not found."});
  data.carId=resolvedCarId;
 }
 if(req.body.amount!==undefined){
  const amount=Number(req.body.amount);
  if(!Number.isFinite(amount)||amount<0)return res.status(400).json({success:false,message:"Expense amount must be a valid non-negative number."});
  data.amount=amount;
 }
 if(req.body.category!==undefined){
  const category=String(req.body.category).trim();
  if(!category)return res.status(400).json({success:false,message:"Expense category is required."});
  data.category=category;
 }
 if(req.body.description!==undefined)data.description=String(req.body.description).trim()||null;
 if(req.body.date!==undefined){
  const date=parseExpenseDate(req.body.date);
  if(!date)return res.status(400).json({success:false,message:"Expense date is invalid. Use YYYY-MM-DD."});
  data.date=date;
 }
 if(!Object.keys(data).length)return res.status(400).json({success:false,message:"No expense fields were provided to update."});
 const row=await prisma.carExpense.update({
  where:{id:expenseId},
  data,
  include:{car:{select:{id:true,vehicleId:true,registrationNumber:true,make:true,model:true,year:true,purchasePrice:true}}}
 });
 return res.json({success:true,message:"Vehicle expense updated successfully.",data:serializeCarExpense(row)});
}

export async function getCarFinancials(req:Request,res:Response){
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Car not found."});
 const car=await Car.findById(carId).populate("sellerId","customerId name mobile");
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const expenses=await CarExpense.find({carId:car._id}).sort({date:-1});
 const expenseTotal=expenses.reduce((sum,item)=>sum+item.amount,0);
 const totalInvestment=car.purchasePrice+expenseTotal;
 const sale=await CarSale.findOne({carId:car._id}).populate("buyerId","customerId name mobile");
 const netProfit=sale?Number(sale.profit):null;
 res.json({success:true,data:{car,expenses,expenseTotal,totalInvestment,sale,netProfit}});
}
export async function sellCar(req:Request,res:Response){
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Car not found."});
 const car=await Car.findById(carId);
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 if(car.status==="SOLD")return res.status(409).json({success:false,message:"Car is already sold."});
 const buyerId=await resolveCustomerId(req.body.buyerId);
 if(!buyerId)return res.status(400).json({success:false,message:"Buyer/customer not found."});
 const buyer=await Customer.findById(buyerId);
 if(!buyer)return res.status(400).json({success:false,message:"Buyer/customer not found."});
 const existingSale=await CarSale.findOne({carId:car._id});
 if(existingSale)return res.status(409).json({success:false,message:"Sale already exists for this car."});
 const expenses=await CarExpense.find({carId:car._id});
 const expenseTotal=expenses.reduce((sum,item)=>sum+item.amount,0);
 const totalInvestment=car.purchasePrice+expenseTotal;
 const sellingPrice=Number(req.body.sellingPrice);
 const sellingExpenses=Number(req.body.sellingExpenses??0);
 if(!Number.isFinite(sellingPrice)||sellingPrice<0)return res.status(400).json({success:false,message:"Selling price must be a valid number."});
 if(!Number.isFinite(sellingExpenses)||sellingExpenses<0)return res.status(400).json({success:false,message:"Selling expenses must be a valid number."});
 const profit=sellingPrice-totalInvestment-sellingExpenses;
 const sale=await CarSale.create({saleId:await nextId("SALE","carSale"),carId:car._id,buyerId:buyer._id,sellingPrice,sellingExpenses,totalInvestment,profit,saleDate:req.body.saleDate??new Date(),notes:req.body.notes,documents:{idProof:Boolean(req.body.documents?.idProof),agreement:Boolean(req.body.documents?.agreement),customDocuments:Array.isArray(req.body.documents?.customDocuments)?req.body.documents.customDocuments:[]}});
 car.status="SOLD"; await car.save();
 res.status(201).json({success:true,data:sale});
}

export async function uploadSaleDocument(req:Request,res:Response){
 const sale=await CarSale.findOne({carId:req.params.id}).select("_id saleId documents");
 if(!sale)return res.status(404).json({success:false,message:"Sale not found. Complete the vehicle sale first."});
 if(!req.file)return res.status(400).json({success:false,message:"Please select a document to upload."});
 const key=String(req.params.documentKey||"");
 const fixedKeys=["idProof","agreement"];
 if(!fixedKeys.includes(key)&&key!=="custom")return res.status(400).json({success:false,message:"Invalid sale document type."});
 const documentName=key==="custom"?String(req.body.documentName||"").trim().slice(0,100):"";
 if(key==="custom"&&!documentName)return res.status(400).json({success:false,message:"Document name is required for a custom document."});
 const current:any=(sale as any).documents||{};
 if(key==="custom"){
  const customNames=Array.isArray(current.customDocuments)?current.customDocuments:[];
  if(!customNames.some((name:string)=>name.toLowerCase()===documentName.toLowerCase()))return res.status(400).json({success:false,message:"Add the custom document name before uploading its file."});
 }
 try{
  const result=await uploadBufferToPostgres(req.file.buffer,req.file.originalname,"sm-associate/car-sales",`${sale.saleId||sale._id}-${key==="custom"?`custom-${documentName}`:key}`);
  const fileMeta={originalName:req.file.originalname,storedName:result.public_id,publicId:result.public_id,url:result.secure_url,resourceType:result.resource_type,format:result.format,size:req.file.size,uploadedAt:new Date()};
  if(fixedKeys.includes(key)){
   const previous:any=current.uploads?.[key];
   await CarSale.findByIdAndUpdate(sale._id,{$set:{[`documents.${key}`]:true,[`documents.uploads.${key}`]:fileMeta}},{new:true,runValidators:true});
   if(previous?.publicId||previous?.storedName)await deleteStoredDocument(previous.publicId||previous.storedName,previous.resourceType);
  }else{
   const customUploads=Array.isArray(current.customUploads)?current.customUploads:[];
   const previous=customUploads.find((item:any)=>String(item.name).toLowerCase()===documentName.toLowerCase());
   const nextUploads=customUploads.filter((item:any)=>String(item.name).toLowerCase()!==documentName.toLowerCase());
   nextUploads.push({name:documentName,...fileMeta});
   await CarSale.findByIdAndUpdate(sale._id,{$set:{"documents.customUploads":nextUploads}},{new:true,runValidators:true});
   if(previous?.publicId||previous?.storedName)await deleteStoredDocument(previous.publicId||previous.storedName,previous.resourceType);
  }
  const updated=await CarSale.findById(sale._id).populate("buyerId","customerId name mobile");
  return res.status(201).json({success:true,message:"Buyer document uploaded successfully.",data:updated});
 }catch(error){
  console.error("PostgreSQL sale document upload failed:",error);
  const message=error instanceof Error?error.message:String(error||"Unknown document upload error.");
  return res.status(500).json({success:false,message:"Unable to save document.",code:"DOCUMENT_UPLOAD_FAILED",details:process.env.NODE_ENV==="production"?undefined:message});
 }
}
export async function downloadSaleDocument(req:Request,res:Response){
 const sale=await CarSale.findOne({carId:req.params.id});
 if(!sale)return res.status(404).json({success:false,message:"Sale not found."});
 const key=String(req.params.documentKey||"");
 const documents:any=(sale as any).documents||{};
 let metadata:any;
 if(["idProof","agreement"].includes(key))metadata=documents.uploads?.[key];
 else if(key==="custom"){
  const documentName=String(req.query.documentName||"").trim();
  metadata=(Array.isArray(documents.customUploads)?documents.customUploads:[]).find((item:any)=>String(item.name).toLowerCase()===documentName.toLowerCase());
 }
 if(!metadata?.url)return res.status(404).json({success:false,message:"Uploaded buyer document not found."});
 return res.redirect(metadata.url);
}

export async function listCarProfits(_req:Request,res:Response){
 const sales=await CarSale.find().populate("carId","vehicleId registrationNumber make model year purchasePrice").populate("buyerId","customerId name").sort({saleDate:-1});
 const summary=sales.reduce((a,s)=>({sales:a.sales+s.sellingPrice,investment:a.investment+s.totalInvestment,sellingExpenses:a.sellingExpenses+s.sellingExpenses,profit:a.profit+s.profit}),{sales:0,investment:0,sellingExpenses:0,profit:0});
 res.json({success:true,data:{summary,sales}});
}

export async function deleteCar(req:Request,res:Response){
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Car not found."});
 const car=await Car.findById(carId);
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const sale=await CarSale.findOne({carId:car._id});
 if(sale||car.status==="SOLD")return res.status(409).json({success:false,message:"Sold vehicles cannot be deleted."});
 await CarExpense.deleteMany({carId:car._id});
 await car.deleteOne();
 res.json({success:true,message:"Vehicle deleted successfully."});
}

export async function deleteCarExpense(req:Request,res:Response){
 const expenseId=String(req.params.expenseId||"");
 const expense=await prisma.carExpense.findUnique({where:{id:expenseId}});
 if(!expense)return res.status(404).json({success:false,message:"Expense not found."});
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Vehicle not found."});
 if(String(expense.carId)!==String(carId))return res.status(400).json({success:false,message:"Expense does not belong to this vehicle."});
 await prisma.carExpense.delete({where:{id:expenseId}});
 return res.json({success:true,message:"Vehicle expense deleted successfully."});
}
