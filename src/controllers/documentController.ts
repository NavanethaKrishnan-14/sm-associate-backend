import { Request, Response } from "express";
import { prisma } from "../config/db";
import { Car } from "../models/Car";
import { CarSale } from "../models/CarSale";
import { Loan } from "../models/Loan";

type DocumentItem={
  id:string; name:string; originalName:string; url?:string;
  source:"Customer"|"Car Buying"|"Car Sold"|"Loan";
  recordId:string; recordLabel:string; uploadedAt?:Date; size?:number;
  documentKey:string; downloadPath:string; documentName?:string; status?:string;
};

function addFixed(list:DocumentItem[],meta:any,name:string,source:DocumentItem["source"],recordId:string,recordLabel:string,key:string,downloadPath:string){
  if(meta?.storedName) list.push({id:source+"-"+recordId+"-"+key,name,originalName:meta.originalName||name,url:meta.url,source,recordId,recordLabel,uploadedAt:meta.uploadedAt,size:meta.size,documentKey:key,downloadPath});
}

export async function listDocuments(_req:Request,res:Response){
  const [cars,loans,sales,loanChecklist]=await Promise.all([
    Car.find().populate("sellerId","customerId name").sort({createdAt:-1}),
    Loan.find().populate("customerId","customerId name").sort({createdAt:-1}),
    CarSale.find().populate("carId","vehicleId registrationNumber make model").populate("buyerId","customerId name").sort({createdAt:-1}),
    prisma.loanDocument.findMany({orderBy:{createdAt:"desc"},include:{loan:{include:{customer:{select:{id:true,customerId:true,name:true}}}}}})
  ]);
  const documents:DocumentItem[]=[];

  // Customer documents are stored directly on the customer record. Include them
  // here so an upload is visible in the central Documents screen as well.
  const { Customer } = await import("../models/Customer");
  const customers=await Customer.find().sort({createdAt:-1});
  for(const customer of customers){
    const d:any=(customer as any).documents||{};
    const label=[customer.customerId,customer.name,customer.mobile].filter(Boolean).join(" - ")||String(customer._id);
    const fixed:[string,string][]=[["idProof","ID Proof"],["addressProof","Address Proof"],["incomeProof","Income Proof"],["bankStatement","Bank Statement"]];
    for(const [key,name] of fixed){
      addFixed(documents,d.uploads?.[key],name,"Customer",String(customer._id),label,key,"/customers/"+customer._id+"/documents/"+key);
    }
    for(const item of Array.isArray(d.customUploads)?d.customUploads:[]){
      if(!item?.storedName)continue;
      const name=String(item.name);
      documents.push({id:"Customer-"+customer._id+"-custom-"+name,name,originalName:item.originalName||name,url:item.url,source:"Customer",recordId:String(customer._id),recordLabel:label,uploadedAt:item.uploadedAt,size:item.size,documentKey:"custom",documentName:name,downloadPath:"/customers/"+customer._id+"/documents/custom"});
    }
  }

  for(const car of cars){
    const d:any=(car as any).documents||{};
    const label=[car.vehicleId,car.registrationNumber,car.make,car.model].filter(Boolean).join(" - ")||String(car._id);
    addFixed(documents,d.uploads?.carBook,"Car Book","Car Buying",String(car._id),label,"carBook","/cars/"+car._id+"/documents/carBook/download");
    addFixed(documents,d.uploads?.carInsurance,"Car Insurance","Car Buying",String(car._id),label,"carInsurance","/cars/"+car._id+"/documents/carInsurance/download");
    addFixed(documents,d.uploads?.agreement,"Agreement","Car Buying",String(car._id),label,"agreement","/cars/"+car._id+"/documents/agreement/download");
    for(const item of Array.isArray(d.customUploads)?d.customUploads:[]){
      if(!item?.storedName)continue;
      const name=String(item.name);
      documents.push({id:"Car Buying-"+car._id+"-custom-"+name,name,originalName:item.originalName||name,url:item.url,source:"Car Buying",recordId:String(car._id),recordLabel:label,uploadedAt:item.uploadedAt,size:item.size,documentKey:"custom",documentName:name,downloadPath:"/cars/"+car._id+"/documents/custom/download?documentName="+encodeURIComponent(name)});
    }
  }

  for(const sale of sales){
    const d:any=(sale as any).documents||{};
    const car:any=sale.carId||{};
    const label=[car.vehicleId,car.registrationNumber,car.make,car.model].filter(Boolean).join(" - ")||String(sale._id);
    addFixed(documents,d.uploads?.idProof,"Buyer ID Proof","Car Sold",String(sale._id),label,"idProof","/cars/"+car._id+"/sale/documents/idProof/download");
    addFixed(documents,d.uploads?.agreement,"Buyer Agreement","Car Sold",String(sale._id),label,"agreement","/cars/"+car._id+"/sale/documents/agreement/download");
    for(const item of Array.isArray(d.customUploads)?d.customUploads:[]){
      if(!item?.storedName)continue;
      const name=String(item.name);
      documents.push({id:"Car Sold-"+sale._id+"-custom-"+name,name,originalName:item.originalName||name,url:item.url,source:"Car Sold",recordId:String(sale._id),recordLabel:label,uploadedAt:item.uploadedAt,size:item.size,documentKey:"custom",documentName:name,downloadPath:"/cars/"+car._id+"/sale/documents/custom/download?documentName="+encodeURIComponent(name)});
    }
  }

  for(const loan of loans){
    const d:any=(loan as any).documents||{};
    const customer:any=loan.customerId||{};
    const label=[loan.loanId,customer.customerId,customer.name,loan.loanType].filter(Boolean).join(" - ")||String(loan._id);
    const fixed:[string,string][]=[["idProof","ID Proof"],["addressProof","Address Proof"],["incomeProof","Income Proof"],["bankStatement","Bank Statement"]];
    for(const [key,name] of fixed)addFixed(documents,d.uploads?.[key],name,"Loan",String(loan._id),label,key,"/loans/"+loan._id+"/documents/"+key+"/download");
    for(const item of Array.isArray(d.customUploads)?d.customUploads:[]){
      if(!item?.storedName)continue;
      const name=String(item.name);
      documents.push({id:"Loan-"+loan._id+"-custom-"+name,name,originalName:item.originalName||name,url:item.url,source:"Loan",recordId:String(loan._id),recordLabel:label,uploadedAt:item.uploadedAt,size:item.size,documentKey:"custom",documentName:name,downloadPath:"/loans/"+loan._id+"/documents/custom/download?documentName="+encodeURIComponent(name)});
    }
  }

  for(const item of loanChecklist){
    const loan:any=item.loan||{};
    const customer:any=loan.customer||{};
    documents.push({
      id:item.documentId,
      name:item.name,
      originalName:item.originalName||"No file attached — demo checklist",
      source:"Loan",
      recordId:String(item.loanId),
      recordLabel:[loan.loanId,customer.customerId,customer.name,loan.loanType].filter(Boolean).join(" - ")||String(item.loanId),
      uploadedAt:item.uploadedAt||item.createdAt,
      documentKey:"checklist",
      downloadPath:"",
      status:item.status
    });
  }

  documents.sort((a,b)=>new Date(b.uploadedAt||0).getTime()-new Date(a.uploadedAt||0).getTime());
  res.json({success:true,data:documents});
}


export async function downloadDocumentFile(req:Request,res:Response){
  const publicId=String(req.params.publicId||"").trim();
  if(!publicId)return res.status(400).json({success:false,message:"Document id is required."});
  const document=await prisma.document.findUnique({where:{publicId}});
  if(!document)return res.status(404).json({success:false,message:"Document not found."});
  res.setHeader("Content-Type",document.mimeType||"application/octet-stream");
  res.setHeader("Content-Length",String(document.size));
  res.setHeader("Content-Disposition",'attachment; filename="'+String(document.originalName||"document").replace(/["\\]/g,"_")+'"');
  return res.send(Buffer.from(document.data));
}
