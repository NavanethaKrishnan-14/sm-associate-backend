import { Request, Response } from "express";
import { Car } from "../models/Car";
import { CarSale } from "../models/CarSale";
import { CarExpense } from "../models/CarExpense";
import { Customer } from "../models/Customer";
import { Loan } from "../models/Loan";
import { LoanFollowUp } from "../models/LoanFollowUp";

export async function dashboard(req:Request,res:Response){
 const now=new Date(), startMonth=new Date(now.getFullYear(),now.getMonth(),1), startNext=new Date(now.getFullYear(),now.getMonth()+1,1);
 const [customers,activeLoans,inventory,sold,sales,loanCounts,openFollowUps,monthSales,monthLoans,inventoryValue,inventoryExpenses]=await Promise.all([
  Customer.countDocuments(),
  Loan.countDocuments({status:{$in:["ENTERED","DOCUMENTS_PENDING","SUBMITTED","UNDER_REVIEW","APPROVED"]}}),
  Car.countDocuments({status:{$in:["AVAILABLE","RESERVED"]}}),
  Car.countDocuments({status:"SOLD"}),
  CarSale.find({}, {profit:1,sellingPrice:1,totalInvestment:1,sellingExpenses:1}),
  Loan.aggregate([{$group:{_id:"$status",count:{$sum:1}}}]),
  LoanFollowUp.countDocuments({status:"OPEN"}),
  CarSale.find({saleDate:{$gte:startMonth,$lt:startNext}},{profit:1,sellingPrice:1,totalInvestment:1,sellingExpenses:1}),
  Loan.find({createdAt:{$gte:startMonth,$lt:startNext}},{requiredAmount:1,approvedAmount:1,commission:1,status:1}),
  Car.find({status:{$in:["AVAILABLE","RESERVED"]}},{_id:1,purchasePrice:1}),
  CarExpense.find({}, {carId:1,amount:1})
 ]);
 const sumSales=(rows:any[])=>rows.reduce((a,s)=>({sales:a.sales+s.sellingPrice,investment:a.investment+s.totalInvestment,expenses:a.expenses+s.sellingExpenses,profit:a.profit+s.profit}),{sales:0,investment:0,expenses:0,profit:0});
 const totals=sumSales(sales), monthlyCar=sumSales(monthSales);
 const monthlyLoan=monthLoans.reduce((a,l)=>({required:a.required+l.requiredAmount,approved:a.approved+(l.approvedAmount||0),commission:a.commission+(l.commission||0),count:a.count+1}),{required:0,approved:0,commission:0,count:0});
 const loanPipeline:any={}; for(const x of loanCounts) loanPipeline[x._id]=x.count;
  const currentInventoryValue=inventoryValue.reduce((s,c:any)=>s+Number(c.purchasePrice||0),0);
 const isAdmin=req.user?.role==="ADMIN";
 const data:any={customers,activeLoans,carsInInventory:inventory,carsSold:sold,openFollowUps,loanPipeline};
 if(isAdmin){data.totalSales=totals.sales;data.totalInvestment=totals.investment;data.totalSellingExpenses=totals.expenses;data.totalProfit=totals.profit;data.inventoryValue=currentInventoryValue;data.monthly={carSales:monthlyCar,loans:monthlyLoan};}
 res.json({success:true,data});
}

export async function loanRevenue(_req:Request,res:Response){
 const loans=await Loan.find({}).populate("customerId","customerId name mobile").sort({createdAt:-1});
 const eligible=loans.filter(l=>["APPROVED","DISBURSED","CLOSED"].includes(l.status));
 const totalCommission=eligible.reduce((sum,l)=>sum+(l.commission||0),0);
 const disbursedCommission=loans.filter(l=>["DISBURSED","CLOSED"].includes(l.status)).reduce((sum,l)=>sum+(l.commission||0),0);
 const byType:any={},byFinance:any={}; for(const l of loans){const type=l.loanType||"Other";byType[type]=(byType[type]||0)+(l.commission||0);const finance=l.financeCompany||"Unassigned";byFinance[finance]=(byFinance[finance]||0)+(l.commission||0);}
 res.json({success:true,data:{summary:{totalCommission,disbursedCommission,approvedOrBetter:eligible.length},byType,byFinance,loans}});
}

export async function operationalReport(_req:Request,res:Response){
 const [customers,loans,openFollowUps,inventory,sales,expenses]=await Promise.all([
  Customer.countDocuments(),
  Loan.find({}, {loanType:1,status:1,requiredAmount:1,approvedAmount:1,commission:1,financeCompany:1,createdAt:1}),
  LoanFollowUp.find({status:"OPEN"}).populate({path:"loanId",populate:{path:"customerId",select:"customerId name mobile"}}).sort({followUpDate:1}),
  Car.find({status:{$in:["AVAILABLE","RESERVED"]}},{vehicleId:1,registrationNumber:1,make:1,model:1,purchasePrice:1,status:1,purchaseDate:1}).sort({createdAt:-1}),
  CarSale.find({}).populate("carId","vehicleId registrationNumber make model").populate("buyerId","customerId name").sort({saleDate:-1}),
  CarExpense.find({}).sort({date:-1})
 ]);
 const status:any={},types:any={},finance:any={};
 for(const l of loans){status[l.status]=(status[l.status]||0)+1;types[l.loanType]=(types[l.loanType]||0)+1;const f=l.financeCompany||"Unassigned";finance[f]=(finance[f]||0)+(l.commission||0);}
 const salesProfit=sales.reduce((s,x)=>s+x.profit,0), expensesTotal=expenses.reduce((s,x)=>s+x.amount,0);
 res.json({success:true,data:{customers,loanSummary:{count:loans.length,byStatus:status,byType:types,commissionByFinance:finance},openFollowUps,inventory,sales:{count:sales.length,profit:salesProfit},carExpenses:{count:expenses.length,total:expensesTotal}}});
}