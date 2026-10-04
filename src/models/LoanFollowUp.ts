import { Schema, model } from "mongoose";

const loanFollowUpSchema=new Schema({
  loanId:{type:Schema.Types.ObjectId,ref:"Loan",required:true,index:true},
  followUpDate:{type:Date,required:true},
  nextFollowUpDate:{type:Date},
  note:{type:String,required:true,trim:true},
  status:{type:String,enum:["OPEN","COMPLETED","CANCELLED"],default:"OPEN",index:true},
  createdBy:{type:Schema.Types.ObjectId,ref:"User"}
},{timestamps:true});

export const LoanFollowUp=model("LoanFollowUp",loanFollowUpSchema);