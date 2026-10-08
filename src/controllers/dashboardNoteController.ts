import {Request,Response} from "express";
import {prisma} from "../config/db";

function cleanText(value:unknown){
  return String(value??"").replace(/\r\n/g,"\n").trim();
}

export async function getDashboardNotes(_req:Request,res:Response){
  try{
    const notes=await prisma.dashboardNote.findMany({orderBy:{updatedAt:"desc"}});
    return res.json({success:true,data:notes});
  }catch(error){
    console.error("Dashboard notes load failed:",error);
    return res.status(500).json({success:false,message:"Unable to load dashboard notes.",code:"DASHBOARD_NOTES_LOAD_FAILED"});
  }
}

export async function createDashboardNote(req:Request,res:Response){
  const text=cleanText(req.body?.text);
  if(!text)return res.status(400).json({success:false,message:"Note text is required."});
  if(text.length>5000)return res.status(400).json({success:false,message:"Note is too long. Maximum 5000 characters."});
  try{
    const note=await prisma.dashboardNote.create({data:{text}});
    return res.status(201).json({success:true,message:"Note saved successfully.",data:note});
  }catch(error){
    console.error("Dashboard note create failed:",error);
    return res.status(500).json({success:false,message:"Unable to save dashboard note.",code:"DASHBOARD_NOTE_CREATE_FAILED"});
  }
}

export async function updateDashboardNote(req:Request,res:Response){
  const id=String(req.params.id||"").trim();
  const text=cleanText(req.body?.text);
  if(!id)return res.status(400).json({success:false,message:"Note ID is required."});
  if(!text)return res.status(400).json({success:false,message:"Note text is required."});
  if(text.length>5000)return res.status(400).json({success:false,message:"Note is too long. Maximum 5000 characters."});
  try{
    const note=await prisma.dashboardNote.update({where:{id},data:{text}});
    return res.json({success:true,message:"Note updated successfully.",data:note});
  }catch(error:any){
    if(error?.code==="P2025")return res.status(404).json({success:false,message:"Dashboard note not found."});
    console.error("Dashboard note update failed:",error);
    return res.status(500).json({success:false,message:"Unable to update dashboard note.",code:"DASHBOARD_NOTE_UPDATE_FAILED"});
  }
}

export async function deleteDashboardNote(req:Request,res:Response){
  const id=String(req.params.id||"").trim();
  if(!id)return res.status(400).json({success:false,message:"Note ID is required."});
  try{
    await prisma.dashboardNote.delete({where:{id}});
    return res.json({success:true,message:"Note deleted successfully."});
  }catch(error:any){
    if(error?.code==="P2025")return res.status(404).json({success:false,message:"Dashboard note not found."});
    console.error("Dashboard note delete failed:",error);
    return res.status(500).json({success:false,message:"Unable to delete dashboard note.",code:"DASHBOARD_NOTE_DELETE_FAILED"});
  }
}
