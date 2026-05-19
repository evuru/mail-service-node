# Architecture — MailService Node

This document covers the multi-tenant data model, API access controls, deployment topology, and a phased scaling plan.

---

## Table of Contents

1. [What's Already Multi-Tenant](#1-whats-already-multi-tenant)
2. [Tenancy Hierarchy](#2-tenancy-hierarchy)
3. [Auth & Access Model](#3-auth--access-model)
4. [API Isolation — How Multiple Apps Co-exist](#4-api-isolation--how-multiple-apps-co-exist)
5. [AI / LLM — Config Cascade](#5-ai--llm---config-cascade)
6. [Deployment Topology (Current)](#6-deployment-topology-current)
7. [Scaling Plan — Three Phases](#7-scaling-plan--three-phases)
8. [Security Hardening Checklist](#8-security-hardening-checklist)
9. [MongoDB Index & Query Reference](#9-mongodb-index--query-reference)
10. [Environment Variables Reference](#10-environment-variables-reference)

---

## 1. What's Already Multi-Tenant

The system ships with full multi-tenancy baked in. No "tenant ID" sharding is needed — the data model already isolates everything by `org_id`, `app_id`, and `user_id`.

| Layer | Isolation unit | Enforced by |
|---|---|---|
| Users | `User._id` | JWT payload |
| Organisations | `Organization._id` → `User.org_id` | org routes check `req.user.org_id` |
| Email Apps | `EmailApp._id` → `api_key` | `requireApiKey` middleware |
| Templates | `Template.app_id` (null = global) | query filter on every read |
| Logs | `EmailLog.app_id` | query filter on every read |
| App access | `AppMember` junction (app_id + user_id) | `canRead/Write/Delete/Manage` helpers |

What **one tenant cannot do to another** by design:
- An `api_key` only unlocks its own `EmailApp` — templates, logs, and sends are all scoped to that app.
- JWT users can only see apps they own or are an `AppMember` of.
- Superadmin is the only role that crosses tenant boundaries (admin routes only).
- SMTP credentials are stored per-app — one app's bad creds cannot affect another's delivery.

---

## 2. Tenancy Hierarchy

```mermaid
erDiagram
    Organization {
        string _id PK
        string name
        string slug
        string logo_base64
        string created_by FK
        object llm "provider, api_key, model, enabled"
    }
    User {
        string _id PK
        string name
        string email
        string org_id FK
        bool   is_org_admin
        string role
    }
    EmailApp {
        string _id PK
        string app_name
        string owner_id FK
        string api_key
        string smtp_host
        string smtp_user
        string smtp_pass
    }
    AppMember {
        string app_id FK
        string user_id FK
        string role
        bool   can_read
        bool   can_write
        bool   can_delete
        bool   can_manage
    }
    Template {
        string _id PK
        string app_id FK
        string slug
        bool   is_global
    }
    EmailLog {
        string _id PK
        string app_id FK
        string recipient
        string status
    }
    PayloadSchema {
        string _id PK
        string name
        array  fields
    }

    Organization ||--o{ User        : "has members"
    User         ||--o{ EmailApp    : "owns"
    EmailApp     ||--o{ AppMember   : "has"
    User         ||--o{ AppMember   : "belongs to"
    EmailApp     ||--o{ Template    : "scopes"
    EmailApp     ||--o{ EmailLog    : "records"
    Template     }o--o| PayloadSchema : "typed by"
```

**Key relationships:**
- One org → many users
- One user → many email apps (as owner)
- One email app → many members (via AppMember junction)
- One email app → many templates + logs
- Templates with `app_id: null` + `is_global: true` are visible across all apps

---

## 3. Auth & Access Model

Two completely separate authentication layers coexist. They never share scope.

```mermaid
flowchart LR
    A[Client / External App] -->|Authorization: Bearer JWT| B(requireAuth)
    A -->|X-API-KEY: uuid| C(requireApiKey)

    B --> D[req.user = IUser]
    C --> E[req.emailApp = IEmailApp]

    D --> F{Dashboard routes\n/v1/apps /v1/orgs\n/v1/admin /v1/ai}
    E --> G{API routes\n/v1/send /v1/templates\n/v1/logs /v1/preview}

    D --> H{also sets req.emailApp\nvia app-store header\nfor AI + dual-auth routes}
```

### Auth layer comparison

| Attribute | JWT (Bearer token) | API Key (X-API-KEY) |
|---|---|---|
| Who uses it | Dashboard users | External apps, CI pipelines |
| What it identifies | A `User` | An `EmailApp` |
| Scope | All apps the user is a member of | Exactly one `EmailApp` |
| Expiry | 7 days | Never (manual regeneration) |
| Where stored | `localStorage` (client) | Application env / secrets manager |
| Rotation | Re-login | `POST /v1/apps/:id/regenerate-key` |
| Admin escalation | Checked via `user.role === 'superadmin'` | None — API key is always app-scoped |

### Permission matrix (app members)

| Flag | owner preset | editor preset | viewer preset | API key caller |
|---|:---:|:---:|:---:|:---:|
| `can_read` — view templates & logs | ✅ | ✅ | ✅ | ✅ (always) |
| `can_write` — create/edit templates | ✅ | ✅ | ❌ | ✅ (always) |
| `can_delete` — delete templates | ✅ | ❌ | ❌ | ✅ (always) |
| `can_manage` — SMTP, API key, members | ✅ | ❌ | ❌ | N/A |

> **Note:** API key callers bypass the AppMember permission flags entirely — they have full read/write/delete access within their single app. The flags apply only to dashboard (JWT) users. Keep API keys in server-side env vars and rotate them when team members leave.

---

## 4. API Isolation — How Multiple Apps Co-exist

Every external API consumer (your SaaS product, mobile app, marketing tool, etc.) gets its own `EmailApp` record with a unique `api_key`. This is the fundamental isolation unit.

```mermaid
flowchart TD
    subgraph "Your Org"
        U1[User: alice@acme.com\norg_admin]
        U2[User: bob@acme.com\neditor]
    end

    subgraph "App: marketing-emails\napi_key: aaa-111"
        T1[Template: newsletter]
        T2[Template: promo-blast]
        S1[SMTP: sendgrid]
    end

    subgraph "App: transactional-prod\napi_key: bbb-222"
        T3[Template: welcome-email]
        T4[Template: password-reset]
        S2[SMTP: ses-prod]
    end

    subgraph "App: transactional-staging\napi_key: ccc-333"
        T5[Template: welcome-email]
        S3[SMTP: ses-sandbox]
    end

    U1 -->|owner| marketing-emails
    U1 -->|owner| transactional-prod
    U1 -->|owner| transactional-staging
    U2 -->|editor| marketing-emails
```

### Practical rules for managing multiple apps

| Scenario | Recommendation |
|---|---|
| Prod vs staging environments | Separate `EmailApp` per environment — different SMTP, different API key |
| Multiple products / sub-brands | Separate `EmailApp` per brand — each has its own `smtp_from_name` and template set |
| Third-party integrations (Zapier, Make) | Issue a dedicated `EmailApp` so you can revoke access without affecting other callers |
| Shared base templates | Use global templates (`app_id: null`) for layout shells; app-specific templates extend them |
| CI/CD test sends | Separate `EmailApp` pointed at a sandbox SMTP (Mailtrap, SES sandbox) |

### Request lifecycle — template send

```mermaid
sequenceDiagram
    participant C as External App
    participant API as Express API
    participant DB as MongoDB
    participant SMTP as SMTP Server

    C->>API: POST /v1/send\nX-API-KEY: bbb-222
    API->>DB: EmailApp.findOne({ api_key: 'bbb-222' })
    DB-->>API: EmailApp { smtp_host, smtp_pass, ... }
    API->>DB: Template.findOne({ slug, app_id: emailApp._id })
    DB-->>API: Template { html, subject }
    API->>API: Handlebars render(html, data)
    API->>SMTP: nodemailer.sendMail(...)
    SMTP-->>API: accepted
    API->>DB: EmailLog.create({ app_id, status: 'sent' })
    API-->>C: 200 { message_id, status: 'sent' }
```

---

## 5. AI / LLM — Config Cascade

AI features are available at `/v1/ai/generate`, `/v1/ai/improve`, and `/v1/ai/schema`. Every request resolves the active LLM configuration through a two-level priority chain before making any external API call.

### Priority chain

```mermaid
flowchart TD
    REQ[Incoming AI request\nJWT user identified] --> ORG{Org has llm.enabled = true\nAND llm.api_key set?}
    ORG -->|Yes| ORGCFG[Use org LLM config\norg's own provider + key]
    ORG -->|No| PLAT{Platform llm.enabled = true?}
    PLAT -->|Yes| PLATCFG[Use platform LLM config\noperator's provider + key]
    PLAT -->|No| DENY[403 — AI not enabled]
    ORGCFG --> APPCHECK{App llm_enabled = true?}
    PLATCFG --> APPCHECK
    APPCHECK -->|No| DENAPP[403 — AI not enabled for this app]
    APPCHECK -->|Yes| ROLECHECK{User role >= app.llm_min_role?}
    ROLECHECK -->|No| DENYROLE[403 — Insufficient role]
    ROLECHECK -->|Yes| CALL[Call LLM API]
```

### Config levels

| Level | Who configures it | Where in UI | Scope |
|---|---|---|---|
| **Platform** | Superadmin | Admin → Platform Settings | Default for all orgs that haven't set their own key |
| **Org** | Org admin | Settings → Organisation AI | Overrides platform for all members of that org |
| **App** | App owner | App Settings → AI tab | Toggle on/off per app; set minimum role |
| **Member** | App owner | App Settings → Members | `llm_min_role` — owner / editor / viewer threshold |

### Key rules

- An org's `api_key` is **never returned** to the client — `GET /orgs/me/llm` returns `api_key_set: boolean`.
- If an org sets `enabled: true` but has no `api_key`, it falls through to the platform config (not an error).
- `/ai/schema` (schema generation) is not app-scoped — it uses the org or platform config directly with no app-level check.
- `/ai/test` (superadmin only) always tests the **platform** config. Org admins use `POST /orgs/me/llm/test` to test their own config.

### New routes added

| Method | Path | Who | Description |
|---|---|---|---|
| `GET` | `/v1/orgs/me/llm` | Org admin | Get org LLM config (api_key_set, not raw key) |
| `PUT` | `/v1/orgs/me/llm` | Org admin | Save org LLM config |
| `POST` | `/v1/orgs/me/llm/test` | Org admin | Test org LLM connection |

---

## 6. Deployment Topology (Current)

The current setup runs everything in a single container served by Dokploy + Traefik.

```mermaid
flowchart TD
    Internet -->|HTTPS 443| Traefik
    Traefik -->|http :7600| Container

    subgraph "VPS / Dokploy host"
        Traefik[Traefik\nreverse proxy\nTLS termination]
        Container["MailService container\nNode.js :7600\n- Express API\n- React static files\n- Nodemailer pool"]
        Mongo[(MongoDB\nManaged Atlas\nor local)]
    end

    Container <-->|mongoose| Mongo
```

### Current single-node limits

| Resource | Bottleneck | Approx. limit (single 2-core/4GB VPS) |
|---|---|---|
| Concurrent HTTP requests | Node.js event loop | ~500 req/s simple; ~50 req/s with SMTP sends |
| Email throughput | Nodemailer pool + SMTP provider rate limits | Provider-dependent (SES: 14 sends/sec by default) |
| Template storage | MongoDB document size (16MB BSON) | Effectively unlimited for typical HTML |
| Log storage | MongoDB disk | Grows unbounded — add TTL index after ~90 days |
| Base64 images (avatars/logos) | MongoDB document size | Max 450,000 chars enforced (≈ 300 KB per image) |
| Auth overhead | DB lookup per request (JWT + API key) | Can cache with Redis at scale |

---

## 6. Scaling Plan — Three Phases

### Phase 1 — Production-hardened single node (0–1K orgs)

No infrastructure changes needed. Just configuration and observability.

```
[ Dokploy VPS ]
      |
   Traefik (HTTPS)
      |
   Node.js container (1 instance)
      |
   MongoDB Atlas M10+ (3-node replica set)
```

**Checklist:**

| Task | Why |
|---|---|
| Move MongoDB to Atlas M10 | Auto-backups, replica set reads, point-in-time restore |
| Set `MONGODB_ENV=prod` in Dokploy env | Ensures prod URI is used |
| Add `EmailLog` TTL index (90 days) | Prevents unbounded log growth |
| Enable Dokploy health check on `/health` | Auto-restarts dead containers |
| Set `CLIENT_URL=https://yourdomain.com` | Locks CORS to your domain |
| Store SMTP passwords in Dokploy secrets | Prevents env var leakage in UI |
| Rate limit `/v1/send` (express-rate-limit) | Already has rateLimit middleware — tune it |
| Enable MongoDB slow query logging | Catch N+1 issues early |
| Add Sentry or Axiom for error tracking | Know about crashes before users do |

**Add TTL index for logs** (run once in Atlas or mongo shell):
```js
db.emaillogs.createIndex({ "created_at": 1 }, { expireAfterSeconds: 7776000 })  // 90 days
```

---

### Phase 2 — Horizontal scaling (1K–50K orgs)

Split the single container into separate API + static-file concerns, add Redis for session caching, scale Node.js horizontally.

```mermaid
flowchart TD
    Internet -->|HTTPS 443| Traefik

    subgraph "Load balanced API tier"
        Traefik --> API1[Node.js API\ninstance 1]
        Traefik --> API2[Node.js API\ninstance 2]
        Traefik --> API3[Node.js API\ninstance N]
    end

    subgraph "Static assets"
        Traefik --> CDN[CDN / Cloudflare\nserves React build]
    end

    subgraph "Data tier"
        API1 & API2 & API3 <-->|mongoose| Mongo[(MongoDB Atlas\nM30 sharded)]
        API1 & API2 & API3 <-->|ioredis| Redis[(Redis\nAPI key cache\nrate limit state)]
    end
```

**Key changes for Phase 2:**

| Change | Impact |
|---|---|
| Add Redis API key cache (TTL 60s) | `requireApiKey` currently does a DB lookup per request — cache it |
| Add Redis JWT cache | `requireAuth` does a DB lookup per request — cache by `user._id` with 60s TTL |
| Serve React build from CDN (Cloudflare) | Offloads static files from Node.js entirely |
| MongoDB Atlas M30 with sharding on `app_id` | Scales reads/writes horizontally |
| Add `cluster` mode or PM2 | Uses all CPU cores on a single host before adding nodes |
| Separate SMTP worker queue (BullMQ + Redis) | Decouples send latency from HTTP response; enables retries |
| Session/rate-limit state moves to Redis | Required when running multiple instances (in-memory state breaks) |

**Redis caching pattern for API key lookup:**
```typescript
// requireApiKey with Redis cache
const cached = await redis.get(`apikey:${key}`);
if (cached) {
  req.emailApp = JSON.parse(cached);
  return next();
}
const app = await EmailApp.findOne({ api_key: key });
if (!app) return res.status(401).json({ error: 'Invalid API key' });
await redis.setex(`apikey:${key}`, 60, JSON.stringify(app));
req.emailApp = app;
next();
```

---

### Phase 3 — SaaS scale (50K+ orgs)

Separate services by concern. Email sending becomes an isolated worker fleet.

```mermaid
flowchart TD
    Internet --> CF[Cloudflare WAF\n+ CDN]
    CF --> LB[Load Balancer]

    LB --> API[API Service\nstateless Node.js\n× N replicas]
    LB --> UI[React SPA\nserved from CDN]

    API --> Queue[(BullMQ\nSend Queue)]
    Queue --> W1[Email Worker 1]
    Queue --> W2[Email Worker 2]
    Queue --> WN[Email Worker N]

    W1 & W2 & WN -->|per-app SMTP| SMTP[SMTP Providers\nSES / SendGrid\n/ custom]

    API <--> PG[(MongoDB Atlas\nM50 sharded)]
    API <--> RD[(Redis Cluster\ncache + queues)]

    API --> OB[Observability\nAxiom / Grafana\nSentry]
```

**Phase 3 additions:**

| Component | Purpose |
|---|---|
| BullMQ send queue | Retry failed sends, rate-limit per SMTP provider, priority queues per org tier |
| Cloudflare WAF | Block abuse, DDoS protection, bot filtering at edge |
| Separate auth service | JWT signing + verification isolated (can scale independently) |
| Org-level usage metering | Track send volume per org for billing/quota enforcement |
| Webhook delivery system | Notify customers of delivery events (bounces, opens) |
| Multi-region MongoDB | Atlas Global Clusters for <100ms reads in EU/US/APAC |

---

## 7. Security Hardening Checklist

| Control | Status | Notes |
|---|---|---|
| JWT authentication | ✅ Built-in | 7-day expiry, HS256 |
| API key scoping | ✅ Built-in | Each key → exactly one app |
| SMTP credential isolation | ✅ Built-in | Per-app, never shared |
| bcrypt password hashing | ✅ Built-in | Cost factor 10 |
| Helmet.js headers | ✅ Built-in | CSP disabled (SPA needs it tuned) |
| CORS locked to CLIENT_URL | ✅ Config | Set `CLIENT_URL` in prod env |
| Rate limiting | ✅ Partial | `rateLimit.ts` exists — tune limits |
| Request body size cap | ✅ Built-in | `10mb` JSON limit |
| Base64 image size cap | ✅ Built-in | 450,000 chars enforced server-side |
| API key never returned in GET | ✅ Built-in | LLM API key returns `api_key_set: boolean` only |
| HTTPS / TLS termination | ✅ Traefik | Auto-certs via Let's Encrypt |
| MongoDB auth | ⚠️ Configure | Atlas: use connection-string auth, no `0.0.0.0` bind |
| Secrets in env (not git) | ⚠️ Required | Use Dokploy secrets / env panel, never commit `.env.prod` |
| Org admin privilege check | ✅ Built-in | `is_org_admin` checked on org mutate routes |
| Superadmin route guard | ✅ Built-in | `requireSuperadmin` middleware |
| Log rotation / TTL | ❌ Add | Add TTL index on `EmailLog.created_at` |
| Refresh token rotation | ❌ Optional | Current 7-day JWT is acceptable for SaaS dashboard |
| Audit log | ❌ Optional | Track who changed SMTP, who deleted templates |
| SMTP password encryption at rest | ❌ Optional | Currently plaintext in MongoDB — encrypt with KMS at scale |

---

## 8. MongoDB Index & Query Reference

Indexes already present (from model definitions):

| Collection | Index | Type |
|---|---|---|
| `users` | `email` | Unique |
| `emailapps` | `api_key` | Unique |
| `emailapps` | `owner_id` | Non-unique |
| `appmembers` | `(app_id, user_id)` | Unique compound |
| `appmembers` | `user_id` | Non-unique |
| `organizations` | `slug` | Unique |

**Recommended indexes to add before production:**

```js
// Fast template lookups by app + slug
db.templates.createIndex({ app_id: 1, slug: 1 }, { unique: true })

// Log queries by app + date (paging)
db.emaillogs.createIndex({ app_id: 1, created_at: -1 })

// Log TTL — auto-delete after 90 days
db.emaillogs.createIndex({ created_at: 1 }, { expireAfterSeconds: 7776000 })

// User search by org (admin Users page)
db.users.createIndex({ org_id: 1 })

// Schema lookup by name
db.payloadschemas.createIndex({ name: 1 }, { unique: true })
```

---

## 9. Environment Variables Reference

### Required (server refuses to start without these)

| Variable | Description |
|---|---|
| `JWT_SECRET` | Long random secret — minimum 48 hex chars |
| `MONGODB_ENV` | `dev` / `staging` / `prod` — selects which URI to use |
| `MONGODB_URI_PROD` | MongoDB Atlas connection string for production |

### Recommended for production

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Set to `production` | `development` |
| `PORT` | HTTP port the server binds to | `3001` |
| `CLIENT_URL` | Your frontend domain (locks CORS) | `*` (open) |
| `SEED_ADMIN_EMAIL` | Email for the initial superadmin | `admin@example.com` |
| `SEED_ADMIN_PASSWORD` | Password for the initial superadmin | `changeme123` |

### Optional

| Variable | Description |
|---|---|
| `SMTP_HOST` | Seed script only — seeds default EmailApp SMTP |
| `SMTP_USER` | Seed script only |
| `SMTP_PASS` | Seed script only |
| `REDIS_URL` | Phase 2+ — `redis://host:6379` for caching and queues |

### Dokploy deployment env panel (minimum set)

```env
NODE_ENV=production
PORT=7600
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
MONGODB_ENV=prod
MONGODB_URI_PROD=mongodb+srv://user:pass@cluster.mongodb.net/mailservice_prod
CLIENT_URL=https://yourdomain.com
```

---

## Quick Reference — Who Can Do What

```
Superadmin (1 per deployment)
 └── Sees all orgs, all users, all apps
 └── Manages platform LLM config
 └── Auto-assigned "Mail Service" org on first register

Org Admin (many per org)
 └── Invites / removes users from the org
 └── Updates org name + logo
 └── Cannot see other orgs

App Owner (member with can_manage = true)
 └── Manages SMTP, API key, app settings
 └── Invites / removes app members
 └── Sets per-member CRUD flags

App Editor (can_write = true)
 └── Creates and edits templates
 └── Sends emails via dashboard

App Viewer (can_read only)
 └── Views templates and send logs

External API Caller (api_key only)
 └── Full CRUD on templates
 └── Sends emails
 └── Reads logs
 └── Cannot access dashboard routes
```
