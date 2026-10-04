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

async function seed() {
  await connectDatabase();

  const admin = await User.findOne({
    email: process.env.ADMIN_EMAIL?.trim().toLowerCase()
  });

  if (!admin) throw new Error("Admin user not found. Start the backend once first.");

  if (await Customer.exists({ email: "demo.customer@smassociate.test" })) {
    console.log("Demo data already exists.");
    await mongoose.disconnect();
    return;
  }

  const [c1,c2,c3,c4] = await Customer.create([
    {customerId:"CUS-90001",name:"Arun Kumar",mobile:"9000000001",email:"demo.customer@smassociate.test",city:"Tirunelveli",occupation:"Business Owner",notes:"DEMO DATA"},
    {customerId:"CUS-90002",name:"Priya Raj",mobile:"9000000002",email:"demo.priya@smassociate.test",city:"Tirunelveli",occupation:"IT Professional",notes:"DEMO DATA"},
    {customerId:"CUS-90003",name:"Mohamed Faizal",mobile:"9000000003",email:"demo.faizal@smassociate.test",city:"Tirunelveli",occupation:"Trader",notes:"DEMO DATA"},
    {customerId:"CUS-90004",name:"Kavitha S",mobile:"9000000004",email:"demo.kavitha@smassociate.test",city:"Nagercoil",occupation:"Teacher",notes:"DEMO DATA"}
  ]);

  const [l1,l2,l3,l4] = await Loan.create([
    {loanId:"LN-90001",customerId:c1._id,loanType:"Home Loan",requiredAmount:4200000,approvedAmount:4000000,financeCompany:"HDFC Bank",status:"APPROVED",commission:42000,applicationDate:new Date("2026-09-18"),notes:"DEMO DATA"},
    {loanId:"LN-90002",customerId:c2._id,loanType:"Car Loan",requiredAmount:850000,approvedAmount:800000,financeCompany:"ICICI Bank",status:"DISBURSED",commission:12500,applicationDate:new Date("2026-08-22"),disbursementDate:new Date("2026-09-10"),notes:"DEMO DATA"},
    {loanId:"LN-90003",customerId:c3._id,loanType:"Business Loan",requiredAmount:2500000,financeCompany:"Axis Bank",status:"UNDER_REVIEW",applicationDate:new Date("2026-09-28"),notes:"DEMO DATA"},
    {loanId:"LN-90004",customerId:c4._id,loanType:"Personal Loan",requiredAmount:500000,financeCompany:"Bajaj Finance",status:"NEW",applicationDate:new Date("2026-10-02"),notes:"DEMO DATA"}
  ]);

  await LoanFollowUp.create([
    {loanId:l1._id,followUpDate:new Date("2026-10-04"),nextFollowUpDate:new Date("2026-10-07"),note:"Collect final property documents - DEMO",status:"OPEN",createdBy:admin._id},
    {loanId:l3._id,followUpDate:new Date("2026-10-03"),nextFollowUpDate:new Date("2026-10-06"),note:"Check bank review status - DEMO",status:"OPEN",createdBy:admin._id},
    {loanId:l4._id,followUpDate:new Date("2026-10-08"),note:"Call customer for documents - DEMO",status:"OPEN",createdBy:admin._id}
  ]);

  const available = await Car.create({
    vehicleId:"CAR-90001",sellerId:c3._id,registrationNumber:"TN72AB9001",
    make:"Hyundai",model:"Creta SX",year:2021,ownerNumber:1,km:42000,
    fuel:"Diesel",purchasePrice:1180000,status:"AVAILABLE",notes:"DEMO DATA"
  });

  const sold = await Car.create({
    vehicleId:"CAR-90002",sellerId:c1._id,registrationNumber:"TN72CD9002",
    make:"Maruti Suzuki",model:"Swift VXi",year:2022,ownerNumber:1,km:31000,
    fuel:"Petrol",purchasePrice:720000,status:"SOLD",notes:"DEMO DATA"
  });

  await CarExpense.create([
    {carId:available._id,category:"Service",amount:18000,description:"Periodic service - DEMO"},
    {carId:available._id,category:"Detailing",amount:6500,description:"Vehicle detailing - DEMO"},
    {carId:sold._id,category:"Repair",amount:12000,description:"Brake and suspension work - DEMO"}
  ]);

  await CarSale.create({
    saleId:"SALE-90001",carId:sold._id,buyerId:c4._id,
    sellingPrice:805000,sellingExpenses:7500,totalInvestment:732000,
    profit:65500,saleDate:new Date("2026-09-20"),notes:"DEMO DATA"
  });

  console.log("Demo data seeded: 4 customers, 4 loans, 3 follow-ups, 2 cars, 3 expenses and 1 sale.");
  await mongoose.disconnect();
}

seed().catch(async error => {
  console.error("Demo seed failed:",error);
  await mongoose.disconnect();
  process.exit(1);
});
