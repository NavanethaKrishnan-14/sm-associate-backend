import { Schema, model, InferSchemaType } from "mongoose";

const customerSchema = new Schema({
  customerId:{type:String,unique:true,index:true},
  name:{type:String,required:true,trim:true},
  mobile:{type:String,required:true,trim:true,index:true},
  alternateMobile:{type:String,trim:true},
  email:{type:String,trim:true,lowercase:true},
  address:{type:String,trim:true},
  city:{type:String,trim:true},
  occupation:{type:String,trim:true},
  pan:{type:String,trim:true,uppercase:true},
  aadhaarLast4:{type:String,trim:true},
  notes:{type:String,trim:true}
},{timestamps:true});

export type CustomerDocument=InferSchemaType<typeof customerSchema>;
export const Customer=model("Customer",customerSchema);