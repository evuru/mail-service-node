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
10. [Admin UI Guide](#10-admin-ui-guide-for-frontend-developers)
11. [Error Reference](#11-error-reference)

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
https://mail.gamebyte.live/v1
```

---

## 2. Multi-App Pattern

Each **Email App** is an isolated workspace with its own:
- SMTP credentials
- API key (the app's identifier)
- Templates (private + access to all global templates)
- Send logs

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

All sending endpoints use an `X-API-KEY` header. The key identifies which app is making the request.

```http
X-API-KEY: your-app-api-key
Content-Type: application/json
```

Find your API key: **Dashboard → App Settings → API Key tab**.

You can regenerate the key at any time from that tab — the old key is immediately invalidated.

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

### Response

```json
// Success
{ "success": true, "messageId": "<def456@smtp.gamebyte.live>" }

// Recipient unsubscribed
{ "success": false, "error": "Recipient has unsubscribed" }
```

### Notes

- Unsubscribe check still runs — opted-out recipients are skipped.
- The send is logged as `template_slug: "_raw"` in your send logs.
- `List-Unsubscribe` header is still added if `app_url` is configured.
- Use templates instead of raw sends where possible — templates give you live preview, versioning, and AI assistance.

---

## 6. Payload Schemas

A **Payload Schema** documents what `data` fields a template expects. It is optional but recommended — it helps your team know exactly what to pass in the `data` object.

View and manage schemas: **Dashboard → Payload Schemas**.

Example schema for `gamebyte-welcome`:

```json
{
  "name": "gamebyte-welcome",
  "description": "Data for the Gamebyte welcome email",
  "fields": [
    { "key": "user_name",  "type": "string",  "required": true,  "example": "Espac",       "description": "Display name of the new user" },
    { "key": "email",      "type": "string",  "required": true,  "example": "user@gb.live", "description": "User's email address" },
    { "key": "appName",    "type": "string",  "required": false, "example": "Gamebyte",     "description": "Product name shown in the email" },
    { "key": "year",       "type": "string",  "required": false, "example": "2026",         "description": "Auto-injected — no need to pass" }
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
    "appName": "Gamebyte Esports"
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
{
  "user_name": "Espac",
  "ctaUrl": "https://app.gamebyte.live"
}

// Response
{
  "subject": "Welcome to Gamebyte, Espac!",
  "html": "<!DOCTYPE html>..."
}
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
    },
    {
      "_id": "uuid2",
      "template_slug": "_raw",
      "recipient": "admin@gamebyte.live",
      "status": "success",
      "sent_at": "2026-03-10T09:20:00.000Z"
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

// Template send
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

// Raw send
async function sendAdminAlert(to: string, subject: string, html: string) {
  const res = await fetch(`${MAIL_URL}/send/raw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': MAIL_KEY },
    body: JSON.stringify({ subject, html, recipient: to, from_name: 'Gamebyte Alerts' }),
  });
  return res.json();
}
```

### Python

```python
import os, requests

MAIL_URL = os.environ['MAIL_SERVICE_URL']   # https://mail.gamebyte.live/v1
MAIL_KEY = os.environ['MAIL_KEY_GAMEBYTE']

HEADERS = {'Content-Type': 'application/json', 'X-API-KEY': MAIL_KEY}

# Template send
def send_welcome_email(name: str, email: str):
    res = requests.post(f'{MAIL_URL}/send', json={
        'template_slug': 'gamebyte-welcome',
        'recipient': email,
        'data': {'user_name': name, 'email': email},
    }, headers=HEADERS)
    res.raise_for_status()
    return res.json()

# Raw send
def send_admin_alert(to: str, subject: str, html: str):
    res = requests.post(f'{MAIL_URL}/send/raw', json={
        'subject': subject,
        'html': html,
        'recipient': to,
        'from_name': 'Gamebyte Alerts',
    }, headers=HEADERS)
    res.raise_for_status()
    return res.json()
```

### cURL

```bash
# Template send
curl -X POST https://mail.gamebyte.live/v1/send \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: d8630c73-6ed9-41e3-a4ed-30b6f48e10d9" \
  -d '{
    "template_slug": "gamebyte-welcome",
    "recipient": "user@example.com",
    "data": { "user_name": "Espac", "email": "user@example.com" }
  }'

# Raw send
curl -X POST https://mail.gamebyte.live/v1/send/raw \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: d8630c73-6ed9-41e3-a4ed-30b6f48e10d9" \
  -d '{
    "subject": "Server alert: disk usage high",
    "html": "<p>Disk usage on prod-1 is at <strong>92%</strong>.</p>",
    "recipient": "admin@gamebyte.live",
    "from_name": "Gamebyte Ops"
  }'
```

### PHP

```php
<?php
$mailUrl = getenv('MAIL_SERVICE_URL'); // https://mail.gamebyte.live/v1
$mailKey = getenv('MAIL_KEY_GAMEBYTE');

function sendTemplateEmail(string $templateSlug, string $recipient, array $data): array {
    global $mailUrl, $mailKey;
    $ch = curl_init("$mailUrl/send");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', "X-API-KEY: $mailKey"],
        CURLOPT_POSTFIELDS => json_encode([
            'template_slug' => $templateSlug,
            'recipient' => $recipient,
            'data' => $data,
        ]),
    ]);
    $result = json_decode(curl_exec($ch), true);
    curl_close($ch);
    return $result;
}
```

---

## 10. Admin UI Guide (for Frontend Developers)

This section is for the **admin dashboard** — the web UI that your team uses to manage templates, schemas, and send logs.

### Access

Navigate to `https://mail.gamebyte.live` and log in with your account credentials.

The first registered user is automatically `superadmin`. Additional users can be invited via **App Settings → Members**.

---

### Apps

An **Email App** is a workspace scoped to one domain / product. You can have multiple.

- **Create:** Click the app switcher (top of sidebar) → **New App**
- **Switch:** Click the app switcher to change the active app. All templates, logs, and settings shown are for the selected app.
- **Configure:** Sidebar → **Settings** → App Settings

---

### Templates

**Sidebar → Templates**

| Action | How |
|---|---|
| Create template | Click **New Template** |
| Edit | Click any template name |
| Set slug | The slug is the identifier used in `/v1/send` → `template_slug` |
| Use layout | Toggle **Use layout** in template settings — wraps content in `_base_layout` |
| Preview | Click **Preview** in the editor — renders with live data |
| Test send | Click **Test Send** — sends a real email to an address you specify |
| AI Generate | Click **Generate** (if AI is enabled) — describe what you want, AI writes the HTML |
| AI Improve | Click **Improve** near the editor — describe a change, AI applies it |

**Template types:**
- **Regular template** — has subject + HTML body, references a layout
- **Layout template** (`is_layout: true`) — full HTML document with `{{{body}}}` slot; other templates inject into it
- **Global template** (`app_id: null`) — shared across all apps; created by superadmin

---

### Payload Schemas

**Sidebar → Payload Schemas**

Schemas document what `data` fields a template expects. They are optional but serve as a contract between your backend developer and the template designer.

| Action | How |
|---|---|
| Create | Click **New Schema** or **Generate with AI** |
| Edit | Click any schema name |
| Link to template | Open template editor → Settings panel → select a schema |
| AI Generate | Click **Generate with AI** → describe the email → AI proposes the schema |

Share the schema with your backend developer so they know exactly what to put in `data`.

---

### Send Logs

**Sidebar → Send Logs**

Shows every send attempt for the active app:
- Filter by `status` (success / failed / unsubscribed)
- Filter by `template_slug`
- Click any row for full details including error message on failures

Raw sends appear with `template_slug: _raw`.

---

### App Settings

**Sidebar → Settings**

| Tab | What it does |
|---|---|
| General | App name + App URL (required for unsubscribe links) |
| SMTP | SMTP host, port, credentials, from name. Use the provider picker for presets. |
| API Key | View, copy, or regenerate the API key. Regenerating immediately invalidates the old key — update your backend env vars. |
| Members | Invite team members by email, assign roles (owner / editor / viewer), remove members. |
| AI | Enable/disable AI features for this app, set minimum role required to use AI. |
| DNS Guide | Auto-generated SPF and DMARC DNS records based on your SMTP domain. |

---

### Member Roles

| Role | Permissions |
|---|---|
| `owner` | Full access — SMTP, API key, members, AI |
| `editor` | Create/edit templates and schemas, use AI (if min role ≤ editor) |
| `viewer` | Read-only — view templates, logs, schemas |

---

### Platform Settings (Superadmin only)

**Sidebar → Admin → Platform Settings**

Configure the global LLM (AI) integration:
1. Enable AI platform-wide (master switch)
2. Select LLM provider: Google Gemini, OpenAI, Anthropic, Ollama, or OpenAI-compatible
3. Enter the model name and API key
4. Click **Test connection** to verify before saving
5. Save — the API key is stored server-side, never exposed to the browser

Once enabled platform-wide, each app's AI access is controlled independently via **App Settings → AI**.

---

## 11. Error Reference

| HTTP | `error` value | Cause |
|---|---|---|
| 400 | `template_slug (string) is required` | Missing or wrong type |
| 400 | `recipient (string) is required` | Missing or wrong type |
| 400 | `Template "x" not found` | No template with that slug for this app |
| 401 | `Missing X-API-KEY header` | No API key sent |
| 401 | `Invalid API key` | Key doesn't match any app |
| 429 | _(rate limit response)_ | Too many requests — back off and retry |
| 500 | `SMTP connection failed` / SMTP error | SMTP credentials wrong or provider down |
| 500 | `Recipient has unsubscribed` | Silently skipped (not a real error) |

All errors return JSON: `{ "error": "message" }` or `{ "success": false, "error": "message" }`.
