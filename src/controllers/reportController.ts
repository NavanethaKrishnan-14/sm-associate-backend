import { prisma } from "../config/db";
import { Request, Response } from "express";

const loanActiveStatuses=["ENTERED","DOCUMENTS_PENDING","SUBMITTED","UNDER_REVIEW","APPROVED"] as const;
const inventoryStatuses=["AVAILABLE","RESERVED"] as const;

const sumSales=(rows:any[])=>rows.reduce((a,s)=>({
 sales:a.sales+Number(s.sellingPrice||0),
 investment:a.investment+Number(s.totalInvestment||0),
 expenses:a.expenses+Number(s.sellingExpenses||0),
 profit:a.profit+Number(s.profit||0)
}),{sales:0,investment:0,expenses:0,profit:0});


export async function dashboard(req:Request,res:Response){

 const now=new Date();
 const startMonth=new Date(now.getFullYear(),now.getMonth(),1);
 const startNext=new Date(now.getFullYear(),now.getMonth()+1,1);

 const [
  customers,
  activeLoans,
  inventory,
  sold,
  sales,
  loanCounts,
  openFollowUps,
  monthSales,
  monthLoans,
  inventoryValue
 ]=await Promise.all([
  prisma.customer.count(),
  prisma.loan.count({where:{status:{in:[...loanActiveStatuses]}}}),
  prisma.car.count({where:{status:{in:[...inventoryStatuses]}}}),
  prisma.car.count({where:{status:"SOLD"}}),
  prisma.carSale.findMany({select:{profit:true,sellingPrice:true,totalInvestment:true,sellingExpenses:true}}),
  prisma.loan.groupBy({by:["status"],_count:{_all:true}}),
  prisma.loanFollowUp.count({where:{status:"OPEN"}}),
  prisma.carSale.findMany({where:{saleDate:{gte:startMonth,lt:startNext}},select:{profit:true,sellingPrice:true,totalInvestment:true,sellingExpenses:true}}),
  prisma.loan.findMany({where:{createdAt:{gte:startMonth,lt:startNext}},select:{requiredAmount:true,approvedAmount:true,commission:true,status:true}}),
  prisma.car.aggregate({where:{status:{in:[...inventoryStatuses]}},_sum:{purchasePrice:true}})
 ]);

 const totals=sumSales(sales);
 const monthlyCar=sumSales(monthSales);
 const monthlyLoan=monthLoans.reduce((a,l)=>({
  required:a.required+Number(l.requiredAmount||0),
  approved:a.approved+Number(l.approvedAmount||0),
  commission:a.commission+Number(l.commission||0),
  count:a.count+1
 }),{required:0,approved:0,commission:0,count:0});
 const loanPipeline:any={};
 for(const row of loanCounts)loanPipeline[row.status]=row._count._all;

 const data:any={
  customers,
  activeLoans,
  carsInInventory:inventory,
  carsSold:sold,
  openFollowUps,
  loanPipeline
 };
 if(req.user?.role==="ADMIN"){
  data.totalSales=totals.sales;
  data.totalInvestment=totals.investment;
  data.totalSellingExpenses=totals.expenses;
  data.totalProfit=totals.profit;
  data.inventoryValue=Number(inventoryValue._sum.purchasePrice||0);
  data.monthly={carSales:monthlyCar,loans:monthlyLoan};
 }
 return res.json({success:true,data});
}

export async function loanRevenue(_req:Request,res:Response){
 const loans=await prisma.loan.findMany({
  orderBy:{createdAt:"desc"},
  include:{customer:{select:{id:true,customerId:true,name:true,mobile:true,email:true,city:true}}}
 });
 const mapped=loans.map((row:any)=>({
  ...row,
  _id:row.id,
  customerId:row.customer?{...row.customer,_id:row.customer.id}:row.customerId
 }));
 const eligible=mapped.filter((l:any)=>["APPROVED","DISBURSED","CLOSED"].includes(l.status));
 const totalCommission=eligible.reduce((sum:number,l:any)=>sum+Number(l.commission||0),0);
 const disbursedCommission=mapped.filter((l:any)=>["DISBURSED","CLOSED"].includes(l.status)).reduce((sum:number,l:any)=>sum+Number(l.commission||0),0);
 const byType:any={};
 const byFinance:any={};
 for(const l of mapped){
  const type=l.loanType||"Other";
  const finance=l.financeCompany||"Unassigned";
  byType[type]=(byType[type]||0)+Number(l.commission||0);
  byFinance[finance]=(byFinance[finance]||0)+Number(l.commission||0);
 }
 return res.json({success:true,data:{summary:{totalCommission,disbursedCommission,approvedOrBetter:eligible.length},byType,byFinance,loans:mapped}});
}

