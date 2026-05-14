# mail-service-node

A self-hosted, open-source **Template-Based Email Microservice** — a multi-tenant SaaS that decouples email logic from your applications. Provides a REST API for sending transactional emails, MongoDB storage for HTML templates with dynamic Handlebars placeholders, per-app SMTP isolation, organisation-based team management, and a React management UI.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 18+ · Express · TypeScript |
| Database | MongoDB (Mongoose) |
| Email | Nodemailer (SMTP pool) · Handlebars · juice CSS inliner |
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS |
| State | Zustand + persist |
| HTTP | Axios |
| Auth | JWT (7-day) · bcryptjs |

## Quick Start

**1. Install all dependencies**
```bash
npm run install:all
```

**2. Configure environment** — edit `server/.env.dev`:
```env
MONGODB_ENV=dev
MONGODB_URI_DEV=mongodb://localhost:27017/mailservice_dev
JWT_SECRET=your-long-random-secret-here

# Default SMTP (used by seed script only — each app sets its own SMTP in the dashboard)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=hello@yourdomain.com
SMTP_PASS=your_password

# Optional — seed script defaults
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=changeme123
```

Generate `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> **Note:** The server refuses to start if `JWT_SECRET` is not set.

**3. Seed the first superadmin + default templates**
```bash
npm run seed
```

**4. Start dev servers**
```bash
npm run dev
# API  → http://localhost:3001
# UI   → http://localhost:5173
```

**5. First login**

Register at `http://localhost:5173/register`. The first registered user becomes the superadmin and is automatically assigned to the "Mail Service" organisation. All subsequent users create or join an organisation separately.

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

## Send API (API key auth)

```http
POST /v1/send
X-API-KEY: your-app-api-key
Content-Type: application/json

{
  "template_slug": "welcome-email",
  "recipient": "user@example.com",
  "data": { "user_name": "Jane", "ctaUrl": "https://yourapp.com" }
}
```

---

## API Routes

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/auth/register` | Register a new user |
| `POST` | `/v1/auth/login` | Login → JWT token |
| `GET` | `/v1/smtp-providers` | List SMTP provider presets |
| `GET` | `/v1/unsubscribe` | Handle unsubscribe links (HMAC-signed) |

### JWT auth (dashboard users)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/auth/me` | Get current user |
| `PUT` | `/v1/auth/me` | Update profile, password, avatar |
| `GET` | `/v1/apps` | List user's apps |
| `POST` | `/v1/apps` | Create app |
| `GET/PUT/DELETE` | `/v1/apps/:id` | Get/update/delete app |
| `POST` | `/v1/apps/:id/regenerate-key` | Regenerate API key |
| `GET/POST/PUT/DELETE` | `/v1/apps/:id/members` | Member management (CRUD permissions) |
| `GET` | `/v1/orgs/me` | Get user's organisation |
| `PUT` | `/v1/orgs/me` | Update org (admin only) |
| `GET` | `/v1/orgs/me/members` | List org members |
| `POST` | `/v1/orgs/me/members` | Invite member to org |
| `PUT/DELETE` | `/v1/orgs/me/members/:userId` | Update/remove org member |
| `POST` | `/v1/orgs/join` | Join org by ID |
| `POST` | `/v1/orgs` | Create a new organisation |

### JWT auth — superadmin only

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/admin/users` | List all users (search/filter/paginate) |
| `PUT/DELETE` | `/v1/admin/users/:id` | Edit/delete user |
| `GET` | `/v1/admin/orgs` | List all organisations |
| `GET/PUT` | `/v1/admin/platform` | Platform-wide LLM config |

### API key auth (external callers)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/send` | Send email via template |
| `POST` | `/v1/send/raw` | Send raw HTML email |
| `GET/POST/PUT/DELETE` | `/v1/templates` | Template management |
| `GET` | `/v1/logs` | Send logs (paginated) |
| `POST` | `/v1/preview/:slug` | Render a template (no send) |
| `POST` | `/v1/preview/raw` | Render raw HTML + Handlebars |
| `GET/POST/PUT/DELETE` | `/v1/payload-schemas` | Payload schema management |

### JWT + API key auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/ai/generate` | AI template/subject generation |
| `POST` | `/v1/ai/improve` | AI template improvement |
| `POST` | `/v1/ai/schema` | AI schema generation |
| `POST` | `/v1/ai/test` | Test LLM connection (superadmin) |

---

## Production

```bash
npm run build           # builds client + server
cd server && npm run start:prod   # serves everything on port 3001
```
