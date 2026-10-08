import { Request, Response } from "express";
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
 const car=await Car.findById(carId).select("_id vehicleId documents");
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 if(!req.file)return res.status(400).json({success:false,message:"Please select a document to upload."});
 const key=String(req.params.documentKey||"");
 const fixedKeys=["carBook","carInsurance","agreement"];
 if(!fixedKeys.includes(key)&&key!=="custom")return res.status(400).json({success:false,message:"Invalid document type."});
 const documentName=key==="custom"?String(req.body.documentName||"").trim().slice(0,100):"";
 if(key==="custom"&&!documentName)return res.status(400).json({success:false,message:"Document name is required for a custom document."});
 try{
  const result=await uploadBufferToPostgres(req.file.buffer,req.file.originalname,"sm-associate/cars",`${car.vehicleId||car._id}-${key==="custom"?`custom-${documentName}`:key}`);
  const fileMeta={originalName:req.file.originalname,storedName:result.public_id,publicId:result.public_id,url:result.secure_url,resourceType:result.resource_type,format:result.format,size:req.file.size,uploadedAt:new Date()};
  if(fixedKeys.includes(key)){
   const previous:any=(car as any).documents?.uploads?.[key];
   await Car.findByIdAndUpdate(car._id,{$set:{[`documents.${key}`]:true,[`documents.uploads.${key}`]:fileMeta}},{new:true,runValidators:true});
   if(previous?.publicId||previous?.storedName)await deleteStoredDocument(previous.publicId||previous.storedName,previous.resourceType);
  }else{
   const current:any=(car as any).documents||{};
   const customNames=Array.isArray(current.customDocuments)?current.customDocuments:[];
   const customUploads=Array.isArray(current.customUploads)?current.customUploads:[];
   const previous=customUploads.find((item:any)=>String(item.name).toLowerCase()===documentName.toLowerCase());
   const nextNames=customNames.some((name:string)=>name.toLowerCase()===documentName.toLowerCase())?customNames:[...customNames,documentName];
   const nextUploads=customUploads.filter((item:any)=>String(item.name).toLowerCase()!==documentName.toLowerCase());
   nextUploads.push({name:documentName,...fileMeta});
   await Car.findByIdAndUpdate(car._id,{$set:{"documents.customDocuments":nextNames,"documents.customUploads":nextUploads}},{new:true,runValidators:true});
   if(previous?.publicId||previous?.storedName)await deleteStoredDocument(previous.publicId||previous.storedName,previous.resourceType);
  }
  const updated=await Car.findById(car._id).populate("sellerId","customerId name mobile email city");
  return res.status(201).json({success:true,message:"Car document uploaded successfully.",data:updated});
 }catch(error){
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
 res.json({success:true,data:{...car.toObject(),expenseTotal,totalInvestment:car.purchasePrice+expenseTotal}});
}

export async function listCars(req:Request,res:Response){
 const status=req.query.status?String(req.query.status):undefined;
 const search=String(req.query.search??"").trim();
 const filter:any=status?{status}:{};
 if(search) filter.$or=[{registrationNumber:{$regex:search,$options:"i"}},{vehicleId:{$regex:search,$options:"i"}},{make:{$regex:search,$options:"i"}},{model:{$regex:search,$options:"i"}}];
 const cars=await Car.find(filter).populate("sellerId","customerId name mobile").sort({createdAt:-1});
 const carIds=cars.map(car=>car._id);
 const expenseRows=carIds.length?await CarExpense.aggregate([{$match:{carId:{$in:carIds}}},{$group:{_id:"$carId",total:{$sum:"$amount"}}}]):[];
 const expenseMap=new Map(expenseRows.map(row=>[String(row._id),Number(row.total||0)]));
 const data=cars.map(car=>{const expenseTotal=expenseMap.get(String(car._id))||0;return {...car.toObject(),expenseTotal,totalInvestment:car.purchasePrice+expenseTotal};});
 res.json({success:true,data});
}

export async function updateCarStatus(req:Request,res:Response){
 const status=String(req.body.status||"");
 req.body={status};
 return updateCar(req,res);
}

