# Request & Response Architecture

This document explains how requests flow through the system — from the browser UI, through the Vite dev proxy or Express static server, into the API layer, and back. It also covers the two auth layers, how third-party callers hit the API directly, and how the architecture would shift at scale.

---

## 1. The Two Runtime Modes

The same codebase runs in two fundamentally different topologies depending on the environment.

### Development (two processes)

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (localhost:7173)                                        │
│                                                                  │
│  React App (Vite dev server)                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  axios client.ts   →  baseURL: '/v1'                     │   │
│  │                                                          │   │
│  │  GET /v1/apps      ─────────────────────────────────►   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Vite proxy rule:
                           │ '/v1' → http://localhost:3001
                           │ (changeOrigin: true)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Express Server (localhost:3001)                                 │
│                                                                  │
│  app.use('/v1', apiRoutes)                                       │
│                                                                  │
│  middleware stack:                                               │
│    helmet → cors → json → requestLogger → rateLimit → routes    │
│                                                                  │
│  GET /v1/apps  →  requireAuth  →  appsRouter handler            │
│                                         │                        │
│                                         ▼                        │
│                                   MongoDB (Mongoose)             │
└─────────────────────────────────────────────────────────────────┘
```

**Key insight:** In development the React app runs on port 7173 and the API on port 3001. The Vite dev server acts as a **transparent reverse proxy** for any request that starts with `/v1` or `/health`. The browser always talks to `localhost:7173` — it never knows port 3001 exists. This avoids CORS issues entirely during development.

### Production (one process)

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (https://yourdomain.com)                               │
│                                                                  │
│  GET /           ──────────────────────────────────────────►   │
│  GET /v1/apps    ──────────────────────────────────────────►   │
└──────────────────────────────────────┬──────────────────────────┘
                                       │ Single origin, no proxy
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  Express Server (port 3001 behind nginx/Caddy or direct)        │
│                                                                  │
│  app.use(express.static('client/dist'))   ← serves React SPA   │
│  app.use('/v1', apiRoutes)                ← API routes          │
│  app.get('*', → index.html)               ← SPA fallback        │
└─────────────────────────────────────────────────────────────────┘
```

In production Express serves the pre-built React `dist/` folder as static files and also handles all `/v1/*` API calls. One process, one port, no proxy.

---

## 2. The Two Auth Layers

Every request carries zero, one, or two credentials. The API has two completely separate auth mechanisms that are used in combination depending on the route.

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Incoming Request                              │
│                                                                      │
│  Headers:                                                            │
│    Authorization: Bearer eyJ...   ← JWT token (identifies a User)  │
│    X-API-KEY: ak_uuid-here        ← App API key (identifies an App) │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
              ┌────────────────┴─────────────────┐
              │                                  │
              ▼                                  ▼
     requireAuth middleware            requireApiKey middleware
     ─────────────────────            ───────────────────────
     Verifies JWT signature           Looks up EmailApp by api_key
     Fetches User from MongoDB        Attaches req.emailApp
     Attaches req.user
     Checks user.is_active
              │                                  │
              ▼                                  ▼
     req.user = { _id, role, ... }    req.emailApp = { _id, smtp_*, ... }
