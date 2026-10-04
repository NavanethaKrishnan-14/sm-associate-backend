import { Schema, model } from "mongoose";

export const FINANCE_SERVICE_TYPES=[
  "HOME_LOAN","CAR_LOAN","BUSINESS_LOAN","PERSONAL_LOAN",
  "INSURANCE_RENEWAL","GOLD_RESALE","DSA_FINANCE"
] as const;

const financeServiceSchema=new Schema({
  code:{type:String,enum:FINANCE_SERVICE_TYPES,unique:true,index:true,required:true},
  name:{type:String,required:true,trim:true},
  category:{type:String,enum:["LOAN","SERVICE","DSA"],required:true},
  description:{type:String,trim:true},
  active:{type:Boolean,default:true,index:true},
  sortOrder:{type:Number,default:0}
},{timestamps:true});

export const FinanceService=model("FinanceService",financeServiceSchema);
