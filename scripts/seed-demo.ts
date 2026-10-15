import 'dotenv/config';
import { PrismaClient, CarStatus, EnquiryStatus, LoanStatus, FollowUpStatus } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO = 'demo_';
const date = (daysAgo: number) => {
  const value = new Date();
  value.setDate(value.getDate() - daysAgo);
  return value;
};

async function clearDemoData() {
  // Only delete records explicitly created by this script. Never touch real records or Dashboard Notes.
  await prisma.financeEnquiry.deleteMany({ where: { id: { startsWith: DEMO } } });
  await prisma.loanFollowUp.deleteMany({ where: { id: { startsWith: DEMO } } });
  await prisma.loanDocument.deleteMany({ where: { id: { startsWith: DEMO } } });
  await prisma.carSale.deleteMany({ where: { id: { startsWith: DEMO } } });
  await prisma.carExpense.deleteMany({ where: { id: { startsWith: DEMO } } });
  await prisma.loan.deleteMany({ where: { id: { startsWith: DEMO } } });
  await prisma.car.deleteMany({ where: { id: { startsWith: DEMO } } });
  await prisma.customer.deleteMany({ where: { id: { startsWith: DEMO } } });
  await prisma.operationalExpense.deleteMany({ where: { id: { startsWith: DEMO } } });
  // Finance service catalogue is application data, not demo transactions; preserve existing service rows.
}

