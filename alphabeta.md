# Alpha / Beta Feature Roadmap
> Competitive analysis vs. [useSend](https://github.com/usesend/usesend) + planned additions

---

## Where We Stand vs. useSend

### What useSend has that we don't (yet)

| Feature | useSend | Us |
|---|---|---|
| Email open / click / bounce tracking | ✅ pixel + link tracking | ❌ |
| Domain verification (DKIM, SPF check in-app) | ✅ | ⚠️ DNS guide only |
| Scheduled / delayed sends | ✅ Schedule API | ❌ |
| Webhooks (send/open/click/bounce events) | ✅ | ❌ |
| Inbound email processing | ✅ | ❌ |
| Marketing / bulk broadcast sends | ✅ | ❌ |
| Visual drag-and-drop email editor | ✅ Tiptap + jsx-email | ❌ (code only) |
| Background job queue | ✅ Redis | ❌ (sync sends) |
| Email unsubscribe / list management | ✅ | ❌ |

### Where we are **better** than useSend

| Feature | useSend | Us |
|---|---|---|
| Multi-tenant apps with per-app SMTP | ❌ single AWS SES | ✅ any SMTP provider |
| Organisation model + member roles | ❌ | ✅ owner / editor / viewer |
| Payload schema system (typed, validated) | ❌ | ✅ JSON schema + editor |
| Template inheritance / layout system | ❌ | ✅ `_base_layout` + `is_layout` |
| AI template generation + improvement | ❌ | ✅ multi-provider LLM |
| SDK export (generated client code) | ❌ | ✅ |
| Monaco code editor for templates | ❌ basic editor | ✅ |
| Superadmin platform management | ❌ | ✅ |
| Not locked to AWS | ❌ (AWS SES only) | ✅ bring-your-own SMTP |
| SaaS plan / billing model | ❌ self-host only | ✅ |

---

## Foundational Feature (ships first)

---

### V1 · Template & Schema Versioning
**What**: Every save to a template or payload schema creates an immutable version with an author and optional commit note. The send API can target any version explicitly — just like pinning a git tag in a deployment. Active version = HEAD; historical versions are always readable and restorable.

**Why it goes first**: It de-risks every other feature on this list. A bad template edit can never kill a live integration. Multiple team members can iterate on `v2` while production keeps sending `v1`. Schema versioning means a consumer app won't break when a schema evolves. This also provides a natural audit trail per template and per schema.

**Data model — Templates:**
```
TemplateVersion {
  _id          UUID
  template_id  ref → Template
  version      Number (1, 2, 3 … auto-increment per template)
  html         String
  subject      String
  editor_json  Object (optional — visual editor state)
  author_id    ref → User
  note         String (optional commit message, e.g. "Added promo banner")
  created_at   Date
}
```
`Template` gains:
- `active_version: Number` — which version the default send uses
- `versions` is queried via `TemplateVersion.find({ template_id })`

**Data model — Payload Schemas:**
```
PayloadSchemaVersion {
  _id        UUID
  schema_id  ref → PayloadSchema
  version    Number
  fields     Array (same structure as current PayloadSchema.fields)
  author_id  ref → User
  note       String
  created_at Date
}
```
`PayloadSchema` gains `active_version: Number`.

**API additions:**
```
GET  /v1/templates/:id/versions              → list all versions (author, note, created_at)
GET  /v1/templates/:id/versions/:v           → get specific version HTML/subject
PUT  /v1/templates/:id/activate/:v           → set active version (owner/editor only)
POST /v1/templates/:id/restore/:v            → create new version cloned from :v

GET  /v1/schemas/:id/versions                → same pattern
PUT  /v1/schemas/:id/activate/:v
POST /v1/schemas/:id/restore/:v

POST /v1/send
{ template_id, version?: Number, payload }   → omit version = uses active_version
```

**UI additions:**
- `TemplateEditor` gets a **Version History** drawer (right panel) showing version list — number, author avatar, note, date, "Active" badge on current
- Each version row: **Preview** (opens EmailPreview for that version) | **Restore** (clones to new version) | **Activate** (sets as active)
- Save button becomes **Save as new version** with an optional note input (like a commit message prompt)
- Version indicator in the editor header: `v3 (active)` or `v2 (draft)` chip
- `SchemasPage` / `SchemaEditorModal` gets the same version history panel
- `LogsTable` shows which template version was used for each send

**Abstraction approach:**
- The existing `Template.html` / `Template.subject` fields become read-through to the active version
- The send route calls a `resolveTemplate(id, version?)` helper that fetches the right `TemplateVersion` — zero changes to the Handlebars/juice pipeline below it
- Old templates without versions get a `v1` auto-created on first save after the migration, so nothing breaks

**Active vs. Latest — the key invariant:**
`active_version` is the version that production sends. It is never automatically advanced. Saving a new version does not change what gets sent. A team member can work on `v5` while `v2` is still live. Promoting to active is always a deliberate, explicit action. This means:
- A save/autosave never silently breaks a live integration
- Drafts can be iterated on safely in parallel with production traffic
- Rolling back is just re-activating an older version — no data is ever deleted

**Version resolution at send time:**
```
version param in /v1/send?  → use that exact TemplateVersion (pinned)
no version param?           → use Template.active_version  (always set, never null)
```

**Invariants enforced by the API:**
- Every template always has an `active_version` — on first create, `v1` is auto-activated
- You cannot delete an active version; you must activate another first
- Restoring a version creates a new version (non-destructive); it does not overwrite history

**Non-breaking migration**: On deploy, a one-time script iterates existing templates and creates a `TemplateVersion v1` from their current `html`/`subject`, setting `active_version = 1`. Existing API consumers sending without a `version` param continue working identically.

**TestSendModal — version switching & inline edit:**
The TestSendModal already surfaces the attached payload schema. With versioning in place it becomes a lightweight version control surface too:

*Version switcher:*
- A version selector dropdown appears next to the template name: `Sending v3 (active) ▾`
- Dropdown lists all versions with author, note, date — user can pick any version to test-send
- Selecting a non-active version shows a clear amber notice: `"You are test-sending v2, not the active version (v3). This send will not affect production."`
- The selected version is sent as `version: N` in the test-send payload; it does not change `active_version`

*Schema version switcher:*
- Similarly, the payload schema panel shows `Schema: Order Confirmation v2 (active) ▾`
- Switching schema version re-renders the payload fields for that version's field definitions
- Amber notice if testing against a non-active schema version

*Inline edit — compound split modal:*
Rather than navigating away to the full editor, clicking "Edit" on a schema version opens a **second large modal** (layered on top of the TestSendModal, ~90vw × 90vh) with a two-pane layout:

```
┌──────────────────────────────────────────────────────────────────┐
│  Edit Schema — "Order Confirmation"  v2 → will save as v3   [X]  │
├───────────────────────────────┬──────────────────────────────────┤
│  Schema fields editor         │  Template live preview           │
│  (same fields UI as           │  Renders the template HTML with  │
│   SchemaEditorModal)          │  example values from the fields  │
│                               │  — updates on every field change │
│  field / type / req / example │                                  │
│  ────────────────────────     │   [live EmailPreview component]  │
│  name     string ✓  Jane      │                                  │
│  order_id string ✓  #1234     │                                  │
│  total    number ✓  99.00     │                                  │
│  + Add field                  │                                  │
├───────────────────────────────┴──────────────────────────────────┤
│  ⚠ Editing v2 — saving will create v3 (v2 stays unchanged)       │
│  [ Version note… ]            [Cancel]  [Save as new version →]  │
└──────────────────────────────────────────────────────────────────┘
```

**How it works:**
- Left pane: the existing `SchemaEditorModal` field editor, extracted into a reusable `<SchemaFieldsEditor>` component
- Right pane: `<EmailPreview>` re-renders live as fields change, using the field `example` values as the Handlebars payload
- The amber footer banner always shows which version is being based on and what the new version number will be
- "Version note" input (optional): short commit message, e.g. "Added discount_code field"
- **Save creates a new `PayloadSchemaVersion`** — never mutates the existing version
- Option to "Activate immediately" checkbox at save: if checked, new version becomes active on save; if unchecked, it's a draft
- Unsaved changes + close attempt → `ConfirmModal`: "Discard changes?"

**For template editing from TestSendModal:**
The same pattern applies — clicking "Edit template version" opens an equivalent split modal:
- Left pane: Monaco code editor (or Visual editor toggle) with the version's HTML
- Right pane: Live `<EmailPreview>` of the current editor content
- Saving creates a new `TemplateVersion` with optional note + optional immediate activation

**Why this is better than navigating away:**
- User stays in the test-send context — no page navigation, no lost state
- Tight feedback loop: schema field changes immediately reflect in the template preview
- The split view makes it obvious whether a schema change breaks the template layout
- Saving as a new version (never overwriting) is enforced by the modal UI — there is no "overwrite" button

*UX guardrails summary:*
```
Test-sending a non-active version       →  amber banner (informational, not blocking)
Activating a version from TestSendModal →  NOT allowed directly — only via the split edit modal's checkbox
Editing schema/template from modal      →  opens compound split modal, saves as new version
Closing split modal with unsaved edits  →  ConfirmModal: "Discard changes?"
```

---

## Alpha Features
> Experimental — shipped behind an "Alpha" badge, not enabled by default.
> May be unstable. User opts in knowing it's unfinished.

---

### A1 · Visual Email Editor
**What**: A rich, block-based email editor alongside the existing Monaco code editor.
Users can switch between "Visual" and "Code" tabs per template.

**Stack** (mirrors useSend's approach):
- **Tiptap** v2 — editor core + extensions (headings, image, link, task list, text-align, color)
- **jsx-email** — renders Tiptap JSON → production-ready HTML (React Email components under the hood)
- **tiptap-extension-global-drag-handle** — drag-to-reorder blocks
- **react-colorful** — inline colour picker for text/background
- Inspired by [maily.to](https://github.com/arikchakma/maily.to) editor patterns

**Scope**:
- New `VisualEditor` component next to the existing Monaco editor in `TemplateEditor`
- Tab toggle: `Visual | Code` — switching serialises/deserialises between Tiptap JSON and HTML
- Block types: text, heading, image, button, divider, spacer, two-column layout
- Toolbar: bold, italic, underline, link, align, colour, variable insertion (`{{variable}}`)
- Output: renders to same HTML pipeline (juice inliner + Handlebars)
- Stored as `editor_json` field on Template (parallel to existing `html` field)

**Alpha caveats**: complex layouts may not round-trip perfectly between Visual ↔ Code; Handlebars variable injection inside Tiptap is limited.

---

### A2 · Scheduled Sends
**What**: Send a template at a future datetime via the API or UI.

**API addition**:
```
POST /v1/send
{ ..., "send_at": "2026-06-01T09:00:00Z" }
```

**Scope**:
- New `ScheduledEmail` model: `to`, `template_id`, `payload`, `send_at`, `status` (pending/sent/failed)
- A polling worker (setInterval or node-cron) picks up pending jobs past their `send_at`
- UI: TestSendModal gets an optional "Schedule for later" datetime picker
- Cancellation: `DELETE /v1/scheduled/:id`

**Alpha caveats**: no persistent queue (node-cron only); restarts will delay pending sends. Redis queue upgrade is the beta path.

---

### A3 · Email Open & Click Tracking
**What**: Know when a recipient opens an email or clicks a link.

**Mechanism**:
- On send, inject a 1×1 transparent tracking pixel `<img src="/v1/track/open/:log_id">` into the HTML
- Wrap all `<a href>` links with `/v1/track/click/:log_id?url=<encoded>`
- Tracking routes update `EmailLog` with `opened_at`, `clicked_at`, `click_url`

**UI addition**:
- LogsTable gains open/click status columns with icons
- Template stats card on Dashboard shows open rate + click rate per template

**Alpha caveats**: pixel tracking is blocked by many email clients; click-wrapping changes the visible URL. Users must opt-in per app. Privacy implications noted in UI.

---

## Beta Features
> More stable than Alpha — usable in production for tolerant workloads.
> Enabled by default but clearly labelled "Beta" in the UI.

---

### B1 · Webhooks
**What**: Send event callbacks to a user-configured URL when email events occur (sent, failed, opened, clicked, bounced).

**Model addition** to `EmailApp`:
```
webhooks: [{
  url: string,
  events: ('sent' | 'failed' | 'opened' | 'clicked' | 'bounced')[],
  secret: string   // HMAC-SHA256 signature header
}]
```

**Scope**:
- New "Webhooks" tab in AppSettingsPage
- After each tracked event, fire `POST webhook.url` with signed payload
- Delivery log (last 20 attempts, status, response code) shown in the tab
- Retry with exponential back-off (3 attempts)

---

### B2 · Domain Verification (in-app DNS check)
**What**: Instead of just showing the DNS records to copy, actually verify them.

We already have the DNS Guide tab. Extend it to:
- `GET /v1/apps/:id/dns-check` — resolves TXT/MX records for the SMTP `from` domain
- Returns `{ spf: ok|fail|missing, dkim: ok|fail|missing, dmarc: ok|fail|missing }`
- UI: "Verify DNS" button in the DNS Guide tab shows live green/red status per record
- Re-check on demand; cache result for 10 min

---

### B3 · Bulk / Broadcast Sends
**What**: Send one template to a list of recipients (CSV upload or manually entered addresses).

**API**:
```
POST /v1/broadcast
{
  template_id, 
  recipients: [{ to, payload }],   // up to 500 per call
  send_at?: string                  // optional scheduling (needs A2)
}
```

**UI**: New "Broadcasts" section under the app's nav — upload CSV, map columns to template variables, preview first 3 renders, confirm send.

**Scope guards**: rate-limit per app; respect unsubscribe list (see B4).

---

### B4 · Unsubscribe & Suppression List
**What**: A per-app list of addresses that should never receive emails.

- `POST /v1/apps/:id/suppressions` — add address(es)
- `GET /v1/apps/:id/suppressions` — list + CSV export
- Auto-add on bounce (when tracking detects hard bounce)
- One-click unsubscribe link helper: `{{unsubscribe_url}}` variable injected if suppression is enabled
- UI: "Suppressions" tab in AppSettingsPage

---

### B5 · Template Analytics Dashboard
**What**: Per-template performance over time (relies on A3 tracking data).

- New chart panel in TemplateEditor sidebar: sends / opens / clicks over last 30 days
- Dashboard aggregate cards: total sent, avg open rate, avg click rate across all templates
- CSV export of log data per template

---

## Implementation Priority Order

```
Phase 0 (Foundational — ships before anything else)
  V1 Template & Schema Versioning   — non-breaking, de-risks all future work

Phase 1 (Alpha)
  A2 Scheduled Sends      — low complexity, benefits immediately from V1 (send version X at time Y)
  A3 Open/Click Tracking  — moderate complexity, very visible improvement
  A1 Visual Email Editor  — high complexity, ships as opt-in Alpha tab; versions stored in V1

Phase 2 (Beta)
  B1 Webhooks             — moderate, unlocks integrations ecosystem
  B2 Domain Verification  — low complexity, polishes existing DNS guide
  B4 Suppression List     — required before B3

Phase 3 (Beta)
  B3 Bulk Broadcasts      — depends on B4 (suppression); can target specific template version
  B5 Template Analytics   — depends on A3 (tracking data); broken down by version
```

---

## Visual Editor — Technical Quickstart Notes

When implementing A1, use the following as the dependency baseline (matching useSend's working version):

```json
"@tiptap/core": "^2.11.7",
"@tiptap/react": "^2.11.7",
"@tiptap/starter-kit": "^2.11.7",
"@tiptap/extension-image": "^2.11.7",
"@tiptap/extension-link": "^2.11.7",
"@tiptap/extension-color": "^2.11.7",
"@tiptap/extension-text-style": "^2.11.7",
"@tiptap/extension-text-align": "^2.11.7",
"@tiptap/extension-placeholder": "^2.11.7",
"@tiptap/extension-underline": "^2.11.7",
"jsx-email": "^2.8.4",
"tiptap-extension-global-drag-handle": "^0.1.18",
"react-colorful": "^5.6.1"
```

Key files to create:
- `client/src/components/VisualEditor/editor.tsx` — Tiptap `<EditorContent>` wrapper
- `client/src/components/VisualEditor/renderer.tsx` — jsx-email → HTML pipeline
- `client/src/components/VisualEditor/extensions/` — custom Handlebars variable node
- `client/src/components/VisualEditor/nodes/` — Button, Divider, Spacer, Columns block types
- `client/src/components/VisualEditor/menus/` — floating toolbar + bubble menu

The `TemplateEditor` page gains a `editorMode: 'visual' | 'code'` state toggle. In `visual` mode, the Monaco editor is replaced by `<VisualEditor>`. On save, `editor.tsx` calls `renderer.tsx` to produce the HTML stored in the database — the rest of the send pipeline is untouched.
