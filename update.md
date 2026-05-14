# Change Log

---

## v3 — Organisations, CRUD Permissions & SDK Export

### Organisations

Every user now belongs to an **Organisation**. Orgs group teams together and provide a shared identity (name + logo).

**New model: `server/src/models/Organization.ts`**
- Fields: `name`, `slug`, `logo_base64`, `created_by`, timestamps
- `toSlug()` helper converts org name to a URL-safe slug

**User model additions (`server/src/models/User.ts`):**
- `org_id` — reference to the user's Organisation
- `is_org_admin` — whether the user can manage the org's members
- `profile_image_base64` — user avatar stored as base64 (max ~300 KB enforced server-side)

**New routes: `server/src/routes/orgs.ts`**

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/orgs` | Create a new organisation (assigns caller as org admin) |
| `GET` | `/v1/orgs/me` | Get the caller's organisation |
| `PUT` | `/v1/orgs/me` | Update org name / logo (org admin only) |
| `GET` | `/v1/orgs/me/members` | List org members |
| `POST` | `/v1/orgs/me/members` | Invite user to org by email (org admin only) |
| `PUT` | `/v1/orgs/me/members/:userId` | Promote/demote org member |
| `DELETE` | `/v1/orgs/me/members/:userId` | Remove member from org |
| `POST` | `/v1/orgs/join` | Join an org by `org_id` |

**Registration flow changes (`server/src/routes/auth.ts`):**
- First registered user → `superadmin` → auto-creates "Mail Service" org and is set as org admin
- `PUT /auth/me` now accepts `profile_image_base64` (450,000 char limit enforced)
- `userPayload()` helper returns org fields: `org_id`, `is_org_admin`, `profile_image_base64`

**Admin additions (`server/src/routes/admin.ts`):**
- `GET /admin/users` now supports `search` (regex on name/email), `org_id`, `role` filters, pagination (`page`/`limit`), and returns inline org name/slug on each user
- `GET /admin/orgs` — lists all orgs with member counts
- `PUT /admin/users/:id` now accepts `org_id` and `is_org_admin`

---

### CRUD Permissions (AppMember v2)

The `owner|editor|viewer` role system has been extended with **four explicit permission flags** per app member. Roles remain for display and are used as presets when inviting, but all access checks now use the flags.

**Updated model: `server/src/models/AppMember.ts`**

New fields on every membership document:
```
can_read    boolean  — view templates, logs, schemas
can_write   boolean  — create and edit templates
can_delete  boolean  — delete templates
can_manage  boolean  — SMTP, API key, member management
```

Helper functions (backwards-compatible — falls back to role derivation if flags not set):
```typescript
canRead(m)    canWrite(m)    canDelete(m)    canManage(m)
permissionsFromRole(role)  // derives all four flags from a role string
```

All `apps.ts` route guards updated to use these helpers. All responses include a `my_permissions` object alongside `my_role`.

**Existing data** is fully compatible — old `AppMember` documents without explicit flags fall back to role-derived values.

---

### SDK Export

A new **4-step code generation wizard** at `/sdk-export` that produces downloadable mail client code in 20 languages.

**New files: `client/src/generators/`**

| File | Purpose |
|---|---|
| `types.ts` | `ExportConfig`, `ExportApp`, `ExportTemplate`, `GeneratedFile`, `LanguageGenerator` interfaces |
| `utils.ts` | String converters (`toCamel`, `toPascal`, `toEnvKey`, `toSnake`, `toKebab`), `generateEnv()` |
| `index.ts` | Generator registry — `generators[]` array + `generatorMap` keyed by id |
| `typescript.ts` … `clojure.ts` | 20 language generator implementations |
| `README.md` | Architecture, types, adding a new language, npm package extraction guide |

**Languages supported:**

| Category | Languages |
|---|---|
| Full SDK (config + service + .env) | TypeScript, JavaScript, Python, PHP, Go, Ruby, Java, C#, Kotlin, Swift |
| Request examples (.env + requests) | Shell, HTTP, PowerShell, R, JSON config, C, C++, Objective-C, OCaml, Clojure |

**Key design:**
- `generate(config)` is a pure synchronous function — no async, no I/O, no React dependency
- Typed method signatures when a Payload Schema is linked to the template
- ZIP download via `jszip` (client-side, no new backend endpoint needed)
- Language icons via `react-icons/si` and `react-icons/tb`

**New dependency:** `jszip`, `react-icons`

---

### Frontend changes (v3)

| File | Change |
|---|---|
| `client/src/types/index.ts` | `User` + org fields; new `Organization` type; `AppMember` + CRUD flags; `AppPermissions` type; `EmailApp.my_permissions` |
| `client/src/store/orgStore.ts` | New — org CRUD + member management |
| `client/src/pages/RegisterPage.tsx` | 2-step: account creation → org setup (auto-skipped for superadmin) |
| `client/src/pages/OrgSetupPage.tsx` | New — standalone page for users without an org |
| `client/src/components/ProtectedRoute.tsx` | Redirects to `/org-setup` when user has no `org_id` (non-superadmin) |
| `client/src/pages/UsersPage.tsx` | Full rebuild: search, role filter, pagination, org info, inline edit modal |
| `client/src/pages/SettingsPage.tsx` | Profile avatar upload; org section (logo, name, member list, invite form) |
| `client/src/pages/AppSettingsPage.tsx` | Members tab: 4 CRUD checkboxes per member; toggled with immediate API saves |
| `client/src/components/Sidebar.tsx` | Footer shows org logo + name + user avatar |
| `client/src/App.tsx` | `/org-setup` route added |

---

## v2 — Multi-Tenant Upgrade

Single-tenant flat config → full multi-tenant SaaS with Users, Email Apps, and per-app SMTP.

---

## Architecture

```
User  (login/register, JWT session)
 └── owns/member-of → EmailApp  (SMTP config, API key)
      └── AppMember             (user_id + role: owner|editor|viewer)
      └── Template              (app_id FK — or null = global)
      └── EmailLog              (app_id FK)