async function seed() {
  await clearDemoData();

  const services = [
    { code: 'HOME_LOAN', name: 'Home Loan', category: 'LOAN', description: 'Home purchase, construction and balance transfer', sortOrder: 1 },
    { code: 'CAR_LOAN', name: 'Car Loan', category: 'LOAN', description: 'New and used car finance', sortOrder: 2 },
    { code: 'BUSINESS_LOAN', name: 'Business Loan', category: 'LOAN', description: 'Working capital and business expansion', sortOrder: 3 },
    { code: 'PERSONAL_LOAN', name: 'Personal Loan', category: 'LOAN', description: 'Personal financial requirements', sortOrder: 4 },
    { code: 'INSURANCE_RENEWAL', name: 'Insurance Renewal', category: 'INSURANCE', description: 'Vehicle and other insurance renewal assistance', sortOrder: 5 },
    { code: 'GOLD_RESALE', name: 'Gold Resale', category: 'GOLD', description: 'Gold resale enquiry and assistance', sortOrder: 6 },
    { code: 'DSA_FINANCE', name: 'DSA Finance', category: 'FINANCE', description: 'Direct selling agent finance services', sortOrder: 7 },
  ];
  for (const service of services) {
    await prisma.financeService.upsert({
      where: { code: service.code },
      update: { active: true },
      create: { ...service, active: true },
    });
  }

  const customers = [
    { id: 'demo_customer_001', customerId: 'DEMO-CUS-001', name: 'Arun Kumar', mobile: '9000000101', email: 'arun.demo@example.com', address: '12 South Street', city: 'Tirunelveli', occupation: 'Software Engineer', notes: 'Demo customer record' },
    { id: 'demo_customer_002', customerId: 'DEMO-CUS-002', name: 'Priya S', mobile: '9000000102', email: 'priya.demo@example.com', address: '8 Market Road', city: 'Tirunelveli', occupation: 'Teacher', notes: 'Demo customer record' },
    { id: 'demo_customer_003', customerId: 'DEMO-CUS-003', name: 'Mohamed Ibrahim', mobile: '9000000103', email: 'ibrahim.demo@example.com', address: '21 Main Road', city: 'Palayamkottai', occupation: 'Business Owner', notes: 'Demo customer record' },
    { id: 'demo_customer_004', customerId: 'DEMO-CUS-004', name: 'Kavitha R', mobile: '9000000104', email: 'kavitha.demo@example.com', address: '4 Lake View Street', city: 'Thoothukudi', occupation: 'Accountant', notes: 'Demo customer record' },
    { id: 'demo_customer_005', customerId: 'DEMO-CUS-005', name: 'Suresh B', mobile: '9000000105', email: 'suresh.demo@example.com', address: '17 Bazaar Street', city: 'Tenkasi', occupation: 'Retail Trader', notes: 'Demo customer record' },
    { id: 'demo_customer_006', customerId: 'DEMO-CUS-006', name: 'Meena Devi', mobile: '9000000106', email: 'meena.demo@example.com', address: '3 Temple Road', city: 'Tirunelveli', occupation: 'Nurse', notes: 'Demo customer record' },
    { id: 'demo_customer_007', customerId: 'DEMO-CUS-007', name: 'Vignesh P', mobile: '9000000107', email: 'vignesh.demo@example.com', address: '29 College Road', city: 'Nagercoil', occupation: 'Entrepreneur', notes: 'Demo customer record' },
  ];
  for (const customer of customers) {
    await prisma.customer.create({ data: { ...customer, createdAt: date(20), updatedAt: date(1) } });
  }

  const cars = [
    { id: 'demo_car_001', vehicleId: 'DEMO-CAR-001', registrationNumber: 'TN72AB1001', make: 'Maruti Suzuki', model: 'Swift VXi', year: 2022, ownerNumber: 1, km: 28500, fuel: 'Petrol', purchasePrice: 525000, status: CarStatus.AVAILABLE, purchaseDate: date(12), notes: 'Demo inventory vehicle' },
    { id: 'demo_car_002', vehicleId: 'DEMO-CAR-002', registrationNumber: 'TN72CD2002', make: 'Hyundai', model: 'i20 Sportz', year: 2021, ownerNumber: 2, km: 41200, fuel: 'Petrol', purchasePrice: 610000, status: CarStatus.AVAILABLE, purchaseDate: date(18), notes: 'Demo inventory vehicle' },
    { id: 'demo_car_003', vehicleId: 'DEMO-CAR-003', registrationNumber: 'TN72EF3003', make: 'Maruti Suzuki', model: 'Dzire VXi', year: 2024, ownerNumber: 1, km: 7600, fuel: 'Petrol', purchasePrice: 690000, status: CarStatus.SOLD, purchaseDate: date(30), notes: 'Demo sold vehicle' },
  ];
  for (const car of cars) {
    await prisma.car.create({ data: { ...car, sellerId: 'demo_customer_005', createdAt: date(20), updatedAt: date(1) } });
  }

  const carExpenses = [
    ['demo_car_expense_001', 'demo_car_001', 'Service', 4500, 'General service and oil change', 10],
    ['demo_car_expense_002', 'demo_car_001', 'Cleaning', 1200, 'Interior and exterior detailing', 8],
    ['demo_car_expense_003', 'demo_car_002', 'Repair', 6800, 'Brake and suspension work', 15],
    ['demo_car_expense_004', 'demo_car_003', 'Service', 3200, 'Pre-sale inspection', 25],
    ['demo_car_expense_005', 'demo_car_003', 'Documentation', 1800, 'Transfer and documentation charges', 22],
  ] as const;
  for (const [id, carId, category, amount, description, daysAgo] of carExpenses) {
    await prisma.carExpense.create({ data: { id, carId, category, amount, description, date: date(daysAgo) } });
  }

  const sales = [{
    id: 'demo_sale_001', saleId: 'DEMO-SALE-001', carId: 'demo_car_003', buyerId: 'demo_customer_001',
    sellingPrice: 745000, sellingExpenses: 2500, totalInvestment: 695000, profit: 47500,
    saleDate: date(3), notes: 'Demo sale record',
  }];
  for (const sale of sales) await prisma.carSale.create({ data: sale });

  const loanRows = [
    ['demo_loan_001', 'DEMO-LOAN-001', 'demo_customer_001', 'HOME_LOAN', 3500000, 3200000, 'HDFC Bank', LoanStatus.APPROVED, 0, 12],
    ['demo_loan_002', 'DEMO-LOAN-002', 'demo_customer_002', 'PERSONAL_LOAN', 450000, 400000, 'ICICI Bank', LoanStatus.DISBURSED, 12000, 25],
    ['demo_loan_003', 'DEMO-LOAN-003', 'demo_customer_003', 'BUSINESS_LOAN', 1200000, null, 'Axis Bank', LoanStatus.UNDER_REVIEW, 0, 7],
    ['demo_loan_004', 'DEMO-LOAN-004', 'demo_customer_004', 'CAR_LOAN', 650000, null, 'SBI', LoanStatus.DOCUMENTS_PENDING, 0, 4],
    ['demo_loan_005', 'DEMO-LOAN-005', 'demo_customer_005', 'BUSINESS_LOAN', 800000, 700000, 'Bajaj Finance', LoanStatus.DISBURSED, 18000, 35],
    ['demo_loan_006', 'DEMO-LOAN-006', 'demo_customer_006', 'PERSONAL_LOAN', 300000, null, 'Kotak Mahindra Bank', LoanStatus.SUBMITTED, 0, 9],
    ['demo_loan_007', 'DEMO-LOAN-007', 'demo_customer_007', 'HOME_LOAN', 2800000, null, 'LIC Housing Finance', LoanStatus.ENTERED, 0, 2],
    ['demo_loan_008', 'DEMO-LOAN-008', 'demo_customer_001', 'CAR_LOAN', 500000, null, 'Cholamandalam Finance', LoanStatus.REJECTED, 0, 40],
  ] as const;
  for (const [id, loanId, customerId, loanType, requiredAmount, approvedAmount, financeCompany, status, commission, daysAgo] of loanRows) {
    await prisma.loan.create({ data: {
      id, loanId, customerId, loanType, requiredAmount, approvedAmount, financeCompany, status, commission,
      applicationDate: date(daysAgo), expectedDisbursementDate: date(-20), notes: 'Demo data — not a real loan application',
    } });
  }

  const docs = [
    ['demo_loan_doc_001','DEMO-LDOC-001','demo_loan_001','Aadhaar Card','UPLOADED'],
    ['demo_loan_doc_002','DEMO-LDOC-002','demo_loan_001','PAN Card','UPLOADED'],
    ['demo_loan_doc_003','DEMO-LDOC-003','demo_loan_001','Salary Slips','PENDING'],
    ['demo_loan_doc_004','DEMO-LDOC-004','demo_loan_002','Aadhaar Card','UPLOADED'],
    ['demo_loan_doc_005','DEMO-LDOC-005','demo_loan_002','Bank Statement','UPLOADED'],
    ['demo_loan_doc_006','DEMO-LDOC-006','demo_loan_003','Business Proof','PENDING'],
    ['demo_loan_doc_007','DEMO-LDOC-007','demo_loan_003','Bank Statement','PENDING'],
    ['demo_loan_doc_008','DEMO-LDOC-008','demo_loan_004','Driving Licence','PENDING'],
    ['demo_loan_doc_009','DEMO-LDOC-009','demo_loan_005','GST Certificate','UPLOADED'],
    ['demo_loan_doc_010','DEMO-LDOC-010','demo_loan_006','Aadhaar Card','UPLOADED'],
    ['demo_loan_doc_011','DEMO-LDOC-011','demo_loan_007','Property Documents','PENDING'],
    ['demo_loan_doc_012','DEMO-LDOC-012','demo_loan_008','Income Proof','REJECTED'],
  ] as const;
  for (const [id, documentId, loanId, name, status] of docs) {
    await prisma.loanDocument.create({ data: { id, documentId, loanId, name, originalName: name, status, notes: 'Demo checklist item' } });
  }

  const followUps = [
    ['demo_followup_001','demo_loan_001',14,'Property valuation completed; confirm final terms'],
    ['demo_followup_002','demo_loan_003',3,'Check business bank statements'],
    ['demo_followup_003','demo_loan_004',2,'Request pending driving licence copy'],
    ['demo_followup_004','demo_loan_006',5,'Confirm application review status'],
    ['demo_followup_005','demo_loan_007',1,'Collect property document checklist'],
  ] as const;
  for (const [id, loanId, daysAgo, note] of followUps) {
    await prisma.loanFollowUp.create({ data: { id, loanId, followUpDate: date(daysAgo), nextFollowUpDate: date(-2), note, status: FollowUpStatus.OPEN } });
  }

  const enquiries = [
    ['demo_enquiry_001','DEMO-ENQ-001','demo_customer_001','HOME_LOAN',3500000,EnquiryStatus.IN_PROGRESS,'Property purchase enquiry'],
    ['demo_enquiry_002','DEMO-ENQ-002','demo_customer_002','PERSONAL_LOAN',450000,EnquiryStatus.COMPLETED,'Personal loan enquiry'],
    ['demo_enquiry_003','DEMO-ENQ-003','demo_customer_003','BUSINESS_LOAN',1200000,EnquiryStatus.NEW,'Working capital requirement'],
    ['demo_enquiry_004','DEMO-ENQ-004','demo_customer_004','CAR_LOAN',650000,EnquiryStatus.NEW,'Used car finance enquiry'],
    ['demo_enquiry_005','DEMO-ENQ-005','demo_customer_005','INSURANCE_RENEWAL',25000,EnquiryStatus.IN_PROGRESS,'Vehicle insurance renewal'],
    ['demo_enquiry_006','DEMO-ENQ-006','demo_customer_006','GOLD_RESALE',85000,EnquiryStatus.NEW,'Gold resale service enquiry'],
    ['demo_enquiry_007','DEMO-ENQ-007','demo_customer_007','DSA_FINANCE',900000,EnquiryStatus.IN_PROGRESS,'DSA finance partnership enquiry'],
  ] as const;
  for (const [id, enquiryId, customerId, serviceCode, requiredAmount, status, notes] of enquiries) {
    await prisma.financeEnquiry.create({ data: {
      id, enquiryId, customerId, serviceCode, requiredAmount, status, notes,
      followUpDate: date(-3), createdAt: date(8), updatedAt: date(1),
    } });
  }

  const expenses = [
    ['demo_op_expense_001','DEMO-OPEX-001','Rent','Office rent - demo',18000,'UPI','Property Owner',5],
    ['demo_op_expense_002','DEMO-OPEX-002','Utilities','Electricity and internet',3200,'UPI','Utility Providers',7],
    ['demo_op_expense_003','DEMO-OPEX-003','Marketing','Social media promotion',5000,'Card','Digital Marketing',9],
    ['demo_op_expense_004','DEMO-OPEX-004','Travel','Customer visits',2400,'Cash','Local Travel',2],
    ['demo_op_expense_005','DEMO-OPEX-005','Office Supplies','Printing and stationery',1650,'Cash','Stationery Shop',12],
    ['demo_op_expense_006','DEMO-OPEX-006','Maintenance','Office maintenance',2800,'UPI','Maintenance Vendor',15],
  ] as const;
  for (const [id, expenseId, category, description, amount, paymentMethod, vendor, daysAgo] of expenses) {
    await prisma.operationalExpense.create({ data: { id, expenseId, category, description, amount, paymentMethod, vendor, date: date(daysAgo), notes: 'Demo expense' } });
  }

  const counts = {
    customers: await prisma.customer.count({ where: { id: { startsWith: DEMO } } }),
    cars: await prisma.car.count({ where: { id: { startsWith: DEMO } } }),
    carExpenses: await prisma.carExpense.count({ where: { id: { startsWith: DEMO } } }),
    carSales: await prisma.carSale.count({ where: { id: { startsWith: DEMO } } }),
    loans: await prisma.loan.count({ where: { id: { startsWith: DEMO } } }),
    loanDocuments: await prisma.loanDocument.count({ where: { id: { startsWith: DEMO } } }),
    loanFollowUps: await prisma.loanFollowUp.count({ where: { id: { startsWith: DEMO } } }),
    financeServices: await prisma.financeService.count({ where: { code: { in: services.map((s) => s.code) } } }),
    financeEnquiries: await prisma.financeEnquiry.count({ where: { id: { startsWith: DEMO } } }),
    operationalExpenses: await prisma.operationalExpense.count({ where: { id: { startsWith: DEMO } } }),
  };
  console.log('Demo data seeded successfully:', JSON.stringify(counts, null, 2));
}

const clearOnly = process.argv.includes('--clear');
(clearOnly ? clearDemoData().then(() => console.log('Demo transaction data cleared. Real records, finance service catalogue, and Dashboard Notes were preserved.')) : seed())
  .catch((error) => { console.error(clearOnly ? 'Demo clear failed:' : 'Demo seed failed:', error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
