import { Request,Response } from "express";
import { prisma } from "../config/db";
import { newDatabaseId } from "../utils/sequence";
import { toLegacy } from "../utils/legacy";
const catalog=[
{code:"DSA_FINANCE",name:"DSA Finance",category:"DSA",description:"DSA finance sourcing for multiple loan products.",sortOrder:1},
{code:"HOME_LOAN",name:"Home Loan",category:"DSA_PRODUCT",parentCode:"DSA_FINANCE",description:"Home loan finance assistance through DSA.",sortOrder:2},
{code:"CAR_LOAN",name:"Car Loan",category:"DSA_PRODUCT",parentCode:"DSA_FINANCE",description:"Car loan finance assistance through DSA.",sortOrder:3},
{code:"BUSINESS_LOAN",name:"Business Loan",category:"DSA_PRODUCT",parentCode:"DSA_FINANCE",description:"Business loan finance assistance through DSA.",sortOrder:4},
{code:"PERSONAL_LOAN",name:"Personal Loan",category:"DSA_PRODUCT",parentCode:"DSA_FINANCE",description:"Personal loan finance assistance through DSA.",sortOrder:5},
{code:"INSURANCE_RENEWAL",name:"Insurance Renewal",category:"SERVICE",description:"Insurance renewal support.",sortOrder:6},
{code:"GOLD_RESALE",name:"Gold Resale",category:"SERVICE",description:"Gold resale enquiry and support.",sortOrder:7}
] as const;
async function ensureCatalog(){for(const item of catalog)await prisma.financeService.upsert({where:{code:item.code},update:{...item},create:{id:newDatabaseId(),...item}});}
export async function listFinanceServices(_req:Request,res:Response){
let services=await prisma.financeService.findMany({where:{active:true},orderBy:[{sortOrder:"asc"},{name:"asc"}]});
if(!services.length){await ensureCatalog();services=await prisma.financeService.findMany({where:{active:true},orderBy:[{sortOrder:"asc"},{name:"asc"}]});}
res.json({success:true,data:toLegacy(services),hierarchy:{dsaFinance:toLegacy(services.filter(x=>x.code==="DSA_FINANCE")),loanProducts:toLegacy(services.filter(x=>x.parentCode==="DSA_FINANCE")),otherServices:toLegacy(services.filter(x=>x.category==="SERVICE"))}});
}
export async function seedFinanceServices(_req:Request,res:Response){await ensureCatalog();const services=await prisma.financeService.findMany({orderBy:[{sortOrder:"asc"},{name:"asc"}]});res.json({success:true,data:toLegacy(services)});}
