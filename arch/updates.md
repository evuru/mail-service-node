# Architecture Updates

Changes made after the initial architecture document was written.

---

## Update 1 — Redis-backed Rate Limiting

**Date:** 2026-05-19  
**Files changed:**
- `server/src/middleware/rateLimit.ts` — full rewrite
- `server/src/routes/index.ts` — per-route limiter wiring
- `server/src/index.ts` — added `trust proxy: 1`
- `server/package.json` — added `ioredis`, `rate-limit-redis`, upgraded `express-rate-limit` to v8

### What changed

The original `rateLimit.ts` had two limiters backed by a single in-memory store. The rewrite introduces four tiered limiters with optional Redis backing.

#### Limiter tiers

| Limiter | Window | Max per IP | Route | Purpose |
|---|---|---|---|---|
| `authLimiter` | 15 min | 30 | `/auth/login`, `/auth/register` | Blocks brute-force / credential stuffing |
| `sendLimiter` | 1 min | 60 | `/send`, `/send/raw` | Matches SES/SendGrid default quota |
| `aiLimiter` | 1 min | 20 | `/ai/*` | LLM calls cost money — keep tight |
| `apiLimiter` | 15 min | 1 000 | Everything else | ~67 req/min sustained for dashboard users |

#### Redis is fully optional

```
REDIS_URL set?
    Yes → ioredis connects, RedisStore used (state shared across all instances)
    No  → express-rate-limit in-memory store (single instance, no config change needed)
```

If Redis goes down mid-run: `ioredis` fires an `error` event (logged as a warning), `sendCommand` throws on the next rate-limit check, `rate-limit-redis` passes the request through. **The app never crashes.**

To activate Redis in production, add one env var in Dokploy — no code change:
```
REDIS_URL=redis://your-redis-host:6379
```

#### IP tracking — Traefik / reverse proxy

```typescript
// server/src/index.ts
app.set('trust proxy', 1);
```

Without this, `req.ip` is always the Traefik container IP (127.0.0.1) and every user shares the same rate-limit bucket. With it, Express reads `X-Forwarded-For` set by Traefik and rate-limits by the real client IP.

---

## Update 2 — Org-level LLM Configuration

**Date:** 2026-05-19  
**Files changed:**
- `server/src/models/Organization.ts` — added `llm` subdocument
- `server/src/services/llmService.ts` — new shared LLM caller (extracted from `ai.ts`)
- `server/src/routes/ai.ts` — updated access guard to cascade org → platform
- `server/src/routes/orgs.ts` — added `GET/PUT/POST /orgs/me/llm` routes
- `client/src/types/index.ts` — added `OrgLlmConfig` type, extended `Organization`
- `client/src/store/orgStore.ts` — added `fetchOrgLlm`, `saveOrgLlm`, `testOrgLlm`
- `client/src/pages/SettingsPage.tsx` — added org AI config card (org admins only)
- `arch/README.md` — added Section 5 (AI / LLM Config Cascade)

### Problem solved

Previously, a single LLM API key was shared across the entire platform, configured only by the superadmin. Every org used the operator's key, meaning the operator paid for all AI usage and had no way to let orgs bring their own keys.

### New config hierarchy

```
Platform (superadmin)
    Default LLM provider + key for the whole deployment
    ↓ overridden by ↓
Org (org admin)
    Org's own provider + key — takes priority when enabled and key is set
    ↓ gated by ↓
App (app owner)
    llm_enabled toggle — can disable AI for a specific app
    ↓ gated by ↓
Member
    llm_min_role — minimum role to use AI within the app
```

### Resolution logic (per request)

```
1. User has org_id?
   └── Yes → Org.llm.enabled = true AND Org.llm.api_key set?
              └── Yes → use org config  ✓
              └── No  → fall through
2. PlatformConfig.llm.enabled = true?
   └── Yes → use platform config  ✓
   └── No  → 403 "AI not enabled"
3. EmailApp.llm_enabled = true?
   └── No  → 403 "AI not enabled for this app"
4. User role >= app.llm_min_role?
   └── No  → 403 "Insufficient role"
5. ✅ Call LLM
```

### Backward compatibility

- All existing platform-only configurations continue to work unchanged.
- Orgs without an LLM config set (`llm.enabled = false` and no `api_key`) fall through to the platform config exactly as before.
- The `llm` subdocument is added to the `Organization` model with all fields defaulting to safe values (`enabled: false`, `api_key: ''`). No migration script is needed — MongoDB adds the subdocument with defaults on the next write.

### New API routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/orgs/me/llm` | JWT + org admin | Get org LLM config (returns `api_key_set`, never raw key) |
| `PUT` | `/v1/orgs/me/llm` | JWT + org admin | Save org LLM config |
| `POST` | `/v1/orgs/me/llm/test` | JWT + org admin | Test org LLM connection (sends "Reply with: OK") |

### Security notes

- `api_key` is stored in MongoDB server-side only. `GET /orgs/me/llm` returns `api_key_set: boolean`.
- Sending `api_key: ""` in a `PUT` is ignored (empty string does not overwrite a stored key).
- Only org admins (`is_org_admin: true`) can read or write the org LLM config.

### New shared service

`callLlm` was extracted from `ai.ts` into `server/src/services/llmService.ts` so both `ai.ts` and `orgs.ts` can use it without a circular dependency. If you add a new LLM provider, edit only `llmService.ts`.
