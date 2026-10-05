# PostgreSQL + Prisma Migration

This branch migrates the SM Associate backend from MongoDB/Mongoose to PostgreSQL/Prisma without changing the existing HTTP API contract used by the Web and Mobile clients.

## Architecture

React Web / React Native Mobile
→ Node.js + Express + TypeScript
→ Prisma
→ PostgreSQL (Supabase, Neon, or another PostgreSQL provider)

The existing Vercel api/[...path].ts and api/v1/[...path].ts entrypoints are retained.

## Compatibility

The existing /api/v1/* routes, HTTP methods, request shapes, JWT format, response envelopes, and ADMIN / STAFF roles are preserved.

Prisma uses string primary keys and a toLegacy() compatibility adapter so database id fields are returned to clients as Mongo-compatible _id fields. Existing MongoDB ObjectId strings are preserved by the import script.

## Environment

Required for PostgreSQL runtime:

    DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
    JWT_SECRET=...
    ADMIN_NAME=SM Associate Admin
    ADMIN_EMAIL=admin@smassociate.com
    ADMIN_PASSWORD=...
    CLIENT_URL=http://localhost:5173
    NODE_ENV=development

MONGODB_URI is no longer used by the runtime. It is required only when running npm run db:import-mongodb.

## Local setup

    npm install
    npx prisma generate
    npm run db:migrate
    npm run db:seed
    npm run dev

Health endpoints:

    GET /api/v1/health
    GET /api/v1/health/db

## MongoDB → PostgreSQL migration

Do not delete or modify the MongoDB database.

1. Create the PostgreSQL database.
2. Set DATABASE_URL.
3. Keep the old MONGODB_URI available temporarily.
4. Run:

    npm run db:migrate
    npm run db:import-mongodb

The importer is idempotent and uses the original MongoDB _id values as PostgreSQL string primary keys. It imports users, customers, finance services, cars, car expenses, loans, loan follow-ups, car sales, finance enquiries, sequence counters, and document metadata.

If a record cannot be imported, the script reports the collection, record ID, and error and exits non-zero. Re-running the script is safe.

After verifying PostgreSQL data and API behavior, remove MONGODB_URI from runtime environments.

## IDs

Externally visible IDs such as CUS-xxxxx, CAR-xxxxx, LOAN-xxxxx, SALE-xxxxx, and ENQ-xxxxx are preserved.

MongoDB ObjectIds exposed by existing APIs are retained as 24-character hexadecimal strings during import. New database records use the same 24-character string format so Web/Mobile route parameters continue to work.

## Documents

The existing documents JSON structures on Car, CarSale, and Loan are retained in PostgreSQL jsonb for API compatibility.

A normalized Document table is also included for document metadata and future object-storage integration.

Actual files are still handled by the existing upload middleware. Moving these files to durable object storage is a separate production task; Vercel serverless filesystem state must not be treated as permanent storage.

## Vercel

Set DATABASE_URL, JWT_SECRET, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, CLIENT_URL, and NODE_ENV in Vercel.

Do not put credentials in source code.

Run database migrations before routing production traffic to the new deployment:

    npm run db:migrate

The Prisma client is created once at module scope and reused across warm serverless invocations.

## Verification

CI creates a disposable PostgreSQL 16 database, runs Prisma migrations, seeds an admin, builds TypeScript, and exercises health, PostgreSQL health, login, JWT /me, customer create/list/update, vehicle create, vehicle expense, vehicle sale, loan create/detail/status, finance services, documents, dashboard report, loan revenue report, and operational report.

The Web and Mobile repositories do not need API changes for this migration.