export async function updateCar(req:Request,res:Response){
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Car not found."});
 const car=await Car.findById(carId);
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const body=req.body||{};
 const patch:any={};
 if(body.status!==undefined&&req.user?.role!=="ADMIN"){
  return res.status(403).json({success:false,message:"Only ADMIN can change vehicle status."});
 }
 for(const key of ["sellerId","registrationNumber","make","model","fuel","notes","purchaseDate","status"]){
  if(body[key]!==undefined)patch[key]=body[key];
 }
 if(body.sellerId!==undefined){
  const sellerId=await resolveCustomerId(body.sellerId);
  const seller=sellerId?await Customer.findById(sellerId):null;
  if(!seller)return res.status(400).json({success:false,message:"Seller/customer not found."});
  patch.sellerId=seller._id;
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
   const sale=await CarSale.findOne({carId:car._id});
   if(!sale)return res.status(400).json({success:false,message:"A car can be marked SOLD only after a sale is recorded."});
  }
 }
 if(!Object.keys(patch).length)return res.status(400).json({success:false,message:"No vehicle fields were provided to update."});
 const updated=await Car.findByIdAndUpdate(car._id,{$set:patch},{new:true,runValidators:true}).populate("sellerId","customerId name mobile email city");
 if(!updated)return res.status(404).json({success:false,message:"Car not found."});
 res.json({success:true,data:updated});
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
 const populated=await Car.findById(car._id).populate("sellerId","customerId name mobile email city");
 if(!populated)return res.status(500).json({success:false,message:"Vehicle was created but could not be loaded after creation."});
 res.status(201).json({success:true,data:{...populated.toObject(),car:populated,seller}});
}
export async function listCarExpenses(req:Request,res:Response){
 const rawCarId=req.query.carId?String(req.query.carId):undefined;
 const resolvedCarId=rawCarId?await resolveCarId(rawCarId):null;
 if(rawCarId&&!resolvedCarId)return res.status(404).json({success:false,message:"Car not found."});
 const filter:any=resolvedCarId?{carId:resolvedCarId}:{};
 const expenses=await CarExpense.find(filter).populate("carId","vehicleId registrationNumber make model year purchasePrice").sort({date:-1,createdAt:-1});
 res.json({success:true,data:expenses});
}
export async function addCarExpense(req:Request,res:Response){
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Car not found."});
 const car=await Car.findById(carId);
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const amount=Number(req.body.amount);
 const category=String(req.body.category??"").trim();
 if(!Number.isFinite(amount)||amount<0)return res.status(400).json({success:false,message:"Expense amount must be a valid non-negative number."});
 if(!category)return res.status(400).json({success:false,message:"Expense category is required."});
 const allowed=["category","description","date"];
 const data:any={amount,carId:car._id,category};
 for(const key of allowed) if(key!=="category"&&req.body[key]!==undefined) data[key]=req.body[key];
 const expense=await CarExpense.create(data);
 res.status(201).json({success:true,data:expense});
}
export async function updateCarExpense(req:Request,res:Response){
 const expense=await CarExpense.findById(req.params.expenseId);
 if(!expense)return res.status(404).json({success:false,message:"Expense not found."});
 if(req.body.carId!==undefined){
  const resolvedCarId=await resolveCarId(req.body.carId);
  const car=resolvedCarId?await Car.findById(resolvedCarId):null;
  if(!car)return res.status(400).json({success:false,message:"Vehicle not found."});
  expense.carId=car._id;
 }
 if(req.body.amount!==undefined){
  const amount=Number(req.body.amount);
  if(!Number.isFinite(amount)||amount<0)return res.status(400).json({success:false,message:"Expense amount must be a valid non-negative number."});
  expense.amount=amount;
 }
 if(req.body.category!==undefined){
  const category=String(req.body.category).trim();
  if(!category)return res.status(400).json({success:false,message:"Expense category is required."});
  expense.category=category;
 }
 if(req.body.description!==undefined)expense.description=String(req.body.description).trim();
 if(req.body.date!==undefined)expense.date=new Date(req.body.date);
 await expense.save();
 const updated=await CarExpense.findById(expense._id).populate("carId","vehicleId registrationNumber make model year purchasePrice");
 res.json({success:true,data:updated});
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
  console.error("Cloudinary sale document upload failed:",error);
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
 const expense=await CarExpense.findById(req.params.expenseId);
 if(!expense)return res.status(404).json({success:false,message:"Expense not found."});
 const carId=await resolveCarId(req.params.id);
 if(!carId)return res.status(404).json({success:false,message:"Car not found."});
 if(String(expense.carId)!==String(carId))return res.status(400).json({success:false,message:"Expense does not belong to this vehicle."});
 await expense.deleteOne();
 res.json({success:true,message:"Expense deleted successfully."});
}
