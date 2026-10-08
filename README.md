# SM Associate Backend

Node.js + Express + TypeScript + PostgreSQL + Prisma.

## Setup

```bash
npm install
copy .env.example .env
```

Set `DATABASE_URL` in `.env` to your PostgreSQL database:

```env
DATABASE_URL=postgresql://postgres:<PASSWORD>@localhost:5432/sm_associate?schema=public
```

Create/update the PostgreSQL schema:

```bash
npm run prisma:generate
npm run prisma:push
```

Start the API:

```bash
npm run dev
```

API: http://localhost:5000/api/v1

Health: GET /api/v1/health

Swagger: http://localhost:5000/api-docs

## Storage

MongoDB/Mongoose has been removed.

Cloudinary has also been removed. Uploaded documents are stored directly in PostgreSQL using a `bytea` column and can be downloaded through the backend document endpoint. Uploads remain limited to 10 MB.

For customer documents, use the multipart upload endpoint rather than a direct third-party upload.

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