export async function operationalReport(_req:Request,res:Response){
 const [customers,loans,openFollowUps,inventory,sales,expenses,operationalExpenses]=await Promise.all([
  prisma.customer.count(),
  prisma.loan.findMany({select:{loanType:true,status:true,requiredAmount:true,approvedAmount:true,commission:true,financeCompany:true,createdAt:true}}),
  prisma.loanFollowUp.findMany({
   where:{status:"OPEN"},
   orderBy:{followUpDate:"asc"},
   include:{loan:{include:{customer:{select:{id:true,customerId:true,name:true,mobile:true}}}}}
  }),
  prisma.car.findMany({
   where:{status:{in:[...inventoryStatuses]}},
   orderBy:{createdAt:"desc"},
   select:{id:true,vehicleId:true,registrationNumber:true,make:true,model:true,purchasePrice:true,status:true,purchaseDate:true}
  }),
  prisma.carSale.findMany({
   orderBy:{saleDate:"desc"},
   include:{
    car:{select:{id:true,vehicleId:true,registrationNumber:true,make:true,model:true,purchasePrice:true}},
    buyer:{select:{id:true,customerId:true,name:true,mobile:true}}
   }
  }),
  prisma.carExpense.findMany({orderBy:{date:"desc"}}),
  prisma.operationalExpense.findMany({orderBy:{date:"desc"}})
 ]);

 const status:any={},types:any={},finance:any={};
 for(const l of loans){
  status[l.status]=(status[l.status]||0)+1;
  types[l.loanType]=(types[l.loanType]||0)+1;
  const f=l.financeCompany||"Unassigned";
  finance[f]=(finance[f]||0)+Number(l.commission||0);
 }
 const formattedFollowUps=openFollowUps.map((row:any)=>({
  ...row,
  _id:row.id,
  loanId:row.loan?{...row.loan,_id:row.loan.id,customerId:row.loan.customer?{...row.loan.customer,_id:row.loan.customer.id}:row.loan.customerId}:row.loanId
 }));
 const formattedInventory=inventory.map((row:any)=>({...row,_id:row.id}));
 const formattedSales=sales.map((row:any)=>({
  ...row,
  _id:row.id,
  carId:row.car?{...row.car,_id:row.car.id}:row.carId,
  buyerId:row.buyer?{...row.buyer,_id:row.buyer.id}:row.buyerId
 }));
 const salesProfit=formattedSales.reduce((sum:number,x:any)=>sum+Number(x.profit||0),0);
 const expensesTotal=expenses.reduce((sum:number,x:any)=>sum+Number(x.amount||0),0);
 const operationalExpensesTotal=operationalExpenses.reduce((sum:number,x:any)=>sum+Number(x.amount||0),0);
 const operationalByCategory:any={};
 for(const expense of operationalExpenses){
  const category=expense.category||"Other";
  operationalByCategory[category]=(operationalByCategory[category]||0)+Number(expense.amount||0);
 }

 return res.json({
  success:true,
  data:{
   customers,
   loanSummary:{count:loans.length,byStatus:status,byType:types,commissionByFinance:finance},
   openFollowUps:formattedFollowUps,
   inventory:formattedInventory,
   sales:{count:formattedSales.length,profit:salesProfit},
   carExpenses:{count:expenses.length,total:expensesTotal},
   operationalExpenses:{count:operationalExpenses.length,total:operationalExpensesTotal,byCategory:operationalByCategory,records:operationalExpenses}
  }
 });
}
