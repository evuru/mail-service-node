# Mail Service — Integration Guide

> For backend developers integrating from a server, and frontend/admin developers using the dashboard.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Multi-App Pattern](#2-multi-app-pattern)
3. [Authentication](#3-authentication)
4. [Send via Template](#4-send-via-template)
5. [Send Raw (Custom Message)](#5-send-raw-custom-message)
6. [Payload Schemas](#6-payload-schemas)
7. [Preview a Template](#7-preview-a-template)
8. [Send Logs](#8-send-logs)
9. [Code Examples](#9-code-examples)
10. [Admin UI Guide](#10-admin-ui-guide)
11. [Organisations & Teams](#11-organisations--teams)
12. [App Permissions](#12-app-permissions)
13. [SDK Export](#13-sdk-export)
14. [Error Reference](#14-error-reference)

---

## 1. Overview

Mail Service is a **self-hosted email template engine** that your backend calls over HTTP. You never touch SMTP directly — you POST a request to Mail Service, and it renders, inlines CSS, checks unsubscribes, and delivers the email via your configured SMTP.

```
Your Backend  ──POST /v1/send──►  Mail Service  ──SMTP──►  Recipient's Inbox
                (X-API-KEY)         (renders template,
                                     retries on failure,
                                     logs every send)
```

Base URL (production):
```
https://mail.yourapp.com/v1
```

---

## 2. Multi-App Pattern

Each **Email App** is an isolated workspace with its own:
- SMTP credentials
- API key (the app's identifier)
- Templates (private + access to all global templates)
- Send logs
- Member roster with per-member CRUD permissions

To send from **multiple apps** (e.g. `gamebyte` and `acmeshop`), create a separate Email App for each in the dashboard and use the corresponding API key:

```
POST /v1/send
X-API-KEY: <gamebyte-api-key>     → sends from Gamebyte's SMTP, uses Gamebyte templates

POST /v1/send
X-API-KEY: <acmeshop-api-key>     → sends from AcmeShop's SMTP, uses AcmeShop templates
```

Your backend stores each app's API key as an environment variable:

```env
MAIL_SERVICE_URL=https://mail.gamebyte.live/v1
MAIL_KEY_GAMEBYTE=d8630c73-6ed9-41e3-a4ed-30b6f48e10d9
MAIL_KEY_ACMESHOP=f2a10c84-7be2-52f4-b5fd-41c7g59f21e0
```

---

## 3. Authentication

Mail Service uses **two separate auth mechanisms** depending on who is calling.

### API key auth — for your backend

All sending endpoints use an `X-API-KEY` header. The key identifies which Email App is making the request.

```http
X-API-KEY: your-app-api-key
Content-Type: application/json
```

Find your API key: **Dashboard → App Settings → API Key tab**.  
You can regenerate the key at any time — the old key is immediately invalidated.

### JWT auth — for dashboard users

The web UI authenticates users with a JWT (7-day expiry) obtained by logging in:

```http
POST /v1/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "yourpassword" }

→ { "token": "eyJ...", "user": { "_id": "...", "name": "...", "role": "user", "org_id": "..." } }
```

The token is sent as `Authorization: Bearer <token>` on all dashboard API calls.

### Registration flow

1. `POST /v1/auth/register` — creates the account
2. The first registered user becomes `superadmin` and is auto-assigned to the "Mail Service" organisation
3. All other users are prompted to **create or join an organisation** after registering (see [Organisations & Teams](#11-organisations--teams))

---

## 4. Send via Template

Use this when you have a pre-built template in the dashboard.

### Endpoint

```
POST /v1/send
X-API-KEY: <your-key>
```

### Request body

```json
{
  "template_slug": "gamebyte-welcome",
  "recipient": "user@example.com",
  "data": {
    "user_name": "Espac",
    "ctaUrl": "https://app.gamebyte.live/dashboard"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `template_slug` | string | Yes | The slug of the template to render. Looks up app-specific first, then global. |
| `recipient` | string | Yes | Recipient email address. |
| `data` | object | No | Key-value pairs injected into Handlebars template. |

### Response

```json
// Success
{ "success": true, "messageId": "<abc123@smtp.gamebyte.live>" }

// Recipient unsubscribed (not an error — quietly skipped and logged)
{ "success": false, "error": "Recipient has unsubscribed" }

// Template not found
{ "error": "Template \"gamebyte-welcome\" not found" }   // HTTP 400
```

### Auto-injected variables

These are always available in templates — you do not need to pass them in `data`:

| Variable | Value |
|---|---|
| `{{appName}}` | The app's name from App Settings |
| `{{year}}` | Current year, e.g. `2026` |
| `{{unsubscribeUrl}}` | HMAC-signed unsubscribe link (only if `app_url` is set) |

---

## 5. Send Raw (Custom Message)

Use this when you want to send a **one-off message** without creating a template — e.g. admin notifications, dynamic alerts, or programmatically built emails.

### Endpoint

```
POST /v1/send/raw
X-API-KEY: <your-key>
```

### Request body

```json
{
  "subject": "Your order #1042 has shipped",
  "html": "<h1>Great news!</h1><p>Your order is on its way.</p>",
  "recipient": "user@example.com",
  "from_name": "Gamebyte Orders"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `subject` | string | Yes | Email subject line. |
| `html` | string | Yes | Full HTML body. CSS is auto-inlined by Juice before sending. |
| `recipient` | string | Yes | Recipient email address. |
| `from_name` | string | No | Sender display name. Falls back to app `smtp_from_name` or `app_name`. |

---

## 6. Payload Schemas

A **Payload Schema** documents what `data` fields a template expects. It is optional but recommended — it serves as a contract between your backend developer and the template designer, and powers typed helper generation in the SDK Export.

View and manage schemas: **Dashboard → Payload Schemas**.

Example schema for `gamebyte-welcome`:

```json
{
  "name": "gamebyte-welcome",
  "description": "Data for the Gamebyte welcome email",
  "fields": [
    { "key": "user_name",  "type": "string",  "required": true,  "example": "Espac",       "description": "Display name of the new user" },
    { "key": "email",      "type": "string",  "required": true,  "example": "user@gb.live", "description": "User's email address" },
    { "key": "ctaUrl",     "type": "string",  "required": false, "example": "https://...",  "description": "Call-to-action button URL" }
  ]
}
```

When your backend calls `/v1/send`, pass the documented fields in `data`:

```json
{
  "template_slug": "gamebyte-welcome",
  "recipient": "espac@gamebyte.live",
  "data": {
    "user_name": "Espac",
    "email": "espac@gamebyte.live",
    "ctaUrl": "https://app.gamebyte.live"
  }
}
```

---

## 7. Preview a Template

Render a template without sending — useful for testing and debugging.

```
POST /v1/preview/:slug
X-API-KEY: <your-key>
```

```json
// Request body — same data object as /v1/send
{ "user_name": "Espac", "ctaUrl": "https://app.gamebyte.live" }

// Response
{ "subject": "Welcome to Gamebyte, Espac!", "html": "<!DOCTYPE html>..." }
```

---

## 8. Send Logs

Every send is logged — success, failure, or unsubscribed.

```
GET /v1/logs?page=1&limit=20&status=success
X-API-KEY: <your-key>
```

```json
{
  "logs": [
    {
      "_id": "uuid",
      "template_slug": "gamebyte-welcome",
      "recipient": "espac@gamebyte.live",
      "status": "success",
      "sent_at": "2026-03-10T09:15:00.000Z"
    }
  ],
  "total": 84,
  "page": 1,
  "pages": 5,
  "limit": 20
}
```

Query params: `page`, `limit` (max 100), `status` (success|failed|unsubscribed), `template_slug`.

---

## 9. Code Examples

### Node.js / TypeScript

```typescript
const MAIL_URL = process.env.MAIL_SERVICE_URL!;       // https://mail.gamebyte.live/v1
const MAIL_KEY = process.env.MAIL_KEY_GAMEBYTE!;

async function sendWelcomeEmail(user: { name: string; email: string }) {
  const res = await fetch(`${MAIL_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': MAIL_KEY },
    body: JSON.stringify({
      template_slug: 'gamebyte-welcome',
      recipient: user.email,
      data: { user_name: user.name, email: user.email },
    }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Mail send failed');
  return json.messageId;
}
```

### Python

```python
import os, requests

MAIL_URL = os.environ['MAIL_SERVICE_URL']
MAIL_KEY = os.environ['MAIL_KEY_GAMEBYTE']
HEADERS = {'Content-Type': 'application/json', 'X-API-KEY': MAIL_KEY}

def send_welcome_email(name: str, email: str):
    res = requests.post(f'{MAIL_URL}/send', json={
        'template_slug': 'gamebyte-welcome',
        'recipient': email,
        'data': {'user_name': name, 'email': email},
    }, headers=HEADERS)
    res.raise_for_status()
    return res.json()
```

### cURL

```bash
curl -X POST https://mail.gamebyte.live/v1/send \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: d8630c73-6ed9-41e3-a4ed-30b6f48e10d9" \
  -d '{
    "template_slug": "gamebyte-welcome",
    "recipient": "user@example.com",
    "data": { "user_name": "Espac", "email": "user@example.com" }
  }'
```

### PHP

```php
<?php
$mailUrl = getenv('MAIL_SERVICE_URL');
$mailKey = getenv('MAIL_KEY_GAMEBYTE');

function sendTemplateEmail(string $slug, string $recipient, array $data): array {
    global $mailUrl, $mailKey;
    $ch = curl_init("$mailUrl/send");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', "X-API-KEY: $mailKey"],
        CURLOPT_POSTFIELDS => json_encode(['template_slug' => $slug, 'recipient' => $recipient, 'data' => $data]),
    ]);
    $result = json_decode(curl_exec($ch), true);
    curl_close($ch);
    return $result;
}
```

> **Tip:** For other languages (Go, Ruby, Java, C#, Kotlin, Swift, and more), use the **SDK Export** page in the dashboard to generate ready-to-use client code pre-populated with your actual apps and templates. See [SDK Export](#13-sdk-export).

---

## 10. Admin UI Guide

### Access

Navigate to your Mail Service URL and log in. The first registered user is `superadmin`. All other users register and then create or join an organisation.

---

### Apps

An **Email App** is a workspace scoped to one domain / product. You can have multiple.

- **Create:** Click the app switcher (top of sidebar) → **New App**
- **Switch:** Click the app switcher to change the active app
- **Configure:** App Switcher → gear icon → App Settings

---

### Templates

**Sidebar → Templates**

| Action | How |
|---|---|
| Create template | Click **New Template** |
| Edit | Click any template name |
| Set slug | The slug is the identifier used in `/v1/send` → `template_slug` |
| Use layout | Toggle **Use layout** — wraps content in `_base_layout` |
| Preview | Click **Preview** in the editor |
| Test send | Click **Test Send** — sends a real email to a specified address |
| AI Generate | Click **Generate** (if AI enabled) — describe what you want, AI writes the HTML |
| AI Improve | Click **Improve** near the editor — describe a change, AI applies it |

**Template types:**
- **Regular template** — has subject + HTML body, references a layout
- **Layout template** (`is_layout: true`) — full HTML document with `{{{body}}}` slot
- **Global template** (`app_id: null`) — shared across all apps; created by superadmin

---

### Payload Schemas

**Sidebar → Payload Schemas**

| Action | How |
|---|---|
| Create | Click **New Schema** or **Generate with AI** |
| Edit | Click any schema name |
| Link to template | Open template editor → Settings panel → select a schema |
| AI Generate | Click **Generate with AI** → describe the email → AI proposes the schema |

---

### Send Logs

**Sidebar → Send Logs**

Shows every send attempt for the active app. Filter by status or template slug. Raw sends appear with `template_slug: _raw`.

---

### App Settings

**App Switcher → gear icon**

| Tab | What it does |
|---|---|
| General | App name + App URL (required for unsubscribe links) |
| SMTP | Host, port, credentials, from name. Use the provider picker for presets. |
| API Key | View, copy, or regenerate the API key. Regenerating immediately invalidates the old key. |
| Members | Invite team members by email, set per-member CRUD permissions, remove members. |
| AI | Enable/disable AI features for this app; set minimum role required to use AI. |
| DNS Guide | Auto-generated SPF and DMARC DNS records from your SMTP domain. |

---

### User Profile & Settings

**Sidebar → Settings**

- Upload a **profile avatar** (hover over the avatar circle to reveal the camera button)
- Change name, email, or password
- **Organisation section** (shown when you belong to an org):
  - Upload an **org logo** (org admins only)
  - Rename the organisation (org admins only)
  - View org members, promote/demote org admins, remove members
  - Invite new users to the org by email

---

### Users (Superadmin only)

**Sidebar → Admin → Users**

Full user management:
- Search by name or email
- Filter by role
- Paginated table showing user, organisation, role, and active status
- **Edit** opens a modal to change: system role, active/inactive, org admin flag, reset password
- **Delete** removes the user permanently

---

### Platform Settings (Superadmin only)

**Sidebar → Admin → Platform Settings**

Configure the global LLM (AI) integration:
1. Enable AI platform-wide (master switch)
2. Select LLM provider: Google Gemini, OpenAI, Anthropic, Ollama, or OpenAI-compatible
3. Enter model name and API key (stored server-side, never exposed to the browser)
4. Click **Test connection** to verify
5. Save — each app's AI access is then controlled via **App Settings → AI**

---

## 11. Organisations & Teams

Every user belongs to an **Organisation**. Organisations are the top-level grouping for teams — they don't affect API sending, but they govern who can be invited to which apps.

### Structure

```
Organisation  (name, slug, logo)
  └── Users (org members, some flagged as org_admin)
        └── EmailApp membership (per-app CRUD permissions)
```

### Creating an organisation

- **New users** are prompted to create an organisation on the second step of registration (or skip and create later via Settings)
- **Existing users without an org** are redirected to `/org-setup` on login
- The **first registered superadmin** is automatically placed in the "Mail Service" organisation

### Joining an organisation

Org admins invite users by email from **Settings → Organisation → Members → Invite**. The invited user must already have a Mail Service account.

Only one organisation per user. If a user already belongs to another org, the invite is rejected.

### Org admin capabilities

An org admin can:
- Rename the organisation and update its logo
- Invite users into the org (by their existing account email)
- Promote/demote other org members to org admin
- Remove members from the org

---

## 12. App Permissions

App membership gives a user access to a specific Email App. Permissions are **per-member, per-app** and expressed as four independent flags:

| Flag | What it grants |
|---|---|
| `can_read` | View templates, logs, and schemas for this app |
| `can_write` | Create and edit templates and schemas |
| `can_delete` | Delete templates |
| `can_manage` | Change SMTP settings, regenerate API key, manage the member roster |

### Default permissions by role preset

When inviting a member, you choose a **role preset** — this sets the initial flags. After adding, each flag can be toggled individually in **App Settings → Members**.

| Preset | Read | Write | Delete | Manage |
|--------|:----:|:-----:|:------:|:------:|
| `owner` | ✓ | ✓ | ✓ | ✓ |
| `editor` | ✓ | ✓ | ✗ | ✗ |
| `viewer` | ✓ | ✗ | ✗ | ✗ |

### Notes

- The **owner** of an app (the user who created it) always has all four permissions and cannot be demoted via the UI.
- Permissions apply to **dashboard (UI) users only**. External API callers using the `X-API-KEY` bypass all role checks — the key identifies the app, not a user.
- AI feature access is also controlled per-app: **App Settings → AI → Minimum role to use AI**.

---

## 13. SDK Export

**Sidebar → SDK Export**

The SDK Export wizard generates ready-to-use mail client code in 20 languages, pre-populated with your actual apps, templates, API keys, and typed method signatures.

### How it works

1. **Select a language** — choose from Full SDK generators (TypeScript, JavaScript, Python, PHP, Go, Ruby, Java, C#, Kotlin, Swift) or Request Examples (Shell, HTTP, PowerShell, R, JSON config, C, C++, Objective-C, OCaml, Clojure)
2. **Select apps & templates** — tick which apps and which templates to include
3. **Configure** — set the service URL and optional custom env var names
4. **Download** — click Download ZIP to get the generated files

### What you get

**Full SDK generators** produce three files:
- `mail.config.<ext>` — app and template map (slugs, API keys, env var names)
- `mail.service.<ext>` — a service class with per-template helper methods (typed when a Payload Schema is linked)
- `.env` — ready-to-fill environment file with your actual API key values

**Request example generators** produce:
- A file with one ready-to-run request per template
- `.env` — same format as above

### Typed helpers

When a template has a Payload Schema linked, the generated service method includes typed parameters. For example, with a schema that has `user_name (string, required)` and `email (string, optional)`:

```typescript
// TypeScript output
sendGambyteWelcome(recipient: string, data: { user_name: string; email?: string }): Promise<SendResult>

// Python output
def send_gamebyte_welcome(self, recipient: str, user_name: str, email: str = None) -> dict:

// Go output
func (s *MailService) SendGambyteWelcome(recipient string, data GambyteWelcomeData) (SendResult, error)
```

Without a schema, the `data` parameter falls back to a generic map/dict/record type.

### Future: npm package

The generator logic (`client/src/generators/`) has zero React or browser dependencies — it's pure TypeScript, string-in/string-out. It is structured to be extracted as `@mail-service/sdk-gen`. See `client/src/generators/README.md` for the extraction guide.

---

## 14. Error Reference

| HTTP | `error` value | Cause |
|---|---|---|
| 400 | `template_slug (string) is required` | Missing or wrong type |
| 400 | `recipient (string) is required` | Missing or wrong type |
| 400 | `Template "x" not found` | No template with that slug for this app |
| 400 | `name, email, and password are required` | Missing register fields |
| 400 | `Password must be at least 8 characters` | Password too short |
| 400 | `name is required` | Missing org name |
| 401 | `Missing X-API-KEY header` | No API key sent |
| 401 | `Invalid API key` | Key doesn't match any app |
| 401 | `Invalid email or password` | Login failed |
| 401 | `Invalid or expired token` | JWT missing or expired |
| 403 | `Write permission required` | Member lacks `can_write` |
| 403 | `Manage permission required` | Member lacks `can_manage` |
| 403 | `Only org admins can invite members` | Not an org admin |
| 404 | `App not found` | App doesn't exist or user isn't a member |
| 409 | `A user with this email already exists` | Duplicate registration |
| 409 | `You already belong to an organisation` | User tried to create a second org |
| 409 | `User is already a member` | Duplicate app member invite |
| 413 | `Image too large — keep it under 300 KB` | Profile/logo image too big |
| 429 | _(rate limit response)_ | Too many requests — back off and retry |
| 500 | `SMTP connection failed` | SMTP credentials wrong or provider down |

All errors return JSON: `{ "error": "message" }` or `{ "success": false, "error": "message" }`.
