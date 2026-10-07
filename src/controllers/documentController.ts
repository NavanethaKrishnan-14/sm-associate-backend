import { Request, Response } from "express";
import { Car } from "../models/Car";
import { CarSale } from "../models/CarSale";
import { Loan } from "../models/Loan";

type DocumentItem={
  id:string; name:string; originalName:string; url?:string;
  source:"Car Buying"|"Car Sold"|"Loan";
  recordId:string; recordLabel:string; uploadedAt?:Date; size?:number;
  documentKey:string; downloadPath:string; documentName?:string;
};

function addFixed(list:DocumentItem[],meta:any,name:string,source:DocumentItem["source"],recordId:string,recordLabel:string,key:string,downloadPath:string){
  if(meta?.storedName) list.push({id:source+"-"+recordId+"-"+key,name,originalName:meta.originalName||name,url:meta.url,source,recordId,recordLabel,uploadedAt:meta.uploadedAt,size:meta.size,documentKey:key,downloadPath});
}

export async function listDocuments(_req:Request,res:Response){
  const [cars,loans,sales]=await Promise.all([
    Car.find().populate("sellerId","customerId name").sort({createdAt:-1}),
    Loan.find().populate("customerId","customerId name").sort({createdAt:-1}),
    CarSale.find().populate("carId","vehicleId registrationNumber make model").populate("buyerId","customerId name").sort({createdAt:-1})
  ]);
  const documents:DocumentItem[]=[];

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

  documents.sort((a,b)=>new Date(b.uploadedAt||0).getTime()-new Date(a.uploadedAt||0).getTime());
  res.json({success:true,data:documents});
}
