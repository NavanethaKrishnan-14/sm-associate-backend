CREATE TYPE "UserRole" AS ENUM ('ADMIN','STAFF');
CREATE TYPE "CarStatus" AS ENUM ('AVAILABLE','RESERVED','SOLD');
CREATE TYPE "LoanStatus" AS ENUM ('ENTERED','DOCUMENTS_PENDING','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','DISBURSED','CLOSED');
CREATE TYPE "FollowUpStatus" AS ENUM ('OPEN','COMPLETED','CANCELLED');
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW','IN_PROGRESS','COMPLETED','CANCELLED');
CREATE TYPE "FinanceServiceCategory" AS ENUM ('DSA','DSA_PRODUCT','SERVICE');

CREATE TABLE "Sequence" ("name" TEXT NOT NULL, "value" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "Sequence_pkey" PRIMARY KEY ("name"));
CREATE TABLE "User" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"email" TEXT NOT NULL,"passwordHash" TEXT NOT NULL,"role" "UserRole" NOT NULL DEFAULT 'STAFF',"isActive" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_isActive_idx" ON "User"("role","isActive");

CREATE TABLE "Customer" ("id" TEXT NOT NULL,"customerId" TEXT NOT NULL,"name" TEXT NOT NULL,"mobile" TEXT NOT NULL,"alternateMobile" TEXT,"email" TEXT,"address" TEXT,"city" TEXT,"occupation" TEXT,"pan" TEXT,"aadhaarLast4" TEXT,"notes" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Customer_customerId_key" ON "Customer"("customerId");
CREATE INDEX "Customer_mobile_idx" ON "Customer"("mobile");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");

CREATE TABLE "Car" ("id" TEXT NOT NULL,"vehicleId" TEXT NOT NULL,"sellerId" TEXT NOT NULL,"registrationNumber" TEXT NOT NULL,"make" TEXT NOT NULL,"model" TEXT NOT NULL,"year" INTEGER,"ownerNumber" INTEGER,"km" INTEGER,"fuel" TEXT,"purchasePrice" DOUBLE PRECISION NOT NULL,"status" "CarStatus" NOT NULL DEFAULT 'AVAILABLE',"purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"notes" TEXT,"documents" JSONB NOT NULL DEFAULT '{}',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Car_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Car_vehicleId_key" ON "Car"("vehicleId");
CREATE INDEX "Car_sellerId_idx" ON "Car"("sellerId");
CREATE INDEX "Car_registrationNumber_idx" ON "Car"("registrationNumber");
CREATE INDEX "Car_status_idx" ON "Car"("status");
CREATE INDEX "Car_createdAt_idx" ON "Car"("createdAt");

CREATE TABLE "CarExpense" ("id" TEXT NOT NULL,"carId" TEXT NOT NULL,"category" TEXT NOT NULL,"amount" DOUBLE PRECISION NOT NULL,"description" TEXT,"date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "CarExpense_pkey" PRIMARY KEY ("id"));
CREATE INDEX "CarExpense_carId_date_idx" ON "CarExpense"("carId","date");

CREATE TABLE "CarSale" ("id" TEXT NOT NULL,"saleId" TEXT NOT NULL,"carId" TEXT NOT NULL,"buyerId" TEXT NOT NULL,"sellingPrice" DOUBLE PRECISION NOT NULL,"sellingExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,"totalInvestment" DOUBLE PRECISION NOT NULL,"profit" DOUBLE PRECISION NOT NULL,"saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"notes" TEXT,"documents" JSONB NOT NULL DEFAULT '{}',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "CarSale_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "CarSale_saleId_key" ON "CarSale"("saleId");
CREATE UNIQUE INDEX "CarSale_carId_key" ON "CarSale"("carId");
CREATE INDEX "CarSale_buyerId_idx" ON "CarSale"("buyerId");
CREATE INDEX "CarSale_saleDate_idx" ON "CarSale"("saleDate");

CREATE TABLE "Loan" ("id" TEXT NOT NULL,"loanId" TEXT NOT NULL,"customerId" TEXT NOT NULL,"loanType" TEXT NOT NULL,"requiredAmount" DOUBLE PRECISION NOT NULL,"approvedAmount" DOUBLE PRECISION,"financeCompany" TEXT,"status" "LoanStatus" NOT NULL DEFAULT 'ENTERED',"applicationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"expectedDisbursementDate" TIMESTAMP(3),"disbursementDate" TIMESTAMP(3),"commission" DOUBLE PRECISION NOT NULL DEFAULT 0,"rejectionReason" TEXT,"notes" TEXT,"assignedToId" TEXT,"documents" JSONB NOT NULL DEFAULT '{}',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Loan_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Loan_loanId_key" ON "Loan"("loanId");
CREATE INDEX "Loan_customerId_idx" ON "Loan"("customerId");
CREATE INDEX "Loan_assignedToId_idx" ON "Loan"("assignedToId");
CREATE INDEX "Loan_status_idx" ON "Loan"("status");
CREATE INDEX "Loan_createdAt_idx" ON "Loan"("createdAt");
CREATE INDEX "Loan_financeCompany_idx" ON "Loan"("financeCompany");

CREATE TABLE "LoanFollowUp" ("id" TEXT NOT NULL,"loanId" TEXT NOT NULL,"followUpDate" TIMESTAMP(3) NOT NULL,"nextFollowUpDate" TIMESTAMP(3),"note" TEXT NOT NULL,"status" "FollowUpStatus" NOT NULL DEFAULT 'OPEN',"createdById" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "LoanFollowUp_pkey" PRIMARY KEY ("id"));
CREATE INDEX "LoanFollowUp_loanId_followUpDate_idx" ON "LoanFollowUp"("loanId","followUpDate");
CREATE INDEX "LoanFollowUp_status_followUpDate_idx" ON "LoanFollowUp"("status","followUpDate");

CREATE TABLE "FinanceService" ("id" TEXT NOT NULL,"code" TEXT NOT NULL,"name" TEXT NOT NULL,"category" "FinanceServiceCategory" NOT NULL,"parentCode" TEXT,"description" TEXT,"active" BOOLEAN NOT NULL DEFAULT true,"sortOrder" INTEGER NOT NULL DEFAULT 0,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "FinanceService_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "FinanceService_code_key" ON "FinanceService"("code");
CREATE INDEX "FinanceService_active_sortOrder_idx" ON "FinanceService"("active","sortOrder");
CREATE INDEX "FinanceService_parentCode_idx" ON "FinanceService"("parentCode");

CREATE TABLE "FinanceEnquiry" ("id" TEXT NOT NULL,"enquiryId" TEXT NOT NULL,"customerId" TEXT NOT NULL,"serviceCode" TEXT NOT NULL,"financeCompany" TEXT,"requiredAmount" DOUBLE PRECISION,"status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',"followUpDate" TIMESTAMP(3),"notes" TEXT,"assignedToId" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "FinanceEnquiry_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "FinanceEnquiry_enquiryId_key" ON "FinanceEnquiry"("enquiryId");
CREATE INDEX "FinanceEnquiry_customerId_idx" ON "FinanceEnquiry"("customerId");
CREATE INDEX "FinanceEnquiry_serviceCode_idx" ON "FinanceEnquiry"("serviceCode");
CREATE INDEX "FinanceEnquiry_status_idx" ON "FinanceEnquiry"("status");
CREATE INDEX "FinanceEnquiry_assignedToId_idx" ON "FinanceEnquiry"("assignedToId");
CREATE INDEX "FinanceEnquiry_createdAt_idx" ON "FinanceEnquiry"("createdAt");

CREATE TABLE "FinanceCompany" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"active" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "FinanceCompany_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "FinanceCompany_name_key" ON "FinanceCompany"("name");

CREATE TABLE "Document" ("id" TEXT NOT NULL,"sourceType" TEXT NOT NULL,"recordId" TEXT NOT NULL,"ownerType" TEXT,"ownerId" TEXT,"name" TEXT NOT NULL,"originalName" TEXT NOT NULL,"fileType" TEXT,"fileSize" INTEGER,"fileUrl" TEXT NOT NULL,"storageKey" TEXT,"uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Document_pkey" PRIMARY KEY ("id"));
CREATE INDEX "Document_sourceType_recordId_idx" ON "Document"("sourceType","recordId");
CREATE INDEX "Document_ownerType_ownerId_idx" ON "Document"("ownerType","ownerId");
CREATE INDEX "Document_uploadedAt_idx" ON "Document"("uploadedAt");

ALTER TABLE "Car" ADD CONSTRAINT "Car_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarExpense" ADD CONSTRAINT "CarExpense_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarSale" ADD CONSTRAINT "CarSale_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarSale" ADD CONSTRAINT "CarSale_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoanFollowUp" ADD CONSTRAINT "LoanFollowUp_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoanFollowUp" ADD CONSTRAINT "LoanFollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceEnquiry" ADD CONSTRAINT "FinanceEnquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceEnquiry" ADD CONSTRAINT "FinanceEnquiry_serviceCode_fkey" FOREIGN KEY ("serviceCode") REFERENCES "FinanceService"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceEnquiry" ADD CONSTRAINT "FinanceEnquiry_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;