const http=require("http");
const app=require("../dist/src/app").default;

function request(serverPort,path,options={}){
 return new Promise((resolve,reject)=>{
  const body=options.body?JSON.stringify(options.body):null;
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(body)headers["Content-Length"]=Buffer.byteLength(body);
  const req=http.request({hostname:"127.0.0.1",port:serverPort,path,method:options.method||"GET",headers},res=>{
   let text="";res.setEncoding("utf8");res.on("data",c=>text+=c);res.on("end",()=>{let json;try{json=JSON.parse(text);}catch{}resolve({status:res.statusCode,body:text,json});});
  });
  req.on("error",reject);if(body)req.write(body);req.end();
 });
}
function assert(ok,message){if(!ok)throw new Error(message);}

(async()=>{
 const server=app.listen(0,"127.0.0.1",async()=>{
  const port=server.address().port;
  try{
   let r=await request(port,"/api/v1/health");assert(r.status===200,"Health endpoint failed");
   r=await request(port,"/api/v1/health/db");assert(r.status===200&&r.json?.database==="connected","PostgreSQL health check failed");
   const email=String(process.env.ADMIN_EMAIL||"").trim().toLowerCase(),password=String(process.env.ADMIN_PASSWORD||"");
   assert(email&&password,"ADMIN_EMAIL/ADMIN_PASSWORD are required for smoke tests");
   r=await request(port,"/api/v1/auth/login",{method:"POST",body:{email,password}});
   assert(r.status===200&&r.json?.data?.token,"Login failed");
   const token=r.json.data.token,auth={"Authorization":"Bearer "+token};
   r=await request(port,"/api/v1/auth/me",{headers:auth});assert(r.status===200&&r.json?.data?.email===email,"Auth /me failed");
   r=await request(port,"/api/v1/customers",{headers:auth});assert(r.status===200&&Array.isArray(r.json?.data),"Customer listing failed");
   const stamp=Date.now();
   r=await request(port,"/api/v1/customers",{method:"POST",headers:auth,body:{name:"Smoke Customer",mobile:"9"+String(stamp).slice(-9),email:"smoke-"+stamp+"@example.test",city:"Tirunelveli"}});assert(r.status===201,"Customer creation failed");
   const customer=r.json.data;
   r=await request(port,"/api/v1/customers/"+customer._id,{method:"PATCH",headers:auth,body:{city:"Tirunelveli"}});assert(r.status===200,"Customer update failed");
   r=await request(port,"/api/v1/cars",{method:"POST",headers:auth,body:{sellerId:customer._id,registrationNumber:"TN-SM-"+stamp,make:"Smoke",model:"Test",year:2026,purchasePrice:100000}});assert(r.status===201,"Vehicle creation failed");
   const car=r.json.data;
   r=await request(port,"/api/v1/cars/"+car._id,{headers:auth});assert(r.status===200&&r.json?.data?._id===car._id,"Vehicle detail failed");
   r=await request(port,"/api/v1/cars/"+car._id+"/expenses",{method:"POST",headers:auth,body:{category:"Testing",amount:1000,description:"Smoke test"}});assert(r.status===201,"Vehicle expense creation failed");
   r=await request(port,"/api/v1/cars/"+car._id+"/sell",{method:"POST",headers:auth,body:{buyerId:customer._id,sellingPrice:110000,sellingExpenses:500}});assert(r.status===201,"Vehicle sale failed");
   r=await request(port,"/api/v1/loans",{method:"POST",headers:auth,body:{customerId:customer._id,loanType:"Smoke Loan",requiredAmount:250000}});assert(r.status===201,"Loan creation failed");
   const loan=r.json.data;
   r=await request(port,"/api/v1/loans/"+loan._id,{headers:auth});assert(r.status===200,"Loan detail failed");
   r=await request(port,"/api/v1/loans/"+loan._id+"/status",{method:"PATCH",headers:auth,body:{status:"SUBMITTED"}});assert(r.status===200,"Loan status update failed");
   r=await request(port,"/api/v1/finance-services",{headers:auth});assert(r.status===200&&Array.isArray(r.json?.data),"Finance service listing failed");
   r=await request(port,"/api/v1/documents",{headers:auth});assert(r.status===200&&Array.isArray(r.json?.data),"Document listing failed");
   r=await request(port,"/api/v1/reports/dashboard",{headers:auth});assert(r.status===200&&r.json?.success===true,"Dashboard report failed");
   r=await request(port,"/api/v1/reports/loan-revenue",{headers:auth});assert(r.status===200,"Loan revenue report failed");
   r=await request(port,"/api/v1/reports/operational",{headers:auth});assert(r.status===200,"Operational report failed");
   console.log("Backend PostgreSQL compatibility smoke tests passed.");
   server.close(()=>process.exit(0));
  }catch(error){console.error(error);server.close(()=>process.exit(1));}
 });
})();