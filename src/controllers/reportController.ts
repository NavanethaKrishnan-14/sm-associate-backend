import { Request,Response } from "express";
import { prisma } from "../config/db";
import { toLegacy, renameRelations } from "../utils/legacy";

export async function dashboard(req:Request,res:Response){
 const now=new Date(),startMonth=new Date(now.getFullYear(),now.getMonth(),1),startNext=new Date(now.getFullYear(),now.getMonth()+1,1);
 const [customers,activeLoans,inventory,sold,sales,loans,openFollowUps,monthSales,monthLoans,inventoryValue,inventoryExpenses]=await Promise.all([
  prisma.customer.count(),
  prisma.loan.count({where:{status:{in:["ENTERED","DOCUMENTS_PENDING","SUBMITTED","UNDER_REVIEW","APPROVED"]}}}),
  prisma.car.count({where:{status:{in:["AVAILABLE","RESERVED"]}}}),
  prisma.car.count({where:{status:"SOLD"}}),
  prisma.carSale.findMany({select:{profit:true,sellingPrice:true,totalInvestment:true,sellingExpenses:true}}),
  prisma.loan.findMany({select:{status:true}}),
  prisma.loanFollowUp.count({where:{status:"OPEN"}}),
  prisma.carSale.findMany({where:{saleDate:{gte:startMonth,lt:startNext}},select:{profit:true,sellingPrice:true,totalInvestment:true,sellingExpenses:true}}),
  prisma.loan.findMany({where:{createdAt:{gte:startMonth,lt:startNext}},select:{requiredAmount:true,approvedAmount:true,commission:true,status:true}}),
  prisma.car.findMany({where:{status:{in:["AVAILABLE","RESERVED"]}},select:{purchasePrice:true}}),
  prisma.carExpense.findMany({select:{carId:true,amount:true}})
 ]);
 const sumSales=(rows:any[])=>rows.reduce((a,s)=>({sales:a.sales+s.sellingPrice,investment:a.investment+s.totalInvestment,expenses:a.expenses+s.sellingExpenses,profit:a.profit+s.profit}),{sales:0,investment:0,expenses:0,profit:0});
 const totals=sumSales(sales),monthlyCar=sumSales(monthSales);
 const monthlyLoan=monthLoans.reduce((a,l)=>({required:a.required+l.requiredAmount,approved:a.approved+(l.approvedAmount||0),commission:a.commission+(l.commission||0),count:a.count+1}),{required:0,approved:0,commission:0,count:0});
 const loanPipeline:any={};for(const x of loans)loanPipeline[x.status]=(loanPipeline[x.status]||0)+1;
 const currentInventoryValue=inventoryValue.reduce((s,c)=>s+Number(c.purchasePrice||0),0);
 const data:any={customers,activeLoans,carsInInventory:inventory,carsSold:sold,openFollowUps,loanPipeline};
 if(req.user?.role==="ADMIN"){data.totalSales=totals.sales;data.totalInvestment=totals.investment;data.totalSellingExpenses=totals.expenses;data.totalProfit=totals.profit;data.inventoryValue=currentInventoryValue;data.monthly={carSales:monthlyCar,loans:monthlyLoan};}
 res.json({success:true,data});
}
export async function loanRevenue(_req:Request,res:Response){
 const loans=await prisma.loan.findMany({include:{customer:{select:{id:true,customerId:true,name:true,mobile:true}}},orderBy:{createdAt:"desc"}});
 const eligible=loans.filter(l=>["APPROVED","DISBURSED","CLOSED"].includes(l.status)),totalCommission=eligible.reduce((s,l)=>s+(l.commission||0),0),disbursedCommission=loans.filter(l=>["DISBURSED","CLOSED"].includes(l.status)).reduce((s,l)=>s+(l.commission||0),0);
 const byType:any={},byFinance:any={};for(const l of loans){const type=l.loanType||"Other";byType[type]=(byType[type]||0)+(l.commission||0);const f=l.financeCompany||"Unassigned";byFinance[f]=(byFinance[f]||0)+(l.commission||0);}
 res.json({success:true,data:{summary:{totalCommission,disbursedCommission,approvedOrBetter:eligible.length},byType,byFinance,loans:toLegacy(loans)}});
}
export async function operationalReport(_req:Request,res:Response){
 const [customers,loans,openFollowUps,inventory,sales,expenses]=await Promise.all([
  prisma.customer.count(),
  prisma.loan.findMany({select:{loanType:true,status:true,requiredAmount:true,approvedAmount:true,commission:true,financeCompany:true,createdAt:true}}),
  prisma.loanFollowUp.findMany({where:{status:"OPEN"},include:{loan:{include:{customer:{select:{id:true,customerId:true,name:true,mobile:true}}}}},orderBy:{followUpDate:"asc"}}),
  prisma.car.findMany({where:{status:{in:["AVAILABLE","RESERVED"]}},select:{vehicleId:true,registrationNumber:true,make:true,model:true,purchasePrice:true,status:true,purchaseDate:true},orderBy:{createdAt:"desc"}}),
  prisma.carSale.findMany({include:{car:{select:{id:true,vehicleId:true,registrationNumber:true,make:true,model:true}},buyer:{select:{id:true,customerId:true,name:true}}},orderBy:{saleDate:"desc"}}),
  prisma.carExpense.findMany({orderBy:{date:"desc"}})
 ]);
 const status:any={},types:any={},finance:any={};for(const l of loans){status[l.status]=(status[l.status]||0)+1;types[l.loanType]=(types[l.loanType]||0)+1;const f=l.financeCompany||"Unassigned";finance[f]=(finance[f]||0)+(l.commission||0);}
 const salesProfit=sales.reduce((s,x)=>s+x.profit,0),expensesTotal=expenses.reduce((s,x)=>s+x.amount,0);
 const compatFollowUps=openFollowUps.map((row:any)=>renameRelations({...row,loan:row.loan?renameRelations(row.loan,{customer:"customerId"}):row.loan},{loan:"loanId"}));
 const compatSales=sales.map((row:any)=>renameRelations(row,{car:"carId",buyer:"buyerId"}));
 res.json({success:true,data:{customers,loanSummary:{count:loans.length,byStatus:status,byType:types,commissionByFinance:finance},openFollowUps:toLegacy(compatFollowUps),inventory,sales:{count:sales.length,profit:salesProfit},carExpenses:{count:expenses.length,total:expensesTotal}}});
}