```

### Which routes use which auth

| Route group | Auth required | What it identifies |
|---|---|---|
| `POST /v1/auth/register` | None | — |
| `POST /v1/auth/login` | None | — |
| `GET /v1/unsubscribe` | None (HMAC token in query) | App + email from token |
| `GET /v1/smtp-providers` | None | — |
| `GET /v1/apps` | JWT only | User → their apps |
| `PUT /v1/apps/:id` | JWT only | User → ownership/role check |
| `GET/PUT /v1/admin/*` | JWT + superadmin role | Superadmin user |
| `POST /v1/ai/generate` | JWT **+** API key | User (role check) + App (llm_enabled check) |
| `POST /v1/ai/schema` | JWT only | User (platform check) |
| `POST /v1/send` | API key only | App → SMTP config |
| `GET /v1/templates` | API key only | App → scoped templates |
| `GET /v1/logs` | API key only | App → scoped logs |
| `POST /v1/preview` | API key only | App → render context |

---

## 3. A Complete Request Lifecycle

### Example: React UI sends a template (JWT + API key)

```
Browser (React)
  │
  │  axios interceptor attaches headers automatically:
  │    Authorization: Bearer <JWT from localStorage auth-store>
  │    X-API-KEY: <api_key from localStorage app-store>
  │
  ▼
GET /v1/templates
  │
  │  [Dev: Vite proxy forwards to :3001]
  │  [Prod: Express receives directly]
  │
  ▼
Express middleware chain
  ├── helmet()          — security headers
  ├── cors()            — origin check
  ├── json()            — parse body
  ├── requestLogger     — logs method + path + ms
  ├── apiLimiter        — rate limit (100 req/15 min per IP)
  └── /v1/templates router
        │
        └── requireApiKey
              │  reads X-API-KEY header
              │  EmailApp.findOne({ api_key })
              │  attaches req.emailApp
              ▼
            handler
              │  Template.find({ app_id: req.emailApp._id })
              │  also returns global templates (app_id: null)
              ▼
            200 JSON response
              │
  ◄───────────┘
  │
  ▼
React store (templateStore.ts)
  setTemplates(data)
  UI re-renders
```

### Example: External service sends an email (API key only)

```
Your backend (Node / Python / PHP / etc.)
  │
  │  POST https://yourdomain.com/v1/send
  │  Headers: X-API-KEY: ak_your-uuid
  │  Body: { template_slug, recipient, data }
  │
  ▼
Express → requireApiKey → emailService.ts
  │
  ├── Unsubscribe check (Unsubscribe.findOne)
  ├── Template lookup (Template.findOne by slug + app_id)
  ├── Layout merge (if use_layout)
  ├── Handlebars render (with mergedData)
  ├── Juice CSS inline
  ├── buildUnsubscribeUrl → injects {{unsubscribeUrl}}
  ├── SMTP transporter (per-app cached Nodemailer pool)
  ├── nodemailer.sendMail()
  └── EmailLog.create({ status: 'success' | 'failed' })
  │
  ▼
200 { success: true, messageId: "<abc@smtp>" }
```

---

## 4. AI Request Flow (three-tier proxy)

This is the most interesting flow — the AI call goes browser → Express → LLM provider. The API key never reaches the browser.

```
Browser (React)
  │
  │  POST /v1/ai/generate
  │  Authorization: Bearer <JWT>
  │  X-API-KEY: <app api_key>
  │  Body: { prompt, type }
  │
  ▼
Express → requireAuth → requireApiKey → checkLlmAccess()
  │   platform.llm.enabled?
  │   app.llm_enabled?
  │   member.role >= app.llm_min_role?
  │
  ▼
callLlm(platformConfig.llm, systemPrompt, userPrompt)
  │
  │  fetch(https://generativelanguage.googleapis.com/...)
  │  Authorization: api_key from MongoDB (never sent to browser)
  │
  ▼
LLM Provider (Gemini / OpenAI / Anthropic / Ollama)
  │
  ▼
Express extracts text → returns { html } or { subject }
  │
  ▼
Browser: setField('body_html', data.html)
```

The browser **never sees** the LLM API key. It only sends the app's `X-API-KEY` (which is already stored client-side for all API calls) and its own JWT.

---

## 5. Current Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  CURRENT (Monolith + SPA)                                        │
│                                                                  │
│  ┌──────────┐    Vite proxy (dev)     ┌────────────────────┐   │
│  │  React   │ ──────────────────────► │  Express + Routes  │   │
│  │  (SPA)   │ ◄────────────────────── │  (single process)  │   │
│  └──────────┘    static files (prod)  └─────────┬──────────┘   │
│                                                  │              │
│  External APIs ──────────────────────────────────┤              │
│  (POST /v1/send etc.)                            │              │
│                                                  ▼              │
│                                          ┌───────────────┐      │
│                                          │   MongoDB     │      │
│                                          └───────────────┘      │
│                                                  │              │
│                                          ┌───────────────┐      │
│                                          │  SMTP server  │      │
│                                          │  (Nodemailer) │      │
│                                          └───────────────┘      │
│                                                  │              │
│                                          ┌───────────────┐      │
│                                          │  LLM Provider │      │
│                                          │  (fetch only) │      │
│                                          └───────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

**Strengths of current design:**
- Single deployment unit — easy to host (one VPS, one process)
- No CORS config needed (same origin in prod, proxy in dev)
- Vite proxy means zero configuration change when going from dev to prod
- Stateless JWT + API key means horizontal scaling is already possible

---

## 6. Future Separation Points

As the platform grows into a multi-tenant SaaS the architecture splits naturally at three boundaries. Each split is independent — you don't need to do all three at once.

### Split 1 — Frontend CDN (low effort, high leverage)

```
┌──────────────────────────────────────────────────────────────────┐
│  SPLIT 1: Static frontend on CDN                                 │
│                                                                  │
│  ┌──────────────┐         ┌───────────────────────────────┐    │
│  │  CDN / S3    │         │  Express API (api.domain.com) │    │
│  │  (React SPA) │         │                               │    │
│  │              │ ──────► │  CORS: allow cdn.domain.com   │    │
│  │ cdn.domain   │         │  All /v1/* routes             │    │
│  └──────────────┘         └───────────────────────────────┘    │
│                                                                  │
│  Change needed:                                                  │
│  1. Set VITE_API_BASE_URL=https://api.domain.com in build       │
│  2. Update client.ts baseURL to read VITE_API_BASE_URL          │
│  3. Add CLIENT_URL=https://cdn.domain.com to server env         │
│  4. Remove express.static() and SPA fallback from server        │
└──────────────────────────────────────────────────────────────────┘
```

### Split 2 — Email Worker Queue (high volume)

When send volume is high enough that synchronous SMTP calls block the API:

```
┌──────────────────────────────────────────────────────────────────┐
│  SPLIT 2: Async email worker                                     │
│                                                                  │
│  POST /v1/send                                                   │
│    │                                                             │
│    ▼                                                             │
│  Validate + render template                                      │
│    │                                                             │
│    ▼                                                             │
│  Push job to queue (BullMQ / Redis)  ←── returns 202 Accepted  │
│    │                                                             │
│    ▼                                                             │
│  ┌──────────────────────────────┐                               │
│  │  Email Worker (separate pod) │                               │
│  │  - Dequeue job               │                               │
│  │  - SMTP send (Nodemailer)    │                               │
│  │  - Write EmailLog            │                               │
│  └──────────────────────────────┘                               │
│                                                                  │
│  Add to model: EmailLog.status += 'queued'                      │
│  Change needed: BullMQ + Redis, worker process, job schema      │
└──────────────────────────────────────────────────────────────────┘
```

### Split 3 — Microservices (full SaaS scale)

```
┌──────────────────────────────────────────────────────────────────┐
│  SPLIT 3: Service mesh                                           │
│                                                                  │
│  ┌───────────┐   API Gateway / Load Balancer                    │
│  │  React    │ ──────────────┬────────────────────────────────  │
│  │  SPA      │               │                                  │
│  └───────────┘               ▼                                  │
│                   ┌──────────────────────┐                      │
│  External APIs ──►│  Auth Service        │ JWT issue/verify     │
│                   └──────────────────────┘                      │
│                             │                                    │
│              ┌──────────────┼──────────────┐                    │
│              ▼              ▼              ▼                     │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│   │ Template Svc │ │  Email Svc   │ │   AI Svc     │          │
│   │ /templates   │ │ /send /logs  │ │ /ai/*        │          │
│   │ /preview     │ │ (+ worker)   │ │              │          │
│   └──────────────┘ └──────────────┘ └──────────────┘          │
│          │                │                 │                    │
│          └────────────────┴─────────────────┘                   │
│                           │                                      │
│                    ┌──────────────┐                              │
│                    │   MongoDB    │  (or sharded per service)    │
│                    └──────────────┘                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. What Would Need to Change for Each Split

| Concern | Current | Split 1 (CDN) | Split 2 (Queue) | Split 3 (Micro) |
|---|---|---|---|---|
| Frontend hosting | Express static | CDN (S3/CF) | CDN | CDN |
| API base URL | `/v1` (relative) | Absolute URL via env var | Same | Per-service URLs |
| CORS | Disabled / `*` | Enabled, origin whitelist | Same | Per-service |
| SMTP sending | Sync in request | Sync | Async via queue | Dedicated Email Svc |
| LLM calls | Sync in request | Sync | Sync | Dedicated AI Svc |
| Auth | JWT in Express middleware | Same | Same | Shared Auth Svc or JWT still |
| DB | Single MongoDB | Same | Same | Per-service or shared |
| Config needed | None | `VITE_API_BASE_URL` | Redis URL | Service URLs |

---

## 8. What the Vite Proxy Actually Does

To be concrete — in `vite.config.ts`:

```ts
proxy: {
  '/v1':     { target: 'http://localhost:3001', changeOrigin: true },
  '/health': { target: 'http://localhost:3001', changeOrigin: true },
}
```

When the browser makes `GET http://localhost:7173/v1/apps`:
1. Vite intercepts it (the browser never sends it out)
2. Vite opens a new request to `http://localhost:3001/v1/apps`
3. `changeOrigin: true` rewrites the `Host` header to `localhost:3001`
4. Vite streams the response back to the browser

From the browser's perspective the request went to port 7173. From Express's perspective the request came from port 7173 (Vite). This is identical to what nginx does in production — it's the standard reverse-proxy pattern.

**In production** the Vite proxy disappears entirely. Express serves both `GET /` (static HTML) and `GET /v1/*` (API) on the same port from the same process. No proxy, no CORS needed.

---

## 9. The `client.ts` Axios Client

```ts
const client = axios.create({ baseURL: '/v1' });

client.interceptors.request.use((config) => {
  config.headers['Authorization'] = `Bearer ${getToken()}`;   // JWT from localStorage
  config.headers['X-API-KEY']     = getApiKey();              // app api_key from localStorage
  return config;
});
```

All API calls use a **relative base URL** (`/v1`). This works in both dev (Vite proxy picks it up) and prod (Express handles it). To support Split 1 (CDN), change this one line to read from `import.meta.env.VITE_API_BASE_URL || '/v1'`.

---

## 10. External API Callers

External systems (your app's backend, Postman, curl) skip the React frontend entirely and call the Express API directly:

```
Your backend service
  │
  │  POST https://mail.yourdomain.com/v1/send
  │  X-API-KEY: ak_your-app-uuid
  │  Content-Type: application/json
  │  { "template_slug": "welcome-email", "recipient": "user@example.com", "data": {...} }
  │
  ▼
Express (same server, same process)
  requireApiKey → emailService → SMTP → EmailLog
  │
  ▼
{ "success": true, "messageId": "..." }
```

No JWT needed. No browser involved. The Vite proxy is irrelevant — external callers talk directly to Express on its port (or through nginx/Caddy in production).
