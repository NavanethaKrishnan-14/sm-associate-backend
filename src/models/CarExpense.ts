import { Schema, model } from "mongoose";

const carExpenseSchema=new Schema({
  carId:{type:Schema.Types.ObjectId,ref:"Car",required:true,index:true},
  category:{type:String,required:true,trim:true},
  amount:{type:Number,required:true,min:0},
  description:{type:String,trim:true},
  date:{type:Date,default:Date.now}
},{timestamps:true});

export const CarExpense=model("CarExpense",carExpenseSchema);