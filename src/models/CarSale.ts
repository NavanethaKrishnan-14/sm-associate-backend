import { Schema, model } from "mongoose";

const carSaleSchema=new Schema({
  saleId:{type:String,unique:true,index:true},
  carId:{type:Schema.Types.ObjectId,ref:"Car",required:true,unique:true,index:true},
  buyerId:{type:Schema.Types.ObjectId,ref:"Customer",required:true,index:true},
  sellingPrice:{type:Number,required:true,min:0},
  sellingExpenses:{type:Number,default:0,min:0},
  totalInvestment:{type:Number,required:true,min:0},
  profit:{type:Number,required:true},
  saleDate:{type:Date,default:Date.now},
  notes:{type:String,trim:true}
},{timestamps:true});

export const CarSale=model("CarSale",carSaleSchema);