SmtpProviders                   (static list, GET /v1/smtp-providers)
```

### Auth Model
- **UI users** authenticate with JWT (`Authorization: Bearer <token>`)
- **External API callers** authenticate with the app's `X-API-KEY`
- **UI template/log operations** also use `X-API-KEY` — the selected app's key from the app switcher

---

## New ENV vars required in all `.env.*` files

```env
JWT_SECRET=your-long-random-secret-here
```

Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

---

## New Server Files

| File | Purpose |
|------|---------|
| `server/src/models/User.ts` | User accounts (email, password_hash, role) |
| `server/src/models/EmailApp.ts` | Email app (SMTP config, API key, owner) |
| `server/src/models/AppMember.ts` | App membership + role per user |
| `server/src/config/smtpProviders.ts` | Static SMTP provider presets |
| `server/src/routes/auth.ts` | POST /auth/register, /auth/login, GET /auth/me, PUT /auth/me |
| `server/src/routes/apps.ts` | CRUD for EmailApps + member management |
| `server/src/routes/smtpProviders.ts` | GET /smtp-providers (public) |
| `server/src/routes/admin.ts` | Superadmin user management |
| `server/src/types/express.d.ts` | Express Request augmentation |

## Updated Server Files

| File | Change |
|------|--------|
| `server/src/models/Template.ts` | + `app_id` (null = global), + `is_global` flag |
| `server/src/models/EmailLog.ts` | + `app_id` FK |
| `server/src/config/smtp.ts` | Per-app transporter cache (no global singleton) |
| `server/src/middleware/auth.ts` | `requireApiKey` now looks up `EmailApp` from DB; new `requireAuth` (JWT); new `requireSuperadmin` |
| `server/src/services/emailService.ts` | Accepts `app: IEmailApp` — uses app SMTP config + app_name |
| `server/src/routes/templates.ts` | Scoped to `req.emailApp._id` + global templates |
| `server/src/routes/logs.ts` | Scoped to `req.emailApp._id` |
| `server/src/routes/preview.ts` | Uses `req.emailApp` for global vars |
| `server/src/routes/send.ts` | Passes `req.emailApp` to `sendEmail` |
| `server/src/routes/index.ts` | New routes registered |
| `server/src/index.ts` | SMTP verify removed (per-app now); JWT_SECRET check on boot |
| `server/src/seed.ts` | Seeds default superadmin user + default EmailApp |
| `server/package.json` | + `jsonwebtoken`, `bcryptjs` |

---

## New Client Files

| File | Purpose |
|------|---------|
| `client/src/store/authStore.ts` | Persisted JWT token + current user |
| `client/src/store/appStore.ts` | Persisted list of apps + selected app |
| `client/src/components/ProtectedRoute.tsx` | Redirect to /login if not authed |
| `client/src/components/SmtpProviderPicker.tsx` | Dropdown of known SMTP providers with auto-fill |
| `client/src/components/AppSwitcher.tsx` | Sidebar app selector + "Create App" link |
| `client/src/pages/LoginPage.tsx` | Email + password login |
| `client/src/pages/RegisterPage.tsx` | New user registration |
| `client/src/pages/AppsPage.tsx` | List + create email apps |
| `client/src/pages/AppSettingsPage.tsx` | Tabs: General, SMTP, API Key, Members |
| `client/src/pages/UsersPage.tsx` | Superadmin: list all users, change roles |

## Updated Client Files

| File | Change |
|------|--------|
| `client/src/types/index.ts` | + User, EmailApp, AppMember, SmtpProvider types |
| `client/src/api/client.ts` | Sends both `Authorization: Bearer` (JWT) and `X-API-KEY` (selected app) |
| `client/src/store/uiStore.ts` | Removed `apiKey` (now in appStore) |
| `client/src/App.tsx` | Auth routes + ProtectedRoute wrapper |
| `client/src/components/Sidebar.tsx` | AppSwitcher + user menu + logout |
| `client/src/components/Layout.tsx` | Unchanged |
| `client/src/components/Header.tsx` | Shows current user name |
| `client/src/pages/SettingsPage.tsx` | Simplified to server status + API reference only |

---

## Seed Changes

Running `npm run seed` now also:
1. Creates a default superadmin: `admin@localhost` / `Admin1234!`
2. Creates a default EmailApp (`default-app`) owned by that user — SMTP config is read from `.env` vars as a migration convenience

**Change the password immediately after first login.**

---

## Migration Notes for Existing Data

- All existing `Template` documents get `app_id: null, is_global: true` automatically (they become global templates)
- All existing `EmailLog` documents get `app_id: null`
- Run `npm run seed` to create the default user and app
- Set `API_KEY` in your app settings to match what you previously had in `.env`

---

## SMTP Provider Presets

The provider picker is available in App Settings → SMTP. Selecting a provider auto-fills host, port, and secure — you still enter your credentials.

| Provider | Host | Port | Secure |
|----------|------|------|--------|
| Hostinger | smtp.hostinger.com | 465 | ✓ |
| GoDaddy | smtpout.secureserver.net | 465 | ✓ |
| Namecheap | mail.privateemail.com | 465 | ✓ |
| Gmail | smtp.gmail.com | 587 | ✗ |
| Outlook/Hotmail | smtp.office365.com | 587 | ✗ |
| Zoho Mail | smtp.zoho.com | 465 | ✓ |
| SendGrid | smtp.sendgrid.net | 587 | ✗ |
| Mailgun | smtp.mailgun.org | 587 | ✗ |
| Amazon SES | email-smtp.us-east-1.amazonaws.com | 587 | ✗ |

---

## Permissions (v2 — role presets only)

> **Superseded by v3 CRUD flags.** The table below reflects the original role-based model. In v3 these defaults are preserved as presets when inviting a member, but individual flags can be toggled per-member after the fact.

| Action | owner | editor | viewer |
|--------|-------|--------|--------|
| View templates/logs (`can_read`) | ✓ | ✓ | ✓ |
| Create/edit templates (`can_write`) | ✓ | ✓ | ✗ |
| Delete templates (`can_delete`) | ✓ | ✗ | ✗ |
| Edit SMTP / manage members (`can_manage`) | ✓ | ✗ | ✗ |
| Regenerate API key (`can_manage`) | ✓ | ✗ | ✗ |

> Note: External API calls using the app's API key bypass role checks — roles apply to UI users only.
