import "dotenv/config";
import { prisma } from "../src/config/db";
import { hashPassword } from "../src/utils/auth";
import { createHash } from "crypto";

function idFor(value:string){return createHash("sha256").update(value).digest("hex").slice(0,24);}
const services=[
["DSA_FINANCE","DSA Finance","DSA",null,"DSA finance sourcing.",1],
["HOME_LOAN","Home Loan","DSA_PRODUCT","DSA_FINANCE","Home loan through DSA.",2],
["CAR_LOAN","Car Loan","DSA_PRODUCT","DSA_FINANCE","Car loan through DSA.",3],
["BUSINESS_LOAN","Business Loan","DSA_PRODUCT","DSA_FINANCE","Business loan through DSA.",4],
["PERSONAL_LOAN","Personal Loan","DSA_PRODUCT","DSA_FINANCE","Personal loan through DSA.",5],
["INSURANCE_RENEWAL","Insurance Renewal","SERVICE",null,"Insurance renewal support.",6],
["GOLD_RESALE","Gold Resale","SERVICE",null,"Gold resale support.",7]
] as const;
async function seed(){
 const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();const password=process.env.ADMIN_PASSWORD;
 if(!email||!password)throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before seeding.");
 const admin=await prisma.user.upsert({where:{email},update:{name:process.env.ADMIN_NAME||"SM Associate Admin",role:"ADMIN",isActive:true},create:{id:idFor("admin:"+email),name:process.env.ADMIN_NAME||"SM Associate Admin",email,passwordHash:await hashPassword(password),role:"ADMIN",isActive:true}});
 for(const s of services)await prisma.financeService.upsert({where:{code:s[0]},update:{name:s[1],category:s[2],parentCode:s[3],description:s[4],sortOrder:s[5],active:true},create:{id:idFor("service:"+s[0]),code:s[0],name:s[1],category:s[2],parentCode:s[3],description:s[4],sortOrder:s[5]}});
 const customerData=[
 ["CUS-90001","Arun Kumar","9000000001","demo.customer@smassociate.test","Tirunelveli","Business Owner"],
 ["CUS-90002","Priya Raj","9000000002","demo.priya@smassociate.test","Tirunelveli","IT Professional"],
 ["CUS-90003","Mohamed Faizal","9000000003","demo.faizal@smassociate.test","Tirunelveli","Trader"],
 ["CUS-90004","Kavitha S","9000000004","demo.kavitha@smassociate.test","Nagercoil","Teacher"],
 ["CUS-90005","Suresh B","9000000005","demo.suresh@smassociate.test","Tuticorin","Engineer"],
 ["CUS-90006","Meena Devi","9000000006","demo.meena@smassociate.test","Tirunelveli","Retailer"],
 ["CUS-90007","Ramesh Kumar","9000000007","demo.ramesh@smassociate.test","Nagercoil","Self Employed"]
 ] as const;
 const customers:any={};for(const c of customerData)customers[c[0]]=await prisma.customer.upsert({where:{customerId:c[0]},update:{name:c[1],mobile:c[2],email:c[3],city:c[4],occupation:c[5]},create:{id:idFor(c[0]),customerId:c[0],name:c[1],mobile:c[2],email:c[3],city:c[4],occupation:c[5],notes:"DEMO DATA"}});
 const loans=[
 ["LN-90001","CUS-90001","Home Loan",4200000,4000000,"HDFC Bank","APPROVED",42000],
 ["LN-90002","CUS-90002","Car Loan",850000,800000,"ICICI Bank","DISBURSED",12500],
 ["LN-90003","CUS-90003","Business Loan",2500000,null,"Axis Bank","UNDER_REVIEW",0],
 ["LN-90004","CUS-90004","Personal Loan",500000,null,"Bajaj Finance","ENTERED",0],
 ["LN-90005","CUS-90005","Home Loan",3200000,3000000,"SBI","CLOSED",30000],
 ["LN-90006","CUS-90006","Car Loan",700000,null,"HDFC Bank","SUBMITTED",0],
 ["LN-90007","CUS-90007","Business Loan",1800000,null,"Kotak Mahindra Bank","REJECTED",0],
 ["LN-90008","CUS-90001","Personal Loan",400000,null,"Tata Capital","DOCUMENTS_PENDING",0]
 ] as const;
 const loanRows:any={};for(const l of loans)loanRows[l[0]]=await prisma.loan.upsert({where:{loanId:l[0]},update:{customerId:customers[l[1]].id,loanType:l[2],requiredAmount:l[3],approvedAmount:l[4],financeCompany:l[5],status:l[6],commission:l[7]},create:{id:idFor(l[0]),loanId:l[0],customerId:customers[l[1]].id,loanType:l[2],requiredAmount:l[3],approvedAmount:l[4],financeCompany:l[5],status:l[6],commission:l[7],notes:"DEMO DATA"}});
 const cars=[
 ["CAR-90001","CUS-90003","TN72AB9001","Hyundai","Creta SX",2021,1180000,"AVAILABLE"],
 ["CAR-90002","CUS-90005","TN69EF9002","Kia","Seltos HTK",2022,1250000,"RESERVED"],
 ["CAR-90003","CUS-90001","TN72CD9003","Maruti Suzuki","Swift VXi",2022,720000,"SOLD"]
 ] as const;
 const carRows:any={};for(const c of cars)carRows[c[0]]=await prisma.car.upsert({where:{vehicleId:c[0]},update:{sellerId:customers[c[1]].id,registrationNumber:c[2],make:c[3],model:c[4],year:c[5],purchasePrice:c[6],status:c[7]},create:{id:idFor(c[0]),vehicleId:c[0],sellerId:customers[c[1]].id,registrationNumber:c[2],make:c[3],model:c[4],year:c[5],ownerNumber:1,km:30000,fuel:"Petrol",purchasePrice:c[6],status:c[7],notes:"DEMO DATA"}});
 const expenses=[["EXP-90001","CAR-90001","Service",18000,"Periodic service - DEMO"],["EXP-90002","CAR-90001","Detailing",6500,"Vehicle detailing - DEMO"],["EXP-90003","CAR-90002","Tyres",24000,"Tyre replacement - DEMO"],["EXP-90004","CAR-90003","Repair",12000,"Brake and suspension work - DEMO"],["EXP-90005","CAR-90003","Detailing",5000,"Final detailing - DEMO"]] as const;
 for(const e of expenses)await prisma.carExpense.upsert({where:{id:idFor(e[0])},update:{carId:carRows[e[1]].id,category:e[2],amount:e[3],description:e[4]},create:{id:idFor(e[0]),carId:carRows[e[1]].id,category:e[2],amount:e[3],description:e[4]}});
 await prisma.carSale.upsert({where:{saleId:"SALE-90001"},update:{carId:carRows["CAR-90003"].id,buyerId:customers["CUS-90004"].id,sellingPrice:805000,sellingExpenses:7500,totalInvestment:737000,profit:60500,saleDate:new Date("2026-09-20"),notes:"DEMO DATA"},create:{id:idFor("SALE-90001"),saleId:"SALE-90001",carId:carRows["CAR-90003"].id,buyerId:customers["CUS-90004"].id,sellingPrice:805000,sellingExpenses:7500,totalInvestment:737000,profit:60500,saleDate:new Date("2026-09-20"),notes:"DEMO DATA"}});
 console.log("PostgreSQL demo data seeded. Admin:",admin.email);
 await prisma.$disconnect();
}
seed().catch(async e=>{console.error("PostgreSQL seed failed:",e);await prisma.$disconnect();process.exit(1);});