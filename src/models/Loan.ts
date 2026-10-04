import { Schema, model } from "mongoose";

export const LOAN_STATUSES=[
  "NEW","DOCUMENTS_PENDING","SUBMITTED","UNDER_REVIEW","APPROVED","REJECTED","DISBURSED","CLOSED"
] as const;

const loanSchema=new Schema({
  loanId:{type:String,unique:true,index:true},
  customerId:{type:Schema.Types.ObjectId,ref:"Customer",required:true,index:true},
  loanType:{type:String,required:true,trim:true},
  requiredAmount:{type:Number,required:true,min:0},
  approvedAmount:{type:Number,min:0},
  financeCompany:{type:String,trim:true},
  status:{type:String,enum:LOAN_STATUSES,default:"NEW",index:true},
  applicationDate:{type:Date,default:Date.now},
  expectedDisbursementDate:{type:Date},
  disbursementDate:{type:Date},
  commission:{type:Number,default:0,min:0},
  rejectionReason:{type:String,trim:true},
  notes:{type:String,trim:true},
  assignedTo:{type:Schema.Types.ObjectId,ref:"User"}
},{timestamps:true});

export const Loan=model("Loan",loanSchema);