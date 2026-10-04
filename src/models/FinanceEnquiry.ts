import { Schema, model } from "mongoose";
import { FINANCE_SERVICE_TYPES } from "./FinanceService";

export const ENQUIRY_STATUSES=["NEW","IN_PROGRESS","COMPLETED","CANCELLED"] as const;

const financeEnquirySchema=new Schema({
  enquiryId:{type:String,unique:true,index:true},
  customerId:{type:Schema.Types.ObjectId,ref:"Customer",required:true,index:true},
  serviceCode:{type:String,enum:FINANCE_SERVICE_TYPES,required:true,index:true},
  financeCompany:{type:String,trim:true},
  requiredAmount:{type:Number,min:0},
  status:{type:String,enum:ENQUIRY_STATUSES,default:"NEW",index:true},
  followUpDate:{type:Date},
  notes:{type:String,trim:true},
  assignedTo:{type:Schema.Types.ObjectId,ref:"User"}
},{timestamps:true});

export const FinanceEnquiry=model("FinanceEnquiry",financeEnquirySchema);
