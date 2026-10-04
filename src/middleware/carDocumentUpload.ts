import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir=path.resolve(process.cwd(),"uploads","cars");
fs.mkdirSync(uploadDir,{recursive:true});

const allowedMimeTypes=new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const storage=multer.diskStorage({
  destination:(_req,_file,cb)=>cb(null,uploadDir),
  filename:(_req,file,cb)=>{
    const extension=path.extname(file.originalname).toLowerCase();
    const base=path.basename(file.originalname,extension).replace(/[^a-zA-Z0-9_-]/g,"-").replace(/-+/g,"-").slice(0,70)||"document";
    cb(null,Date.now()+"-"+base+extension);
  }
});

export const carDocumentUpload=multer({
  storage,
  limits:{fileSize:10*1024*1024},
  fileFilter:(_req,file,cb)=>{
    if(allowedMimeTypes.has(file.mimetype))return cb(null,true);
    cb(new Error("Unsupported document format. Use PDF, JPG, PNG, WEBP, DOC or DOCX."));
  }
});
