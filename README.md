# SM Associate Backend

Node.js + Express + TypeScript + PostgreSQL + Prisma.

## Setup

```bash
npm install
copy .env.example .env
```

Set `DATABASE_URL` in `.env` to your PostgreSQL database:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

Use your local PostgreSQL URL for development and your hosted production PostgreSQL URL in Vercel. Never use `localhost` or `127.0.0.1` for the Vercel production database.

Apply the PostgreSQL schema locally or in production:

```bash
npm run prisma:generate
npm run prisma:migrate
```

`prisma:migrate` applies the checked-in production migrations.

After the database migrations have completed and the configured admin has logged in once, you can explicitly add the demo dataset:

```bash
npm run seed:demo
```

This seeds reserved demo IDs for customers, loans, loan-document checklist items, cars bought and sold, vehicle expenses, finance enquiries, and operational expenses. It removes/recreates only those reserved demo records; it does not clear real records or Dashboard Notes. Demo checklist items are metadata only and do not pretend that real files were uploaded.

To remove only the demo dataset later:

```bash
npm run seed:demo:clear
```

Do not run the seed command before `npm run prisma:migrate` completes successfully.

Start the API:

```bash
npm run dev
```

API: http://localhost:5000/api/v1

Health: GET /api/v1/health

Swagger: http://localhost:5000/api-docs

## Storage

Uploaded documents are stored directly in PostgreSQL using the `bytea`/`Bytes` document storage table and can be downloaded through the backend document endpoint. Uploads are limited to 10 MB.

For customer documents, use the multipart upload endpoint.

## Authentication

The API uses JWT authentication. Configure:

```env
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_NAME=SM Associate Admin
ADMIN_EMAIL=admin@smassociate.com
ADMIN_PASSWORD=replace-with-a-secure-password
```

The first server start creates/synchronizes the configured ADMIN account.

## Business calculation

Car profit = selling price - purchase price - buying expenses - selling expenses.

## Swagger / OpenAPI

The Swagger UI documents the REST endpoints and supports JWT authentication through the Authorize button. Start the backend with `npm run dev`, open the documentation URL, sign in through `POST /api/v1/auth/login`, and use the returned JWT as `Bearer <token>`.