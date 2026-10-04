import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const swaggerDefinition={
  openapi:"3.0.3",
  info:{
    title:"SM Associate Management API",
    version:"1.0.0",
    description:"REST API for SM Associate loan, customer, car, follow-up and reporting management."
  },
  servers:[{url:"http://localhost:5000/api/v1",description:"Local development server"}],
  tags:[
    {name:"Health",description:"API health"},
    {name:"Authentication",description:"Login and user management"},
    {name:"Customers",description:"Customer management"},
    {name:"Loans",description:"Loan applications and follow-ups"},
    {name:"Cars",description:"Car inventory, expenses and sales"},
    {name:"Reports",description:"Management reports"},
    {name:"Finance Services",description:"Supported finance and business service catalog"}
  ],
  components:{
    securitySchemes:{bearerAuth:{type:"http",scheme:"bearer",bearerFormat:"JWT"}},
    schemas:{
      Customer:{type:"object",properties:{customerId:{type:"string",example:"CUS-00001"},name:{type:"string"},mobile:{type:"string"},email:{type:"string"},city:{type:"string"},occupation:{type:"string"}}},
      Loan:{type:"object",properties:{loanId:{type:"string",example:"LOAN-00001"},loanType:{type:"string",example:"Home Loan"},requiredAmount:{type:"number"},approvedAmount:{type:"number"},financeCompany:{type:"string"},status:{type:"string",enum:["NEW","DOCUMENTS_PENDING","SUBMITTED","UNDER_REVIEW","APPROVED","REJECTED","DISBURSED","CLOSED"]},commission:{type:"number"}}},
      Car:{type:"object",properties:{vehicleId:{type:"string",example:"CAR-00001"},registrationNumber:{type:"string"},make:{type:"string"},model:{type:"string"},year:{type:"integer"},purchasePrice:{type:"number"},status:{type:"string",enum:["AVAILABLE","RESERVED","SOLD"]}}},
      FollowUp:{type:"object",properties:{followUpDate:{type:"string",format:"date-time"},nextFollowUpDate:{type:"string",format:"date-time"},note:{type:"string"},status:{type:"string",enum:["OPEN","COMPLETED","CANCELLED"]}}}
    }
  },
  paths:{
    "/health":{get:{tags:["Health"],summary:"Health check",responses:{"200":{description:"API is running"}}}},
    "/auth/login":{post:{tags:["Authentication"],summary:"Login",requestBody:{required:true,content:{"application/json":{schema:{type:"object",required:["email","password"],properties:{email:{type:"string"},password:{type:"string"}}}}}},responses:{"200":{description:"JWT login response"}}}},
    "/auth/me":{get:{tags:["Authentication"],security:[{bearerAuth:[]}],summary:"Current user",responses:{"200":{description:"Authenticated user"}}}},
    "/auth/users":{get:{tags:["Authentication"],security:[{bearerAuth:[]}],summary:"List users",responses:{"200":{description:"Users"}}},post:{tags:["Authentication"],security:[{bearerAuth:[]}],summary:"Create user",responses:{"201":{description:"User created"}}}},
    "/customers":{get:{tags:["Customers"],security:[{bearerAuth:[]}],summary:"List customers",responses:{"200":{description:"Customers"}}},post:{tags:["Customers"],security:[{bearerAuth:[]}],summary:"Create customer",responses:{"201":{description:"Customer created"}}}},
    "/customers/{id}":{get:{tags:["Customers"],security:[{bearerAuth:[]}],summary:"Get customer",parameters:[{name:"id",in:"path",required:true,schema:{type:"string"}}],responses:{"200":{description:"Customer"}}},patch:{tags:["Customers"],security:[{bearerAuth:[]}],summary:"Update customer",parameters:[{name:"id",in:"path",required:true,schema:{type:"string"}}],responses:{"200":{description:"Updated"}}},delete:{tags:["Customers"],security:[{bearerAuth:[]}],summary:"Delete customer",parameters:[{name:"id",in:"path",required:true,schema:{type:"string"}}],responses:{"200":{description:"Deleted"}}}},
    "/customers/{id}/history":{get:{tags:["Customers"],security:[{bearerAuth:[]}],summary:"Customer transaction history",parameters:[{name:"id",in:"path",required:true,schema:{type:"string"}}],responses:{"200":{description:"History"}}}},
    "/loans":{get:{tags:["Loans"],security:[{bearerAuth:[]}],summary:"List loans",responses:{"200":{description:"Loans"}}},post:{tags:["Loans"],security:[{bearerAuth:[]}],summary:"Create loan",responses:{"201":{description:"Loan created"}}}},
    "/loans/{id}":{get:{tags:["Loans"],security:[{bearerAuth:[]}],summary:"Get loan with follow-ups",parameters:[{name:"id",in:"path",required:true,schema:{type:"string"}}],responses:{"200":{description:"Loan details"}}},patch:{tags:["Loans"],security:[{bearerAuth:[]}],summary:"Update loan",responses:{"200":{description:"Updated"}}}},
    "/loans/{id}/status":{patch:{tags:["Loans"],security:[{bearerAuth:[]}],summary:"Update loan status",responses:{"200":{description:"Updated"}}}},
    "/loans/follow-ups":{get:{tags:["Loans"],security:[{bearerAuth:[]}],summary:"List open follow-ups and workload summary",responses:{"200":{description:"Follow-ups"}}}},
    "/loans/{id}/follow-ups":{get:{tags:["Loans"],security:[{bearerAuth:[]}],summary:"List loan follow-ups",responses:{"200":{description:"Follow-ups"}}},post:{tags:["Loans"],security:[{bearerAuth:[]}],summary:"Create follow-up",responses:{"201":{description:"Created"}}}},
    "/loans/{id}/follow-ups/{followUpId}":{patch:{tags:["Loans"],security:[{bearerAuth:[]}],summary:"Complete/reschedule follow-up",responses:{"200":{description:"Updated"}}}},
    "/cars":{get:{tags:["Cars"],security:[{bearerAuth:[]}],summary:"List cars",responses:{"200":{description:"Cars"}}},post:{tags:["Cars"],security:[{bearerAuth:[]}],summary:"Create car",responses:{"201":{description:"Car created"}}}},
    "/cars/{id}/financials":{get:{tags:["Cars"],security:[{bearerAuth:[]}],summary:"Car financials",responses:{"200":{description:"Financials"}}}},
    "/cars/{id}/expenses":{post:{tags:["Cars"],security:[{bearerAuth:[]}],summary:"Add car expense",responses:{"201":{description:"Expense created"}}}},
    "/cars/{id}/sell":{post:{tags:["Cars"],security:[{bearerAuth:[]}],summary:"Sell car",responses:{"200":{description:"Car sold"}}}},
    "/cars/profits":{get:{tags:["Cars"],security:[{bearerAuth:[]}],summary:"Car profit report",responses:{"200":{description:"Profit report"}}}},
    "/reports/dashboard":{get:{tags:["Reports"],security:[{bearerAuth:[]}],summary:"Management dashboard",responses:{"200":{description:"Dashboard metrics"}}}},
    "/reports/loan-revenue":{get:{tags:["Reports"],security:[{bearerAuth:[]}],summary:"Loan revenue report",responses:{"200":{description:"Revenue report"}}}},
    "/reports/operational":{get:{tags:["Reports"],security:[{bearerAuth:[]}],summary:"Operational management report",responses:{"200":{description:"Operational report"}}}},
    "/finance-services":{get:{tags:["Finance Services"],security:[{bearerAuth:[]}],summary:"List active finance services",responses:{"200":{description:"Finance service catalog"}}},post:{tags:["Finance Services"],security:[{bearerAuth:[]}],summary:"Seed/update finance service catalog (ADMIN)",responses:{"200":{description:"Finance service catalog"}}}}
  }
};

const swaggerSpec=swaggerJSDoc({definition:swaggerDefinition,apis:[]});

export function setupSwagger(app:Express){
  app.use("/api-docs",swaggerUi.serve,swaggerUi.setup(swaggerSpec,{explorer:true,customSiteTitle:"SM Associate API Documentation"}));
}
