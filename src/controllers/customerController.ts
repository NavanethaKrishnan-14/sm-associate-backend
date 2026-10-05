import { Request,Response } from "express";
import { prisma } from "../config/db";
import { nextId,newDatabaseId } from "../utils/sequence";
import { toLegacy, renameRelations } from "../utils/legacy";

const customerSelect={id:true,customerId:true,name:true,mobile:true,alternateMobile:true,email:true,address:true,city:true,occupation:true,pan:true,aadhaarLast4:true,notes:true,createdAt:true,updatedAt:true};

export async function listCustomers(req:Request,res:Response){
 const search=String(req.query.search??"").trim();
 const where:any=search?{OR:[{name:{contains:search,mode:"insensitive"}},{mobile:{contains:search,mode:"insensitive"}},{customerId:{contains:search,mode:"insensitive"}}]}:{};
 const rows=await prisma.customer.findMany({where,orderBy:{createdAt:"desc"}});
 res.json({success:true,data:rows.map(toLegacy)});
}
export async function createCustomer(req:Request,res:Response){
 const allowed=["name","mobile","alternateMobile","email","address","city","occupation","pan","aadhaarLast4","notes"];
 const data:any={id:newDatabaseId(),customerId:await nextId("CUS","customer")};
 for(const key of allowed)if(req.body[key]!==undefined)data[key]=req.body[key];
 if(!data.name||!data.mobile)return res.status(400).json({success:false,message:"Customer name and mobile are required."});
 const created=await prisma.customer.create({data});
 res.status(201).json({success:true,data:toLegacy(created)});
}
export async function getCustomer(req:Request,res:Response){
 const row=await prisma.customer.findUnique({where:{id:String(req.params.id)}});
 if(!row)return res.status(404).json({success:false,message:"Customer not found."});
 res.json({success:true,data:toLegacy(row)});
}
export async function updateCustomer(req:Request,res:Response){
 const customer=await prisma.customer.findUnique({where:{id:String(req.params.id)}});
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});
 const patch:any={};
 for(const key of ["name","mobile","alternateMobile","email","address","city","occupation","pan","aadhaarLast4","notes"])if(req.body[key]!==undefined)patch[key]=req.body[key];
 const nextName=patch.name!==undefined?String(patch.name).trim():customer.name;
 const nextMobile=patch.mobile!==undefined?String(patch.mobile).trim():customer.mobile;
 if(!nextName||!nextMobile)return res.status(400).json({success:false,message:"Customer name and mobile are required."});
 patch.name=nextName;patch.mobile=nextMobile;
 const updated=await prisma.customer.update({where:{id:customer.id},data:patch});
 res.json({success:true,data:toLegacy(updated)});
}
export async function deleteCustomer(req:Request,res:Response){
 const customer=await prisma.customer.findUnique({where:{id:String(req.params.id)}});
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});
 const [loanCount,carCount,saleCount]=await Promise.all([
  prisma.loan.count({where:{customerId:customer.id}}),
  prisma.car.count({where:{sellerId:customer.id}}),
  prisma.carSale.count({where:{buyerId:customer.id}})
 ]);
 if(loanCount||carCount||saleCount)return res.status(409).json({success:false,message:"Customer cannot be deleted because transaction history exists.",data:{loanCount,carCount,saleCount}});
 await prisma.customer.delete({where:{id:customer.id}});
 res.json({success:true,message:"Customer deleted successfully."});
}
export async function getCustomerHistory(req:Request,res:Response){
 const customer=await prisma.customer.findUnique({where:{id:String(req.params.id)}});
 if(!customer)return res.status(404).json({success:false,message:"Customer not found."});
 const [loans,carsBought,carsSold]=await Promise.all([
  prisma.loan.findMany({where:{customerId:customer.id},include:{assignedTo:{select:{id:true,name:true,email:true,role:true}}},orderBy:{createdAt:"desc"}}),
  prisma.carSale.findMany({where:{buyerId:customer.id},include:{car:true},orderBy:{saleDate:"desc"}}),
  prisma.car.findMany({where:{sellerId:customer.id},orderBy:{createdAt:"desc"}})
 ]);
 const loanCommission=loans.reduce((sum,l)=>sum+(l.commission||0),0);
 const loanApprovedAmount=loans.reduce((sum,l)=>sum+(l.approvedAmount||0),0);
 const carsBoughtValue=carsBought.reduce((sum,s)=>sum+s.sellingPrice,0);
 const carsSoldValue=carsSold.reduce((sum,c)=>sum+c.purchasePrice,0);
 res.json({success:true,data:toLegacy({customer,loans:loans.map((row:any)=>renameRelations(row,{assignedTo:"assignedTo"})),carsBought:carsBought.map((row:any)=>renameRelations(row,{car:"carId"})),carsSold,summary:{loanCount:loans.length,loanCommission,loanApprovedAmount,carsBoughtCount:carsBought.length,carsBoughtValue,carsSoldCount:carsSold.length,carsSoldValue}})});
}