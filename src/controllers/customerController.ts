import { Request, Response } from "express";
import { Customer } from "../models/Customer";
import { Loan } from "../models/Loan";
import { Car } from "../models/Car";
import { CarSale } from "../models/CarSale";
import { nextId } from "../utils/sequence";

export async function listCustomers(req:Request,res:Response){
 const search=String(req.query.search??"").trim();
 const filter=search?{$or:[{name:{$regex:search,$options:"i"}},{mobile:{$regex:search,$options:"i"}},{customerId:{$regex:search,$options:"i"}}]}:{};
 const customers=await Customer.find(filter).sort({createdAt:-1});
 res.json({success:true,data:customers});
}

export async function createCustomer(req:Request,res:Response){
 const customer=await Customer.create({...req.body,customerId:await nextId("CUS","customer")});
 res.status(201).json({success:true,data:customer});
}

export async function getCustomer(req:Request,res:Response){
 const customer=await Customer.findById(req.params.id);
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});
 res.json({success:true,data:customer});
}

export async function updateCustomer(req:Request,res:Response){
 const customer=await Customer.findByIdAndUpdate(req.params.id,{$set:req.body},{new:true,runValidators:true});
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});
 res.json({success:true,data:customer});
}

export async function deleteCustomer(req:Request,res:Response){
 const customer=await Customer.findById(req.params.id);
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});
 const [loanCount,carCount,saleCount]=await Promise.all([
  Loan.countDocuments({customerId:customer._id}),
  Car.countDocuments({sellerId:customer._id}),
  CarSale.countDocuments({buyerId:customer._id})
 ]);
 if(loanCount||carCount||saleCount){
  return res.status(409).json({success:false,message:"Customer cannot be deleted because transaction history exists.",data:{loanCount,carCount,saleCount}});
 }
 await customer.deleteOne();
 res.json({success:true,message:"Customer deleted successfully."});
}

export async function getCustomerHistory(req:Request,res:Response){
 const customer=await Customer.findById(req.params.id);
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});
 const [loans,carsBought,carsSold]=await Promise.all([
  Loan.find({customerId:customer._id}).populate("assignedTo","name email").sort({createdAt:-1}),
  CarSale.find({buyerId:customer._id}).populate("carId").sort({saleDate:-1}),
  Car.find({sellerId:customer._id}).sort({createdAt:-1})
 ]);
 const loanCommission=loans.reduce((sum,loan)=>sum+(loan.commission||0),0);
 const loanApprovedAmount=loans.reduce((sum,loan)=>sum+(loan.approvedAmount||0),0);
 const carsBoughtValue=carsBought.reduce((sum,sale)=>sum+sale.sellingPrice,0);
 const carsSoldValue=carsSold.reduce((sum,car)=>sum+car.purchasePrice,0);
 res.json({success:true,data:{customer,loans,carsBought,carsSold,summary:{loanCount:loans.length,loanCommission,loanApprovedAmount,carsBoughtCount:carsBought.length,carsBoughtValue,carsSoldCount:carsSold.length,carsSoldValue}}});
}
