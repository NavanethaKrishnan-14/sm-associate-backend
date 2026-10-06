import multer from "multer";

const allowedMimeTypes=new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream"
]);
const allowedExtensions=new Set([".pdf",".jpg",".jpeg",".png",".webp",".doc",".docx"]);

export const loanDocumentUpload=multer({
  storage:multer.memoryStorage(),
  limits:{fileSize:10*1024*1024},
  fileFilter:(_req,file,cb)=>{
    const extension="."+String(file.originalname||"").split(".").pop()?.toLowerCase();
    if(allowedMimeTypes.has(file.mimetype)&&allowedExtensions.has(extension))return cb(null,true);
    cb(new Error("Unsupported document format. Use PDF, JPG, PNG, WEBP, DOC or DOCX."));
  }
});
