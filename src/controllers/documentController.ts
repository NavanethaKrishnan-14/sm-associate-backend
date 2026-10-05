import { Request,Response } from "express";
import { prisma } from "../config/db";
type DocumentItem={id:string;name:string;originalName:string;source:"Car Buying"|"Car Sold"|"Loan";recordId:string;recordLabel:string;uploadedAt?:Date;size?:number;documentKey:string;downloadPath:string;documentName?:string};
function addFixed(list:DocumentItem[],meta:any,name:DocumentItem["name"],source:DocumentItem["source"],recordId:string,recordLabel:string,key:string,downloadPath:string){if(meta?.storedName)list.push({id:source+"-"+recordId+"-"+key,name,originalName:meta.originalName||name,source,recordId,recordLabel,uploadedAt:meta.uploadedAt,size:meta.size,documentKey:key,downloadPath});}
export async function listDocuments(_req:Request,res:Response){
const [cars,loans,sales]=await Promise.all([
 prisma.car.findMany({include:{seller:{select:{id:true,customerId:true,name:true}},},orderBy:{createdAt:"desc"}}),
 prisma.loan.findMany({include:{customer:{select:{id:true,customerId:true,name:true}}},orderBy:{createdAt:"desc"}}),
 prisma.carSale.findMany({include:{car:{select:{id:true,vehicleId:true,registrationNumber:true,make:true,model:true}},buyer:{select:{id:true,customerId:true,name:true}}},orderBy:{createdAt:"desc"}})
]);
const documents:DocumentItem[]=[];
for(const car of cars){const d:any=car.documents||{},label=[car.vehicleId,car.registrationNumber,car.make,car.model].filter(Boolean).join(" - ")||car.id;
addFixed(documents,d.uploads?.carBook,"Car Book","Car Buying",car.id,label,"carBook","/cars/"+car.id+"/documents/carBook/download");
addFixed(documents,d.uploads?.carInsurance,"Car Insurance","Car Buying",car.id,label,"carInsurance","/cars/"+car.id+"/documents/carInsurance/download");
addFixed(documents,d.uploads?.agreement,"Agreement","Car Buying",car.id,label,"agreement","/cars/"+car.id+"/documents/agreement/download");
for(const item of Array.isArray(d.customUploads)?d.customUploads:[]){if(!item?.storedName)continue;const name=String(item.name);documents.push({id:"Car Buying-"+car.id+"-custom-"+name,name,originalName:item.originalName||name,source:"Car Buying",recordId:car.id,recordLabel:label,uploadedAt:item.uploadedAt,size:item.size,documentKey:"custom",documentName:name,downloadPath:"/cars/"+car.id+"/documents/custom/download?documentName="+encodeURIComponent(name)});}}
for(const sale of sales){const d:any=sale.documents||{},car:any=sale.car||{},label=[car.vehicleId,car.registrationNumber,car.make,car.model].filter(Boolean).join(" - ")||sale.id;
addFixed(documents,d.uploads?.idProof,"Buyer ID Proof","Car Sold",sale.id,label,"idProof","/cars/"+car.id+"/sale/documents/idProof/download");
addFixed(documents,d.uploads?.agreement,"Buyer Agreement","Car Sold",sale.id,label,"agreement","/cars/"+car.id+"/sale/documents/agreement/download");
for(const item of Array.isArray(d.customUploads)?d.customUploads:[]){if(!item?.storedName)continue;const name=String(item.name);documents.push({id:"Car Sold-"+sale.id+"-custom-"+name,name,originalName:item.originalName||name,source:"Car Sold",recordId:sale.id,recordLabel:label,uploadedAt:item.uploadedAt,size:item.size,documentKey:"custom",documentName:name,downloadPath:"/cars/"+car.id+"/sale/documents/custom/download?documentName="+encodeURIComponent(name)});}}
for(const loan of loans){const d:any=loan.documents||{},customer:any=loan.customer||{},label=[loan.loanId,customer.customerId,customer.name,loan.loanType].filter(Boolean).join(" - ")||loan.id;
for(const [key,name] of [["idProof","ID Proof"],["addressProof","Address Proof"],["incomeProof","Income Proof"],["bankStatement","Bank Statement"]] as [string,string][])addFixed(documents,d.uploads?.[key],name,"Loan",loan.id,label,key,"/loans/"+loan.id+"/documents/"+key+"/download");
for(const item of Array.isArray(d.customUploads)?d.customUploads:[]){if(!item?.storedName)continue;const name=String(item.name);documents.push({id:"Loan-"+loan.id+"-custom-"+name,name,originalName:item.originalName||name,source:"Loan",recordId:loan.id,recordLabel:label,uploadedAt:item.uploadedAt,size:item.size,documentKey:"custom",documentName:name,downloadPath:"/loans/"+loan.id+"/documents/custom/download?documentName="+encodeURIComponent(name)});}}
documents.sort((a,b)=>new Date(b.uploadedAt||0).getTime()-new Date(a.uploadedAt||0).getTime());res.json({success:true,data:documents});
}