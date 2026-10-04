
import { Request, Response } from "express";
import { Car } from "../models/Car";
import { CarSale } from "../models/CarSale";
import { Customer } from "../models/Customer";
import { Loan } from "../models/Loan";

export async function dashboard(_req:Request,res:Response){
 const [customers,activeLoans,inventory,sold,sales]=await Promise.all([
  Customer.countDocuments(),
  Loan.countDocuments({status:{$in:["NEW","DOCUMENTS_PENDING","SUBMITTED","UNDER_REVIEW","APPROVED"]}}),
  Car.countDocuments({status:{$in:["AVAILABLE","RESERVED"]}}),
  Car.countDocuments({status:"SOLD"}),
  CarSale.find({}, {profit:1,sellingPrice:1,totalInvestment:1,sellingExpenses:1})
 ]);
 const totalProfit=sales.reduce((sum,sale)=>sum+sale.profit,0);
 const totalSales=sales.reduce((sum,sale)=>sum+sale.sellingPrice,0);
 const totalInvestment=sales.reduce((sum,sale)=>sum+sale.totalInvestment,0);
 const totalSellingExpenses=sales.reduce((sum,sale)=>sum+sale.sellingExpenses,0);
 res.json({success:true,data:{customers,activeLoans,carsInInventory:inventory,carsSold:sold,totalSales,totalInvestment,totalSellingExpenses,totalProfit}});
}

export async function loanRevenue(_req:Request,res:Response){
 const loans=await Loan.find({}).populate("customerId","customerId name mobile").sort({createdAt:-1});
 const eligible=loans.filter(l=>["APPROVED","DISBURSED","CLOSED"].includes(l.status));
 const totalCommission=eligible.reduce((sum,l)=>sum+(l.commission||0),0);
 const disbursedCommission=loans.filter(l=>["DISBURSED","CLOSED"].includes(l.status)).reduce((sum,l)=>sum+(l.commission||0),0);
 const byType:any={};
 const byFinance:any={};
 for(const l of loans){
   const type=l.loanType||"Other"; byType[type]=(byType[type]||0)+(l.commission||0);
   const finance=l.financeCompany||"Unassigned"; byFinance[finance]=(byFinance[finance]||0)+(l.commission||0);
 }
 res.json({success:true,data:{summary:{totalCommission,disbursedCommission,approvedOrBetter:eligible.length},byType,byFinance,loans}});
}
