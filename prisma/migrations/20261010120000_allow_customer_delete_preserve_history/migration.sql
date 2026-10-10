-- Preserve business history when deleting a customer.
-- Discover FK names rather than assuming Prisma's generated constraint names.
DO $$
DECLARE fk RECORD;
BEGIN
  FOR fk IN
    SELECT conname, conrelid::regclass AS table_name
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = '"Customer"'::regclass
      AND conrelid::regclass::text IN ('"Car"', '"CarSale"', '"FinanceEnquiry"', '"Loan"')
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk.table_name, fk.conname);
  END LOOP;
END $$;

ALTER TABLE "Car" ALTER COLUMN "sellerId" DROP NOT NULL;
ALTER TABLE "Car" ADD CONSTRAINT "Car_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CarSale" ALTER COLUMN "buyerId" DROP NOT NULL;
ALTER TABLE "CarSale" ADD CONSTRAINT "CarSale_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceEnquiry" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "FinanceEnquiry" ADD CONSTRAINT "FinanceEnquiry_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Loan" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
