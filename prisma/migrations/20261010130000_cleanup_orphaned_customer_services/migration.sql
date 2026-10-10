-- Remove legacy orphaned customer services created before customer deletion was changed
-- to cascade-delete their service records. Enquiries and loans always require a
-- customer at creation time, so a NULL customerId here means the customer was removed.
WITH orphan_loan_documents AS (
  SELECT jsonb_path_query(l."documents", '$.**.publicId') #>> '{}' AS public_id
  FROM "Loan" l
  WHERE l."customerId" IS NULL AND l."documents" IS NOT NULL
  UNION
  SELECT jsonb_path_query(l."documents", '$.**.storedName') #>> '{}' AS public_id
  FROM "Loan" l
  WHERE l."customerId" IS NULL AND l."documents" IS NOT NULL
)
DELETE FROM "Document" d
WHERE d."publicId" IN (
  SELECT public_id FROM orphan_loan_documents WHERE public_id IS NOT NULL AND public_id <> ''
);

-- LoanFollowUp and LoanDocument rows are removed by their Loan foreign-key cascade.
DELETE FROM "Loan" WHERE "customerId" IS NULL;
DELETE FROM "FinanceEnquiry" WHERE "customerId" IS NULL;
