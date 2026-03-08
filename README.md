# mail-service-node

A standalone, open-source **Template-Based Email Microservice** that decouples email logic from your main application. Provides a REST API for sending transactional emails, MongoDB storage for HTML templates with dynamic Handlebars placeholders, and a React management UI for editing and testing templates.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 18+ · Express · TypeScript |
| Database | MongoDB (Mongoose) |
| Email | Nodemailer (SMTP pool) · Handlebars · juice CSS inliner |
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS |
| State | Zustand + persist |
| HTTP | Axios |

## Quick Start

**1. Install all dependencies**
```bash
npm run install:all
```

**2. Configure environment** — edit `server/.env.dev`:
```env
MONGODB_ENV=dev
MONGODB_URI_DEV=mongodb://localhost:27017/mailservice_dev
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=hello@yourdomain.com
SMTP_PASS=your_password
API_KEY=your-secret-api-key
```

**3. Seed default templates**
```bash
npm run seed
```

**4. Start dev servers**
```bash
npm run dev
# API  → http://localhost:3001
# UI   → http://localhost:5173
```

---

## Environments

`MONGODB_ENV` selects which URI is used:

| `MONGODB_ENV` | Variable used |
|---|---|
| `dev` | `MONGODB_URI_DEV` |
| `staging` | `MONGODB_URI_STAGING` |
| `prod` | `MONGODB_URI_PROD` |

npm scripts load the right `.env` file automatically via `dotenv-cli`.

---

## Send API

```
POST /v1/send
X-API-KEY: your-key
Content-Type: application/json

{
  "template_slug": "verification-code",
  "recipient": "user@example.com",
  "data": { "code": "123456", "expiry": "10 minutes", "user_name": "Jane" }
}
```

## Other Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/templates` | List templates |
| `POST` | `/v1/templates` | Create template |
| `PUT` | `/v1/templates/:slug` | Update template |
| `DELETE` | `/v1/templates/:slug` | Delete template |
| `GET` | `/v1/logs` | Send logs (paginated) |
| `POST` | `/v1/preview` | Render saved template |
| `POST` | `/v1/preview/raw` | Render raw HTML + Handlebars |
| `GET` | `/health` | Server health check |

## Production

```bash
npm run build           # builds client + server
cd server && npm run start:prod   # serves everything on port 3001
```
