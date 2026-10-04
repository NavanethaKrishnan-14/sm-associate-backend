import { Request, Response } from "express";
import { FinanceService } from "../models/FinanceService";

const catalog=[
  {code:"DSA_FINANCE",name:"DSA Finance",category:"DSA",description:"DSA finance sourcing for multiple loan products.",sortOrder:1},
  {code:"HOME_LOAN",name:"Home Loan",category:"DSA_PRODUCT",parentCode:"DSA_FINANCE",description:"Home loan finance assistance through DSA.",sortOrder:2},
  {code:"CAR_LOAN",name:"Car Loan",category:"DSA_PRODUCT",parentCode:"DSA_FINANCE",description:"Car loan finance assistance through DSA.",sortOrder:3},
  {code:"BUSINESS_LOAN",name:"Business Loan",category:"DSA_PRODUCT",parentCode:"DSA_FINANCE",description:"Business loan finance assistance through DSA.",sortOrder:4},
  {code:"PERSONAL_LOAN",name:"Personal Loan",category:"DSA_PRODUCT",parentCode:"DSA_FINANCE",description:"Personal loan finance assistance through DSA.",sortOrder:5},
  {code:"INSURANCE_RENEWAL",name:"Insurance Renewal",category:"SERVICE",description:"Insurance renewal support.",sortOrder:6},
  {code:"GOLD_RESALE",name:"Gold Resale",category:"SERVICE",description:"Gold resale enquiry and support.",sortOrder:7}
] as const;

export async function listFinanceServices(_req:Request,res:Response){
  let services=await FinanceService.find({active:true}).sort({sortOrder:1,name:1});
  if(!services.length){
    await FinanceService.bulkWrite(catalog.map(service=>({updateOne:{filter:{code:service.code},update:{$setOnInsert:service},upsert:true}})));
    services=await FinanceService.find({active:true}).sort({sortOrder:1,name:1});
  }
  res.json({
    success:true,
    data:services,
    hierarchy:{
      dsaFinance:services.filter(service=>service.code==="DSA_FINANCE"),
      loanProducts:services.filter(service=>service.parentCode==="DSA_FINANCE"),
      otherServices:services.filter(service=>service.category==="SERVICE")
    }
  });
}

export async function seedFinanceServices(_req:Request,res:Response){
  await FinanceService.bulkWrite(catalog.map(service=>({updateOne:{filter:{code:service.code},update:{$set:service},upsert:true}})));
  const services=await FinanceService.find().sort({sortOrder:1,name:1});
  res.json({success:true,data:services});
}
