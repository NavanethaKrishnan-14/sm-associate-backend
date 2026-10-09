CREATE TABLE IF NOT EXISTS "LoanDocument" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "loanId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "originalName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "uploadedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoanDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoanDocument_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LoanDocument_documentId_key" ON "LoanDocument"("documentId");
CREATE INDEX IF NOT EXISTS "LoanDocument_loanId_idx" ON "LoanDocument"("loanId");
CREATE INDEX IF NOT EXISTS "LoanDocument_status_idx" ON "LoanDocument"("status");
