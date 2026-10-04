import { Request, Response } from "express";
import { FinanceService, FINANCE_SERVICE_TYPES } from "../models/FinanceService";

const catalog=[
  {code:"HOME_LOAN",name:"Home Loan",category:"LOAN",description:"Housing finance assistance.",sortOrder:1},
  {code:"CAR_LOAN",name:"Car Loan",category:"LOAN",description:"Vehicle finance assistance.",sortOrder:2},
  {code:"BUSINESS_LOAN",name:"Business Loan",category:"LOAN",description:"Business funding assistance.",sortOrder:3},
  {code:"PERSONAL_LOAN",name:"Personal Loan",category:"LOAN",description:"Personal finance assistance.",sortOrder:4},
  {code:"INSURANCE_RENEWAL",name:"Insurance Renewal",category:"SERVICE",description:"Insurance renewal support.",sortOrder:5},
  {code:"GOLD_RESALE",name:"Gold Resale",category:"SERVICE",description:"Gold resale enquiry and support.",sortOrder:6},
  {code:"DSA_FINANCE",name:"DSA Finance",category:"DSA",description:"Direct selling agent finance sourcing.",sortOrder:7}
] as const;

export async function listFinanceServices(_req:Request,res:Response){
  let services=await FinanceService.find({active:true}).sort({sortOrder:1,name:1});
  if(!services.length){
    await FinanceService.bulkWrite(catalog.map(service=>({updateOne:{filter:{code:service.code},update:{$setOnInsert:service},upsert:true}})));
    services=await FinanceService.find({active:true}).sort({sortOrder:1,name:1});
  }
  res.json({success:true,data:services});
}

export async function seedFinanceServices(_req:Request,res:Response){
  await FinanceService.bulkWrite(catalog.map(service=>({updateOne:{filter:{code:service.code},update:{$set:service},upsert:true}})));
  const services=await FinanceService.find().sort({sortOrder:1,name:1});
  res.json({success:true,data:services});
}
