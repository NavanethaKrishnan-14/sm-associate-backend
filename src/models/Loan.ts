import { Schema, model } from "mongoose";

const loanSchema=new Schema({
  loanId:{type:String,unique:true,index:true},
  customerId:{type:Schema.Types.ObjectId,ref:"Customer",required:true,index:true},
  loanType:{type:String,required:true,trim:true},
  requiredAmount:{type:Number,required:true,min:0},
  financeCompany:{type:String,trim:true},
  status:{type:String,enum:["NEW","DOCUMENTS_PENDING","SUBMITTED","UNDER_REVIEW","APPROVED","REJECTED","DISBURSED","CLOSED"],default:"NEW",index:true},
  applicationDate:{type:Date,default:Date.now},
  commission:{type:Number,default:0,min:0},
  notes:{type:String,trim:true}
},{timestamps:true});

export const Loan=model("Loan",loanSchema);