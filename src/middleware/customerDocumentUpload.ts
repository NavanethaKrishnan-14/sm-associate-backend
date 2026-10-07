import multer from "multer";

const allowedMimeTypes=new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/octet-stream"
]);

const allowedExtensions=new Set([
  ".pdf",".jpg",".jpeg",".png",".webp",
  ".doc",".docx",".xls",".xlsx",".ppt",".pptx",".txt",".csv"
]);

export const customerDocumentUpload=multer({
  storage:multer.memoryStorage(),
  limits:{fileSize:10*1024*1024},
  fileFilter:(_req,file,cb)=>{
    const original=String(file.originalname||"");
    const extension="."+((original.split(".").pop()||"").toLowerCase());
    const mime=String(file.mimetype||"").toLowerCase();

    if(allowedExtensions.has(extension)&&(!mime||allowedMimeTypes.has(mime))){
      return cb(null,true);
    }

    cb(new Error("Unsupported document format. Supported: PDF, JPG, PNG, WEBP, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT and CSV."));
  }
});
