import { Request, Response } from "express";
import { Loan } from "../models/Loan";
import { Customer } from "../models/Customer";
import { nextId } from "../utils/sequence";

export async function listLoans(req:Request,res:Response){
 const status=req.query.status?String(req.query.status):undefined;
 const loans=await Loan.find(status?{status}:{}).populate("customerId","customerId name mobile").sort({createdAt:-1});
 res.json({success:true,data:loans});
}
export async function createLoan(req:Request,res:Response){
 const customer=await Customer.findById(req.body.customerId);
 if(!customer)return res.status(400).json({success:false,message:"Customer not found."});
 const loan=await Loan.create({...req.body,loanId:await nextId("LOAN","loan")});
 res.status(201).json({success:true,data:loan});
}