CREATE TABLE IF NOT EXISTS "OperationalExpense" (
  "id" TEXT NOT NULL,
  "expenseId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paymentMethod" TEXT,
  "vendor" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationalExpense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OperationalExpense_expenseId_key"
  ON "OperationalExpense"("expenseId");
CREATE INDEX IF NOT EXISTS "OperationalExpense_date_idx"
  ON "OperationalExpense"("date");
CREATE INDEX IF NOT EXISTS "OperationalExpense_category_idx"
  ON "OperationalExpense"("category");
