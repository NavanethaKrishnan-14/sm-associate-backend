import { Request, Response } from "express";
import { prisma } from "../config/db";
import { comparePassword, hashPassword, signToken } from "../utils/auth";

const publicUser = (user:any) => ({
  id: String(user.id),
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive
});

export async function login(req:Request,res:Response){
  const email=String(req.body.email??"").trim().toLowerCase();
  const password=String(req.body.password??"");
  if(!email||!password)return res.status(400).json({success:false,message:"Email and password are required."});
  const user=await prisma.user.findUnique({where:{email}});
  if(!user||!user.isActive||!(await comparePassword(password,user.passwordHash)))return res.status(401).json({success:false,message:"Invalid email or password."});
  const token=signToken({userId:user.id,role:user.role});


  const safeUser = publicUser(user);

  // Return the token in both the established data envelope and at the top
  // level for clients or proxies that unwrap the response differently.
  return res.status(200).json({
    success: true,
    message: "Login successful.",
    token,
    accessToken: token,
    data: { token, accessToken: token, user: safeUser }
  });
}

export async function me(req:Request,res:Response){ return res.json({success:true,data:req.user}); }

export async function listUsers(_req:Request,res:Response){
  const users=await prisma.user.findMany({orderBy:{createdAt:"desc"},select:{id:true,name:true,email:true,role:true,isActive:true,createdAt:true}});
  return res.json({success:true,data:users.map(publicUser)});
}

export async function createUser(req:Request,res:Response){
  const name=String(req.body.name??"").trim();
  const email=String(req.body.email??"").trim().toLowerCase();
  const password=String(req.body.password??"");
  const role=req.body.role==="ADMIN"?"ADMIN":"STAFF";
  if(!name||!email||password.length<8)return res.status(400).json({success:false,message:"Name, valid email and a password of at least 8 characters are required."});
  if(await prisma.user.findUnique({where:{email},select:{id:true}}))return res.status(409).json({success:false,message:"A user with this email already exists."});
  const user=await prisma.user.create({data:{name,email,passwordHash:await hashPassword(password),role,isActive:true}});
  return res.status(201).json({success:true,data:publicUser(user)});
}

export async function updateUser(req:Request,res:Response){
  const target=await prisma.user.findUnique({where:{id:String(req.params.id)}});
  if(!target)return res.status(404).json({success:false,message:"User not found."});
  const nextRole=req.body.role==="ADMIN"||req.body.role==="STAFF"?req.body.role:target.role;
  const nextActive=typeof req.body.isActive==="boolean"?req.body.isActive:target.isActive;
  const nextName=req.body.name!==undefined?String(req.body.name).trim():target.name;
  const nextEmail=req.body.email!==undefined?String(req.body.email).trim().toLowerCase():target.email;
  if(!nextName||!nextEmail)return res.status(400).json({success:false,message:"Name and email are required."});
  if(target.id===req.user?.id&&(!nextActive||nextRole!=="ADMIN"))return res.status(400).json({success:false,message:"You cannot deactivate yourself or remove your own ADMIN role."});
  if(target.role==="ADMIN"&&(nextRole!=="ADMIN"||!nextActive)){
    const activeAdmins=await prisma.user.count({where:{role:"ADMIN",isActive:true}});
    if(activeAdmins<=1)return res.status(400).json({success:false,message:"At least one active ADMIN account must remain."});
  }
  const duplicate=await prisma.user.findFirst({where:{email:nextEmail,NOT:{id:target.id}},select:{id:true}});
  if(duplicate)return res.status(409).json({success:false,message:"A user with this email already exists."});
  let passwordHash=target.passwordHash;
  if(req.body.password!==undefined){
    const password=String(req.body.password);
    if(password.length<8)return res.status(400).json({success:false,message:"Password must be at least 8 characters."});
    passwordHash=await hashPassword(password);
  }
  const user=await prisma.user.update({where:{id:target.id},data:{name:nextName,email:nextEmail,role:nextRole,isActive:nextActive,passwordHash}});
  return res.json({success:true,data:publicUser(user)});
}

export async function deleteUser(req:Request,res:Response){
  const target=await prisma.user.findUnique({where:{id:String(req.params.id)}});
  if(!target)return res.status(404).json({success:false,message:"User not found."});
  if(target.id===req.user?.id)return res.status(400).json({success:false,message:"You cannot delete your own account."});
  if(target.role==="ADMIN"&&target.isActive){
    const activeAdmins=await prisma.user.count({where:{role:"ADMIN",isActive:true}});
    if(activeAdmins<=1)return res.status(400).json({success:false,message:"At least one active ADMIN account must remain."});
  }
  await prisma.user.delete({where:{id:target.id}});
  return res.json({success:true,message:"User deleted successfully."});
}
