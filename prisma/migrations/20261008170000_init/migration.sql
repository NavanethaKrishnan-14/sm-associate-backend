-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "CarStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ENTERED', 'DOCUMENTS_PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "alternateMobile" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "occupation" TEXT,
    "pan" TEXT,
    "aadhaarLast4" TEXT,
    "notes" TEXT,
    "documents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "ownerNumber" INTEGER,
    "km" INTEGER,
    "fuel" TEXT,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "status" "CarStatus" NOT NULL DEFAULT 'AVAILABLE',
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "documents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarExpense" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CarExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarSale" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "sellingExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInvestment" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "documents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CarSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceService" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "parentCode" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceEnquiry" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "financeCompany" TEXT,
    "requiredAmount" DOUBLE PRECISION,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "followUpDate" TIMESTAMP(3),
    "notes" TEXT,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "loanType" TEXT NOT NULL,
    "requiredAmount" DOUBLE PRECISION NOT NULL,
    "approvedAmount" DOUBLE PRECISION,
    "financeCompany" TEXT,
    "status" "LoanStatus" NOT NULL DEFAULT 'ENTERED',
    "applicationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDisbursementDate" TIMESTAMP(3),
    "disbursementDate" TIMESTAMP(3),
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "assignedTo" TEXT,
    "documents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanFollowUp" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "followUpDate" TIMESTAMP(3) NOT NULL,
    "nextFollowUpDate" TIMESTAMP(3),
    "note" TEXT NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'OPEN',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoanFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Counter_name_key" ON "Counter"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerId_key" ON "Customer"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Car_vehicleId_key" ON "Car"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "CarSale_saleId_key" ON "CarSale"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "CarSale_carId_key" ON "CarSale"("carId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceService_code_key" ON "FinanceService"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceEnquiry_enquiryId_key" ON "FinanceEnquiry"("enquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_publicId_key" ON "Document"("publicId");

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

-- AddForeignKey
ALTER TABLE "Car"
ADD CONSTRAINT "Car_sellerId_fkey"
FOREIGN KEY ("sellerId") REFERENCES "Customer"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarExpense"
ADD CONSTRAINT "CarExpense_carId_fkey"
FOREIGN KEY ("carId") REFERENCES "Car"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarSale"
ADD CONSTRAINT "CarSale_carId_fkey"
FOREIGN KEY ("carId") REFERENCES "Car"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarSale"
ADD CONSTRAINT "CarSale_buyerId_fkey"
FOREIGN KEY ("buyerId") REFERENCES "Customer"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEnquiry"
ADD CONSTRAINT "FinanceEnquiry_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEnquiry"
ADD CONSTRAINT "FinanceEnquiry_serviceCode_fkey"
FOREIGN KEY ("serviceCode") REFERENCES "FinanceService"("code")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEnquiry"
ADD CONSTRAINT "FinanceEnquiry_assignedTo_fkey"
FOREIGN KEY ("assignedTo") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan"
ADD CONSTRAINT "Loan_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan"
ADD CONSTRAINT "Loan_assignedTo_fkey"
FOREIGN KEY ("assignedTo") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanFollowUp"
ADD CONSTRAINT "LoanFollowUp_loanId_fkey"
FOREIGN KEY ("loanId") REFERENCES "Loan"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanFollowUp"
ADD CONSTRAINT "LoanFollowUp_createdBy_fkey"
FOREIGN KEY ("createdBy") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
