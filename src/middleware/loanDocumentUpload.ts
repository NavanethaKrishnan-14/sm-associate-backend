import multer from "multer";

const allowedMimeTypes=new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

export const loanDocumentUpload=multer({
  storage:multer.memoryStorage(),
  limits:{fileSize:10*1024*1024},
  fileFilter:(_req,file,cb)=>{
    if(allowedMimeTypes.has(file.mimetype))return cb(null,true);
    cb(new Error("Unsupported document format. Use PDF, JPG, PNG, WEBP, DOC or DOCX."));
  }
});
