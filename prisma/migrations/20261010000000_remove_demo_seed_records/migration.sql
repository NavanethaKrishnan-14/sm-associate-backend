-- Remove only the explicitly marked demo records previously created by seedDemoData.
-- Keep real customer records, uploaded documents, Dashboard Notes, users, counters,
-- and the finance-service catalogue untouched.
BEGIN;

DELETE FROM "LoanDocument"
WHERE "documentId" IN (
  'LDOC-901','LDOC-902','LDOC-903','LDOC-904','LDOC-905','LDOC-906',
  'LDOC-907','LDOC-908','LDOC-909','LDOC-910','LDOC-911','LDOC-912'
)
AND notes = 'Demo checklist only; no real file attached.';

DELETE FROM "LoanFollowUp"
WHERE note IN (
  'Collect final property documents - DEMO',
  'Check bank review status - DEMO',
  'Call customer for documents - DEMO',
  'Verify submitted documents - DEMO',
  'Explain rejection and discuss alternatives - DEMO'
)
AND "loanId" IN (
  SELECT id FROM "Loan"
  WHERE "loanId" IN (
    'LOAN-901','LOAN-902','LOAN-903','LOAN-904','LOAN-905','LOAN-906','LOAN-907','LOAN-908',
    'LN-901','LN-902','LN-903','LN-904','LN-905','LN-906','LN-907','LN-908'
  )
  AND notes = 'DEMO DATA'
);

DELETE FROM "FinanceEnquiry"
WHERE "enquiryId" IN ('ENQ-901','ENQ-902','ENQ-903','ENQ-904','ENQ-905','ENQ-906','ENQ-907','ENQ-908')
AND notes LIKE '% - DEMO';

DELETE FROM "CarSale"
WHERE "saleId" = 'SALE-901'
AND notes = 'DEMO DATA';

DELETE FROM "CarExpense"
WHERE description IN (
  'Periodic service - DEMO',
  'Vehicle detailing - DEMO',
  'Tyre replacement - DEMO',
  'Brake and suspension work - DEMO',
  'Final detailing - DEMO'
)
AND "carId" IN (
  SELECT id FROM "Car"
  WHERE "vehicleId" IN ('CAR-901','CAR-902','CAR-903')
  AND notes = 'DEMO DATA'
);

DELETE FROM "OperationalExpense"
WHERE "expenseId" IN ('OPX-901','OPX-902','OPX-903','OPX-904','OPX-905','OPX-906')
AND notes = 'DEMO DATA';

DELETE FROM "Car" c
WHERE c."vehicleId" IN ('CAR-901','CAR-902','CAR-903')
AND c.notes = 'DEMO DATA'
AND NOT EXISTS (SELECT 1 FROM "CarSale" s WHERE s."carId" = c.id)
AND NOT EXISTS (SELECT 1 FROM "CarExpense" e WHERE e."carId" = c.id);

DELETE FROM "Loan" l
WHERE l."loanId" IN (
  'LOAN-901','LOAN-902','LOAN-903','LOAN-904','LOAN-905','LOAN-906','LOAN-907','LOAN-908',
  'LN-901','LN-902','LN-903','LN-904','LN-905','LN-906','LN-907','LN-908'
)
AND l.notes = 'DEMO DATA'
AND NOT EXISTS (SELECT 1 FROM "LoanDocument" d WHERE d."loanId" = l.id)
AND NOT EXISTS (SELECT 1 FROM "LoanFollowUp" f WHERE f."loanId" = l.id);

-- Delete only known demo customers that no remaining real record references.
DELETE FROM "Customer" c
WHERE c."customerId" IN ('CUS-901','CUS-902','CUS-903','CUS-904','CUS-905','CUS-906','CUS-907')
AND c.notes = 'DEMO DATA'
AND NOT EXISTS (SELECT 1 FROM "Car" x WHERE x."sellerId" = c.id)
AND NOT EXISTS (SELECT 1 FROM "CarSale" x WHERE x."buyerId" = c.id)
AND NOT EXISTS (SELECT 1 FROM "Loan" x WHERE x."customerId" = c.id)
AND NOT EXISTS (SELECT 1 FROM "FinanceEnquiry" x WHERE x."customerId" = c.id);

COMMIT;
