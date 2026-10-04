import { Request, Response } from "express";
import { User } from "../models/User";
import { comparePassword, hashPassword, signToken } from "../utils/auth";

const publicUser=(user:any)=>({id:String(user._id),name:user.name,email:user.email,role:user.role,isActive:user.isActive});

export async function login(req:Request,res:Response){
 const email=String(req.body.email??"").trim().toLowerCase(), password=String(req.body.password??"");
 if(!email||!password)return res.status(400).json({success:false,message:"Email and password are required."});
 const user=await User.findOne({email}).select("+passwordHash");
 if(!user||!user.isActive||!(await comparePassword(password,user.passwordHash)))return res.status(401).json({success:false,message:"Invalid email or password."});
 const token=signToken({userId:String(user._id),role:user.role as "ADMIN"|"STAFF"});
 res.json({success:true,data:{token,user:publicUser(user)}});
}

export async function me(req:Request,res:Response){ res.json({success:true,data:req.user}); }

export async function listUsers(_req:Request,res:Response){
 const users=await User.find().select("name email role isActive createdAt").sort({createdAt:-1});
 res.json({success:true,data:users.map(publicUser)});
}

export async function createUser(req:Request,res:Response){
 const name=String(req.body.name??"").trim(), email=String(req.body.email??"").trim().toLowerCase(), password=String(req.body.password??"");
 const role=req.body.role==="ADMIN"?"ADMIN":"STAFF";
 if(!name||!email||password.length<8)return res.status(400).json({success:false,message:"Name, valid email and a password of at least 8 characters are required."});
 if(await User.exists({email}))return res.status(409).json({success:false,message:"A user with this email already exists."});
 const user=await User.create({name,email,passwordHash:await hashPassword(password),role});
 res.status(201).json({success:true,data:publicUser(user)});
}

export async function updateUser(req:Request,res:Response){
 const target=await User.findById(req.params.id);
 if(!target)return res.status(404).json({success:false,message:"User not found."});
 const role=req.body.role==="ADMIN"||req.body.role==="STAFF"?req.body.role:target.role;
 const isActive=typeof req.body.isActive==="boolean"?req.body.isActive:target.isActive;
 if(String(target._id)===req.user?.id && (!isActive||role!=="ADMIN"))return res.status(400).json({success:false,message:"You cannot deactivate yourself or remove your own ADMIN role."});
 if(target.role==="ADMIN" && (role!=="ADMIN"||!isActive)){
   const activeAdmins=await User.countDocuments({role:"ADMIN",isActive:true});
   if(activeAdmins<=1)return res.status(400).json({success:false,message:"At least one active ADMIN account must remain."});
 }
 target.role=role; target.isActive=isActive; await target.save();
 res.json({success:true,data:publicUser(target)});
}
