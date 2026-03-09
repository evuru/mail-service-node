# AI / LLM Integration

This document covers the architecture, configuration, and usage of the AI features in Mail Service Node.

---

## Architecture Overview

AI is configured **once at the platform level** by a superadmin and is available everywhere in the frontend. Individual apps can enable or disable AI access and control which member roles can use it.

```
PlatformConfig (MongoDB singleton)
  └── llm: { provider, api_key, base_url, model, enabled }

EmailApp
  └── llm_enabled: boolean          ← app owner toggles
  └── llm_min_role: owner|editor|viewer  ← who in the app can use AI

Access check (server-side, every AI route):
  platform.llm.enabled && app.llm_enabled && member.role >= app.llm_min_role
```

---

## Supported LLM Providers

| Provider | Credential needed | Notes |
|---|---|---|
| `gemini` | Google AI Studio API key (`AIza...`) | Default model: `gemini-2.0-flash` |
| `openai` | OpenAI API key (`sk-...`) | Default model: `gpt-4o` |
| `anthropic` | Anthropic API key (`sk-ant-...`) | Default model: `claude-sonnet-4-6` |
| `ollama` | Base URL only (e.g. `http://localhost:11434`) | Default model: `llama3.2` |
| `openai-compatible` | Base URL + API key | Works with Groq, Together, LM Studio, etc. |

---

## DB Changes

### New model: `PlatformConfig` (singleton)
File: `server/src/models/PlatformConfig.ts`

```typescript
{
  llm: {
    provider: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'openai-compatible';
    api_key: string;      // never returned to client — masked as '••••••••'
    base_url: string;     // required for ollama and openai-compatible
    model: string;        // free text — user picks the model name
    enabled: boolean;     // master switch — off = no AI anywhere in the platform
  }
}
```

### Modified: `EmailApp`
Two new fields added to `server/src/models/EmailApp.ts`:

```typescript
llm_enabled: boolean;              // this app can use AI (default: false)
llm_min_role: 'owner' | 'editor' | 'viewer';  // minimum role to use AI (default: 'editor')
```

---

## Server Routes

### Platform config (superadmin only)
```
GET  /v1/admin/platform        → returns config with api_key masked
PUT  /v1/admin/platform        → upserts config; only updates api_key if non-empty string sent
```

### AI generation (JWT auth + app API key + role check)
```
POST /v1/ai/generate    body: { template_slug?, prompt, type: 'template'|'subject' }
                        → { html } or { subject }

POST /v1/ai/improve     body: { html, instruction }
                        → { html }

POST /v1/ai/schema      body: { description }  (JWT only, no app key needed)
                        → { name, description, fields: [...] }
```

---

## Security

- `api_key` is stored as-is in MongoDB (no external encryption library required — MongoDB at-rest encryption or disk encryption covers this at the infra level).
- The `api_key` field is **never** returned to the client. GET /v1/admin/platform returns `api_key_set: boolean` and a masked preview `••••` only.
- All AI calls are proxied through the backend — the browser never sees the key.
- The `/v1/ai/*` routes require both a valid JWT (to identify the user and their role) and a valid `X-API-KEY` (to identify the app and check `llm_enabled` / `llm_min_role`).
- `/v1/ai/schema` only requires JWT (schemas are not app-scoped).

---

## Frontend Features

### Platform Settings page (superadmin)
Route: `/platform-settings`
Sidebar: Admin section → "Platform Settings"

Sections:
- **AI / LLM tab**: provider dropdown, model input, API key field (write-only, shows masked on load), base URL field (ollama/openai-compatible only), master enable toggle, "Test connection" button.

### App Settings → AI tab
Added to the existing `AppSettingsPage` tab bar.

Controls:
- Enable AI for this app (toggle)
- Minimum member role required to use AI (dropdown: Owner / Editor / Viewer)

### Template Editor AI panel
- **"Generate" button** in the toolbar → opens a right side panel
  - Textarea: describe the email
  - Type selector: Full template / Subject line only
  - "Generate" → streams result into Monaco editor
- **"Improve" button** → appears when text is selected in Monaco
  - Instruction input: "make it more formal", "add a CTA button", etc.
  - "Apply" → replaces selected text with improved version

### Schemas page — Generate from description
- **"Generate with AI"** button next to "New Schema"
- Modal: describe the data your email will use
- Returns a suggested schema (name, description, fields array) pre-filled into the schema editor

---

## Implementation Status

- [x] aiIntegration.md created
- [x] PlatformConfig model
- [x] EmailApp — llm_enabled + llm_min_role fields
- [x] GET/PUT /v1/admin/platform route
- [x] POST /v1/ai/generate, /v1/ai/improve, /v1/ai/schema routes
- [x] Routes registered in server index
- [x] Client types updated (LlmProvider, PlatformLlmConfig, EmailApp)
- [x] platformStore (Zustand, no persist)
- [x] Platform Settings page
- [x] Platform Settings route in App.tsx + Sidebar nav
- [x] App Settings → AI tab
- [x] Template Editor AI panel (Generate + Improve)
- [x] Schemas page → Generate with AI button

---

## Environment / Dependencies

No new npm packages required for Gemini or OpenAI-compatible calls — uses native `fetch`.
For Anthropic SDK specifically, the route uses `fetch` to the Messages API directly.

Ollama requires the Ollama server to be running and accessible from the Node.js server (not the browser).

---

## Adding a New Provider

1. Add the provider ID to the `LlmProvider` union type in both `PlatformConfig.ts` (server) and `types/index.ts` (client).
2. Add a `case` block in `server/src/routes/ai.ts` `callLlm()` function.
3. Add a row to the provider dropdown in `PlatformSettingsPage.tsx`.
