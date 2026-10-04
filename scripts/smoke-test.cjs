const http=require("http");
const app=require("../dist/app").default;

function request(port,path){
  return new Promise((resolve,reject)=>{
    const req=http.get({hostname:"127.0.0.1",port,path},res=>{
      let body=""; res.setEncoding("utf8"); res.on("data",c=>body+=c); res.on("end",()=>resolve({status:res.statusCode,body}));
    });
    req.on("error",reject);
  });
}

(async()=>{
  const server=app.listen(0,"127.0.0.1",async()=>{
    const port=server.address().port;
    try{
      const health=await request(port,"/api/v1/health");
      if(health.status!==200||!health.body.includes("SM Associate API is running"))throw new Error("Health check failed");
      const docs=await request(port,"/api-docs/");
      if(docs.status!==200||!docs.body.includes("swagger-ui"))throw new Error("Swagger UI check failed");
      const protectedResponse=await request(port,"/api/v1/customers");
      if(protectedResponse.status!==401)throw new Error("Authentication guard check failed");
      console.log("Backend smoke tests passed.");
      server.close(()=>process.exit(0));
    }catch(error){
      console.error(error);
      server.close(()=>process.exit(1));
    }
  });
})();
