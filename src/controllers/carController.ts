import { Request, Response } from "express";
import { Car } from "../models/Car";
import { CarExpense } from "../models/CarExpense";
import { CarSale } from "../models/CarSale";
import { Customer } from "../models/Customer";
import { nextId } from "../utils/sequence";

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
 const car=await Car.findById(req.params.id);
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const status=String(req.body.status||"");
 if(!["AVAILABLE","RESERVED","SOLD"].includes(status))return res.status(400).json({success:false,message:"Invalid car status."});
 if(status==="SOLD"){
  const sale=await CarSale.findOne({carId:car._id});
  if(!sale)return res.status(400).json({success:false,message:"A car can be marked SOLD only after a sale is recorded."});
 }
 car.status=status as any;
 await car.save();
 const updated=await Car.findById(car._id).populate("sellerId","customerId name mobile");
 res.json({success:true,data:updated});
}
export async function createCar(req:Request,res:Response){
 const seller=await Customer.findById(req.body.sellerId);
 if(!seller)return res.status(400).json({success:false,message:"Seller/customer not found."});
 const allowed=["sellerId","registrationNumber","make","model","year","ownerNumber","km","fuel","purchasePrice","purchaseDate","notes"];
 const data:any={vehicleId:await nextId("CAR","car"),status:"AVAILABLE"};
 for(const key of allowed) if(req.body[key]!==undefined) data[key]=req.body[key];
 const car=await Car.create(data);
 res.status(201).json({success:true,data:car});
}
export async function listCarExpenses(req:Request,res:Response){
 const carId=req.query.carId?String(req.query.carId):undefined;
 const filter:any=carId?{carId}:{};
 const expenses=await CarExpense.find(filter).populate("carId","vehicleId registrationNumber make model year purchasePrice").sort({date:-1,createdAt:-1});
 res.json({success:true,data:expenses});
}
export async function addCarExpense(req:Request,res:Response){
 const car=await Car.findById(req.params.id);
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const amount=Number(req.body.amount);
 if(!Number.isFinite(amount)||amount<0)return res.status(400).json({success:false,message:"Expense amount must be a valid positive number."});
 const allowed=["category","description","date"];
 const data:any={amount,carId:car._id};
 for(const key of allowed) if(req.body[key]!==undefined) data[key]=req.body[key];
 const expense=await CarExpense.create(data);
 res.status(201).json({success:true,data:expense});
}
export async function updateCarExpense(req:Request,res:Response){
 const expense=await CarExpense.findById(req.params.expenseId);
 if(!expense)return res.status(404).json({success:false,message:"Expense not found."});
 if(req.body.amount!==undefined){
  const amount=Number(req.body.amount);
  if(!Number.isFinite(amount)||amount<0)return res.status(400).json({success:false,message:"Expense amount must be a valid positive number."});
  expense.amount=amount;
 }
 for(const key of ["category","description","date"]) if(req.body[key]!==undefined) (expense as any)[key]=req.body[key];
 await expense.save();
 const updated=await CarExpense.findById(expense._id).populate("carId","vehicleId registrationNumber make model year purchasePrice");
 res.json({success:true,data:updated});
}
export async function getCarFinancials(req:Request,res:Response){
 const car=await Car.findById(req.params.id).populate("sellerId","customerId name mobile");
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const expenses=await CarExpense.find({carId:car._id}).sort({date:-1});
 const expenseTotal=expenses.reduce((sum,item)=>sum+item.amount,0);
 const totalInvestment=car.purchasePrice+expenseTotal;
 const sale=await CarSale.findOne({carId:car._id}).populate("buyerId","customerId name mobile");
 const netProfit=sale?Number(sale.profit):null;
 res.json({success:true,data:{car,expenses,expenseTotal,totalInvestment,sale,netProfit}});
}
export async function sellCar(req:Request,res:Response){
 const car=await Car.findById(req.params.id);
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 if(car.status==="SOLD")return res.status(409).json({success:false,message:"Car is already sold."});
 const buyer=await Customer.findById(req.body.buyerId);
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
 const sale=await CarSale.create({saleId:await nextId("SALE","carSale"),carId:car._id,buyerId:buyer._id,sellingPrice,sellingExpenses,totalInvestment,profit,saleDate:req.body.saleDate??new Date(),notes:req.body.notes});
 car.status="SOLD"; await car.save();
 res.status(201).json({success:true,data:sale});
}
export async function listCarProfits(_req:Request,res:Response){
 const sales=await CarSale.find().populate("carId","vehicleId registrationNumber make model year purchasePrice").populate("buyerId","customerId name").sort({saleDate:-1});
 const summary=sales.reduce((a,s)=>({sales:a.sales+s.sellingPrice,investment:a.investment+s.totalInvestment,sellingExpenses:a.sellingExpenses+s.sellingExpenses,profit:a.profit+s.profit}),{sales:0,investment:0,sellingExpenses:0,profit:0});
 res.json({success:true,data:{summary,sales}});
}

export async function deleteCar(req:Request,res:Response){
 const car=await Car.findById(req.params.id);
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
 if(String(expense.carId)!==String(req.params.id))return res.status(400).json({success:false,message:"Expense does not belong to this vehicle."});
 await expense.deleteOne();
 res.json({success:true,message:"Expense deleted successfully."});
}
