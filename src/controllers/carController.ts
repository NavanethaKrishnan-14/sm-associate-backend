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
 res.json({success:true,data:cars});
}
export async function createCar(req:Request,res:Response){
 const seller=await Customer.findById(req.body.sellerId);
 if(!seller)return res.status(400).json({success:false,message:"Seller/customer not found."});
 const car=await Car.create({...req.body,vehicleId:await nextId("CAR","car")});
 res.status(201).json({success:true,data:car});
}
export async function addCarExpense(req:Request,res:Response){
 const car=await Car.findById(req.params.id);
 if(!car)return res.status(404).json({success:false,message:"Car not found."});
 const amount=Number(req.body.amount);
 if(!Number.isFinite(amount)||amount<0)return res.status(400).json({success:false,message:"Expense amount must be a valid positive number."});
 const expense=await CarExpense.create({...req.body,amount,carId:car._id});
 res.status(201).json({success:true,data:expense});
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