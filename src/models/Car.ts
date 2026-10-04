import { Schema, model } from "mongoose";

const carSchema=new Schema({
  vehicleId:{type:String,unique:true,index:true},
  sellerId:{type:Schema.Types.ObjectId,ref:"Customer",required:true,index:true},
  registrationNumber:{type:String,required:true,trim:true,uppercase:true,index:true},
  make:{type:String,required:true,trim:true},
  model:{type:String,required:true,trim:true},
  year:{type:Number,min:1900},
  ownerNumber:{type:Number,min:1},
  km:{type:Number,min:0},
  fuel:{type:String,trim:true},
  purchasePrice:{type:Number,required:true,min:0},
  status:{type:String,enum:["AVAILABLE","RESERVED","SOLD"],default:"AVAILABLE",index:true},
  purchaseDate:{type:Date,default:Date.now},
  notes:{type:String,trim:true}
},{timestamps:true});

export const Car=model("Car",carSchema);