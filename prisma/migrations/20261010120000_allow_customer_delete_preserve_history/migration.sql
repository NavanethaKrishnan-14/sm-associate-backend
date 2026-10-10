-- Preserve financial/business records when a customer is deleted.
-- Detach customer references instead of cascading deletes or rejecting deletion.
ALTER TABLE "Car" ALTER COLUMN "sellerId" DROP NOT NULL;
ALTER TABLE "Car" DROP CONSTRAINT "Car_sellerId_fkey";
ALTER TABLE "Car" ADD CONSTRAINT "Car_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CarSale" ALTER COLUMN "buyerId" DROP NOT NULL;
ALTER TABLE "CarSale" DROP CONSTRAINT "CarSale_buyerId_fkey";
ALTER TABLE "CarSale" ADD CONSTRAINT "CarSale_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceEnquiry" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "FinanceEnquiry" DROP CONSTRAINT "FinanceEnquiry_customerId_fkey";
ALTER TABLE "FinanceEnquiry" ADD CONSTRAINT "FinanceEnquiry_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Loan" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_customerId_fkey";
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
