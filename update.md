# Multi-Tenant Upgrade — Change Log

## What Changed

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

## Permissions

| Action | owner | editor | viewer |
|--------|-------|--------|--------|
| View templates/logs | ✓ | ✓ | ✓ |
| Create/edit/delete templates | ✓ | ✓ | ✗ |
| Send test emails | ✓ | ✓ | ✗ |
| View app settings | ✓ | ✓ | ✗ |
| Edit SMTP / name | ✓ | ✗ | ✗ |
| Manage members | ✓ | ✗ | ✗ |
| Delete app | ✓ | ✗ | ✗ |
| Regenerate API key | ✓ | ✗ | ✗ |

> Note: External API calls using the app's API key bypass role checks — roles apply to UI users only.
