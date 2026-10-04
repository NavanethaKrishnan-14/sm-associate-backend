# SM Associate Backend

Node.js + Express + TypeScript + local MongoDB.

## Setup
```bash
npm install
copy .env.example .env
npm run dev
```

Default MongoDB: mongodb://127.0.0.1:27017/sm_associate

API: http://localhost:5000/api/v1

Health: GET /api/v1/health

Car profit = selling price - purchase price - buying expenses - selling expenses.

## Swagger / OpenAPI

Interactive API documentation is available at:

http://localhost:5000/api-docs

The Swagger UI documents the REST endpoints and supports JWT authentication through the Authorize button. Start the backend with npm run dev, open the documentation URL, sign in through POST /api/v1/auth/login, and use the returned JWT as Bearer <token>.
