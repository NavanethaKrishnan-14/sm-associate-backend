import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../src/config/db";
import { User } from "../src/models/User";
import { Customer } from "../src/models/Customer";
import { Loan } from "../src/models/Loan";
import { LoanFollowUp } from "../src/models/LoanFollowUp";
import { Car } from "../src/models/Car";
import { CarExpense } from "../src/models/CarExpense";
import { CarSale } from "../src/models/CarSale";
import { FinanceService } from "../src/models/FinanceService";
import { FinanceEnquiry } from "../src/models/FinanceEnquiry";

async function seed() {
  await connectDatabase();

  const admin = await User.findOne({
    email: process.env.ADMIN_EMAIL?.trim().toLowerCase()
  });

  if (!admin) throw new Error("Admin user not found. Start the backend once first.");

  if (await Customer.exists({ email: "demo.customer@smassociate.test" })) {
    console.log("Complete demo data already exists.");
    await mongoose.disconnect();
    return;
  }

  await FinanceService.bulkWrite([
    {updateOne:{filter:{code:"DSA_FINANCE"},update:{$set:{code:"DSA_FINANCE",name:"DSA Finance",category:"DSA",description:"DSA finance sourcing.",sortOrder:1}},upsert:true}},
    {updateOne:{filter:{code:"HOME_LOAN"},update:{$set:{code:"HOME_LOAN",name:"Home Loan",category:"DSA_PRODUCT",parentCode:"DSA_FINANCE",description:"Home loan through DSA.",sortOrder:2}},upsert:true}},
    {updateOne:{filter:{code:"CAR_LOAN"},update:{$set:{code:"CAR_LOAN",name:"Car Loan",category:"DSA_PRODUCT",parentCode:"DSA_FINANCE",description:"Car loan through DSA.",sortOrder:3}},upsert:true}},
    {updateOne:{filter:{code:"BUSINESS_LOAN"},update:{$set:{code:"BUSINESS_LOAN",name:"Business Loan",category:"DSA_PRODUCT",parentCode:"DSA_FINANCE",description:"Business loan through DSA.",sortOrder:4}},upsert:true}},
    {updateOne:{filter:{code:"PERSONAL_LOAN"},update:{$set:{code:"PERSONAL_LOAN",name:"Personal Loan",category:"DSA_PRODUCT",parentCode:"DSA_FINANCE",description:"Personal loan through DSA.",sortOrder:5}},upsert:true}},
    {updateOne:{filter:{code:"INSURANCE_RENEWAL"},update:{$set:{code:"INSURANCE_RENEWAL",name:"Insurance Renewal",category:"SERVICE",description:"Insurance renewal support.",sortOrder:6}},upsert:true}},
    {updateOne:{filter:{code:"GOLD_RESALE"},update:{$set:{code:"GOLD_RESALE",name:"Gold Resale",category:"SERVICE",description:"Gold resale support.",sortOrder:7}},upsert:true}}
  ]);

  const [c1,c2,c3,c4,c5,c6,c7] = await Customer.create([
    {customerId:"CUS-90001",name:"Arun Kumar",mobile:"9000000001",email:"demo.customer@smassociate.test",city:"Tirunelveli",occupation:"Business Owner",notes:"DEMO DATA"},
    {customerId:"CUS-90002",name:"Priya Raj",mobile:"9000000002",email:"demo.priya@smassociate.test",city:"Tirunelveli",occupation:"IT Professional",notes:"DEMO DATA"},
    {customerId:"CUS-90003",name:"Mohamed Faizal",mobile:"9000000003",email:"demo.faizal@smassociate.test",city:"Tirunelveli",occupation:"Trader",notes:"DEMO DATA"},
    {customerId:"CUS-90004",name:"Kavitha S",mobile:"9000000004",email:"demo.kavitha@smassociate.test",city:"Nagercoil",occupation:"Teacher",notes:"DEMO DATA"},
    {customerId:"CUS-90005",name:"Suresh B",mobile:"9000000005",email:"demo.suresh@smassociate.test",city:"Tuticorin",occupation:"Engineer",notes:"DEMO DATA"},
    {customerId:"CUS-90006",name:"Meena Devi",mobile:"9000000006",email:"demo.meena@smassociate.test",city:"Tirunelveli",occupation:"Retailer",notes:"DEMO DATA"},
    {customerId:"CUS-90007",name:"Ramesh Kumar",mobile:"9000000007",email:"demo.ramesh@smassociate.test",city:"Nagercoil",occupation:"Self Employed",notes:"DEMO DATA"}
  ]);

  const loans = await Loan.create([
    {loanId:"LN-90001",customerId:c1._id,loanType:"Home Loan",requiredAmount:4200000,approvedAmount:4000000,financeCompany:"HDFC Bank",status:"APPROVED",commission:42000,applicationDate:new Date("2026-09-18"),notes:"DEMO DATA"},
    {loanId:"LN-90002",customerId:c2._id,loanType:"Car Loan",requiredAmount:850000,approvedAmount:800000,financeCompany:"ICICI Bank",status:"DISBURSED",commission:12500,applicationDate:new Date("2026-08-22"),disbursementDate:new Date("2026-09-10"),notes:"DEMO DATA"},
    {loanId:"LN-90003",customerId:c3._id,loanType:"Business Loan",requiredAmount:2500000,financeCompany:"Axis Bank",status:"UNDER_REVIEW",applicationDate:new Date("2026-09-28"),notes:"DEMO DATA"},
    {loanId:"LN-90004",customerId:c4._id,loanType:"Personal Loan",requiredAmount:500000,financeCompany:"Bajaj Finance",status:"ENTERED",applicationDate:new Date("2026-10-02"),notes:"DEMO DATA"},
    {loanId:"LN-90005",customerId:c5._id,loanType:"Home Loan",requiredAmount:3200000,approvedAmount:3000000,financeCompany:"SBI",status:"CLOSED",commission:30000,applicationDate:new Date("2026-07-12"),disbursementDate:new Date("2026-08-02"),notes:"DEMO DATA"},
    {loanId:"LN-90006",customerId:c6._id,loanType:"Car Loan",requiredAmount:700000,financeCompany:"HDFC Bank",status:"SUBMITTED",applicationDate:new Date("2026-09-30"),notes:"DEMO DATA"},
    {loanId:"LN-90007",customerId:c7._id,loanType:"Business Loan",requiredAmount:1800000,financeCompany:"Kotak Mahindra Bank",status:"REJECTED",applicationDate:new Date("2026-08-30"),rejectionReason:"DEMO - eligibility criteria",notes:"DEMO DATA"},
    {loanId:"LN-90008",customerId:c1._id,loanType:"Personal Loan",requiredAmount:400000,financeCompany:"Tata Capital",status:"DOCUMENTS_PENDING",applicationDate:new Date("2026-10-01"),notes:"DEMO DATA"}
  ]);

  await LoanFollowUp.create([
    {loanId:loans[0]._id,followUpDate:new Date("2026-10-04"),nextFollowUpDate:new Date("2026-10-07"),note:"Collect final property documents - DEMO",status:"OPEN",createdBy:admin._id},
    {loanId:loans[2]._id,followUpDate:new Date("2026-10-03"),nextFollowUpDate:new Date("2026-10-06"),note:"Check bank review status - DEMO",status:"OPEN",createdBy:admin._id},
    {loanId:loans[3]._id,followUpDate:new Date("2026-10-08"),note:"Call customer for documents - DEMO",status:"OPEN",createdBy:admin._id},
    {loanId:loans[5]._id,followUpDate:new Date("2026-10-05"),note:"Verify submitted documents - DEMO",status:"OPEN",createdBy:admin._id},
    {loanId:loans[6]._id,followUpDate:new Date("2026-09-25"),note:"Explain rejection and discuss alternatives - DEMO",status:"COMPLETED",createdBy:admin._id}
  ]);

  await FinanceEnquiry.create([
    {enquiryId:"ENQ-90001",customerId:c1._id,serviceCode:"DSA_FINANCE",requiredAmount:4200000,status:"IN_PROGRESS",followUpDate:new Date("2026-10-07"),notes:"DSA finance requirement - DEMO",assignedTo:admin._id},
    {enquiryId:"ENQ-90002",customerId:c1._id,serviceCode:"HOME_LOAN",financeCompany:"HDFC Bank",requiredAmount:4200000,status:"IN_PROGRESS",followUpDate:new Date("2026-10-07"),notes:"Home loan enquiry - DEMO",assignedTo:admin._id},
    {enquiryId:"ENQ-90003",customerId:c2._id,serviceCode:"CAR_LOAN",financeCompany:"ICICI Bank",requiredAmount:850000,status:"COMPLETED",notes:"Car loan enquiry - DEMO",assignedTo:admin._id},
    {enquiryId:"ENQ-90004",customerId:c3._id,serviceCode:"BUSINESS_LOAN",financeCompany:"Axis Bank",requiredAmount:2500000,status:"IN_PROGRESS",followUpDate:new Date("2026-10-06"),notes:"Business loan enquiry - DEMO",assignedTo:admin._id},
    {enquiryId:"ENQ-90005",customerId:c4._id,serviceCode:"PERSONAL_LOAN",requiredAmount:500000,status:"NEW",notes:"Personal loan enquiry - DEMO",assignedTo:admin._id},
    {enquiryId:"ENQ-90006",customerId:c5._id,serviceCode:"INSURANCE_RENEWAL",status:"COMPLETED",notes:"Vehicle insurance renewal - DEMO",assignedTo:admin._id},
    {enquiryId:"ENQ-90007",customerId:c6._id,serviceCode:"GOLD_RESALE",status:"NEW",followUpDate:new Date("2026-10-09"),notes:"Gold resale enquiry - DEMO",assignedTo:admin._id},
    {enquiryId:"ENQ-90008",customerId:c7._id,serviceCode:"GOLD_RESALE",status:"CANCELLED",notes:"Demo cancelled gold enquiry",assignedTo:admin._id}
  ]);

  const available = await Car.create({
    vehicleId:"CAR-90001",sellerId:c3._id,registrationNumber:"TN72AB9001",
    make:"Hyundai",model:"Creta SX",year:2021,ownerNumber:1,km:42000,
    fuel:"Diesel",purchasePrice:1180000,status:"AVAILABLE",notes:"DEMO DATA"
  });

  const reserved = await Car.create({
    vehicleId:"CAR-90002",sellerId:c5._id,registrationNumber:"TN69EF9002",
    make:"Kia",model:"Seltos HTK",year:2022,ownerNumber:1,km:36000,
    fuel:"Petrol",purchasePrice:1250000,status:"RESERVED",notes:"DEMO DATA"
  });

  const sold = await Car.create({
    vehicleId:"CAR-90003",sellerId:c1._id,registrationNumber:"TN72CD9003",
    make:"Maruti Suzuki",model:"Swift VXi",year:2022,ownerNumber:1,km:31000,
    fuel:"Petrol",purchasePrice:720000,status:"SOLD",notes:"DEMO DATA"
  });

  await CarExpense.create([
    {carId:available._id,category:"Service",amount:18000,description:"Periodic service - DEMO"},
    {carId:available._id,category:"Detailing",amount:6500,description:"Vehicle detailing - DEMO"},
    {carId:reserved._id,category:"Tyres",amount:24000,description:"Tyre replacement - DEMO"},
    {carId:sold._id,category:"Repair",amount:12000,description:"Brake and suspension work - DEMO"},
    {carId:sold._id,category:"Detailing",amount:5000,description:"Final detailing - DEMO"}
  ]);

  await CarSale.create({
    saleId:"SALE-90001",carId:sold._id,buyerId:c4._id,
    sellingPrice:805000,sellingExpenses:7500,totalInvestment:737000,
    profit:60500,saleDate:new Date("2026-09-20"),notes:"DEMO DATA"
  });

  console.log("COMPLETE DEMO DATA SEEDED");
  console.log("Services: 7 | Customers: 7 | Loans: 8 | Follow-ups: 5 | Enquiries: 8 | Cars: 3 | Expenses: 5 | Sales: 1");
  await mongoose.disconnect();
}

seed().catch(async error => {
  console.error("Demo seed failed:",error);
  await mongoose.disconnect();
  process.exit(1);
});
