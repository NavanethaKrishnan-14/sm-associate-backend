import { Request, Response } from "express";
import { Customer } from "../models/Customer";
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