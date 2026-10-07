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
  notes:{type:String,trim:true},
  documents:{
    idProof:{type:Boolean,default:false},
    addressProof:{type:Boolean,default:false},
    incomeProof:{type:Boolean,default:false},
    bankStatement:{type:Boolean,default:false},
    customDocuments:{type:[String],default:[]},
    uploads:{type:Schema.Types.Mixed,default:{}},
    customUploads:{type:[Schema.Types.Mixed],default:[]}
  }
},{timestamps:true});

export type CustomerDocument=InferSchemaType<typeof customerSchema>;
export const Customer=model("Customer",customerSchema);