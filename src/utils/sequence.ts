import { Schema, model } from "mongoose";

const counterSchema=new Schema({name:{type:String,unique:true},value:{type:Number,default:0}});
const Counter=model("Counter",counterSchema);

export async function nextSequence(name:string):Promise<number>{
  const counter=await Counter.findOneAndUpdate({name},{$inc:{value:1}},{upsert:true,new:true});
  return counter.value;
}
export async function nextId(prefix:string,sequenceName:string):Promise<string>{
  const value=await nextSequence(sequenceName);
  return `${prefix}-${String(value).padStart(5,"0")}`;
}