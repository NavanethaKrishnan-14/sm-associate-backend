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
  notes:{type:String,trim:true},
  documents:{
    idProof:{type:Boolean,default:false},
    agreement:{type:Boolean,default:false},
    customDocuments:{type:[{type:String,trim:true,maxlength:100}],default:[]},
    uploads:{
      idProof:{
        originalName:{type:String},
        storedName:{type:String},
        size:{type:Number},
        uploadedAt:{type:Date}
      },
      agreement:{
        originalName:{type:String},
        storedName:{type:String},
        size:{type:Number},
        uploadedAt:{type:Date}
      }
    },
    customUploads:[{
      name:{type:String,trim:true,maxlength:100},
      originalName:{type:String},
      storedName:{type:String},
      size:{type:Number},
      uploadedAt:{type:Date}
    }]
  }
},{timestamps:true});

export const CarSale=model("CarSale",carSaleSchema);