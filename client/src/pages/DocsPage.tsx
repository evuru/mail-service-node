import { Link } from 'react-router-dom';
import { ArrowRight, Copy, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { PublicPage, PageHero } from '../components/PublicLayout';

export function DocsPage() {
  return (
    <PublicPage>
      <PageHero
        badge="Documentation"
        title={<>API Reference &<br /><span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Integration Guide</span></>}
        subtitle="Everything you need to integrate MailService into your application. Authentication, sending, templates, organisations, permissions, and more."
      />
      <DocsBody />
    </PublicPage>
  );
}

// ─── Docs body ────────────────────────────────────────────────────────────────

function DocsBody() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[240px_1fr] gap-12">
        <Sidebar />
        <main className="min-w-0 space-y-20">
          <AuthSection />
          <OrgsSection />
          <MultiAppSection />
          <PermissionsSection />
          <SendSection />
          <SendRawSection />
          <SenderAliasesSection />
          <TemplateVarsSection />
          <TemplatesApiSection />
          <VersioningSection />
          <LogsApiSection />
          <SdkExportSection />
          <UnsubscribeSection />
          <EnvSection />
        </main>
      </div>
    </section>
  );
}

function Sidebar() {
  const sections = [
    { id: 'authentication',    label: 'Authentication' },
    { id: 'organisations',     label: 'Organisations' },
    { id: 'multi-app',         label: 'Multi-App Setup' },
    { id: 'permissions',       label: 'App Permissions' },
    { id: 'send',              label: 'Send via Template' },
    { id: 'send-raw',          label: 'Send Raw (Custom)' },
    { id: 'sender-aliases',    label: 'Sender Aliases' },
    { id: 'template-variables',label: 'Template Variables' },
    { id: 'templates-api',     label: 'Templates API' },
    { id: 'versioning',        label: 'Versioning' },
    { id: 'logs',              label: 'Send Logs' },
    { id: 'sdk-export',        label: 'SDK Export' },
    { id: 'unsubscribe',       label: 'Unsubscribe System' },
    { id: 'environment',       label: 'Environment Variables' },
  ];

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-1">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 px-3">Contents</div>
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`}
            className="block px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors font-medium">
            {s.label}
          </a>
        ))}
        <div className="pt-6 px-3">
          <Link to="/how-it-works"
            className="group inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
            How it works
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-black text-slate-900 mb-6 pb-3 border-b border-slate-100">{title}</h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-bold text-slate-900 mt-8">{children}</h3>;
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-600 leading-relaxed">{children}</p>;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[12px] font-mono">{children}</code>;
}

function CodeBlock({ label, code }: { label?: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
      {label && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
          <span className="text-[10px] font-mono text-slate-400">{label}</span>
          <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
            {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      <pre className="p-4 text-[12px] leading-6 font-mono text-slate-300 overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

function Collapsible({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-semibold text-slate-700"
      >
        {label}
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="border-t border-slate-200">{children}</div>}
    </div>
  );
}

function PropTable({ rows }: { rows: { name: string; type: string; required?: boolean; desc: string }[] }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
      <div className="grid grid-cols-[1fr_80px_60px_2fr] bg-slate-50 border-b border-slate-200 px-4 py-2">
        {['Field', 'Type', 'Req.', 'Description'].map((h) => (
          <span key={h} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</span>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.name} className="grid grid-cols-[1fr_80px_60px_2fr] px-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
          <code className="text-[12px] font-mono text-indigo-700">{r.name}</code>
          <code className="text-[12px] font-mono text-slate-500">{r.type}</code>
          <span>{r.required ? <span className="text-[10px] font-bold text-red-500">Yes</span> : <span className="text-[10px] text-slate-400">No</span>}</span>
          <span className="text-[12px] text-slate-600">{r.desc}</span>
        </div>
      ))}
    </div>
  );
}

function RouteTable({ rows }: { rows: { method: string; path: string; desc: string }[] }) {
  const methodColor = (m: string) =>
    m === 'GET' ? 'bg-green-100 text-green-700' :
    m === 'POST' ? 'bg-blue-100 text-blue-700' :
    m === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
    'bg-red-100 text-red-700';

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
      <div className="grid grid-cols-[80px_1fr_2fr] bg-slate-50 border-b border-slate-200 px-4 py-2">
        {['Method', 'Path', 'Description'].map((h) => (
          <span key={h} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</span>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.path} className="grid grid-cols-[80px_1fr_2fr] px-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors items-center gap-2">
          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono w-fit ${methodColor(r.method)}`}>{r.method}</span>
          <code className="text-[12px] font-mono text-indigo-700">{r.path}</code>
          <span className="text-[12px] text-slate-600">{r.desc}</span>
        </div>
      ))}
    </div>
  );
}

function InfoBox({ children, color = 'indigo' }: { children: React.ReactNode; color?: 'indigo' | 'amber' | 'emerald' }) {
  const cls = {
    indigo:  'bg-indigo-50 border-indigo-200 text-indigo-800',
    amber:   'bg-amber-50 border-amber-200 text-amber-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  }[color];
  return (
    <div className={`flex items-start gap-3 border rounded-xl p-4 text-sm ${cls}`}>
      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-60" />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function AuthSection() {
  return (
    <DocSection id="authentication" title="Authentication">
      <Para>
        MailService uses <strong>two separate auth mechanisms</strong>: <InlineCode>JWT tokens</InlineCode> for
        dashboard users managing apps and templates, and <InlineCode>X-API-KEY</InlineCode> headers for your
        backend sending emails. External servers only ever need the API key — no JWT required.
      </Para>

      <H3>Register</H3>
      <Para>
        The first user to register becomes <InlineCode>superadmin</InlineCode> and is placed in the "Mail Service" organisation automatically.
        All subsequent users register normally and are then prompted to create or join an organisation.
      </Para>
      <CodeBlock label="POST /v1/auth/register" code={`{
  "name": "Your Name",
  "email": "you@example.com",
  "password": "your-password"    // min 8 characters
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",   // JWT — valid 7 days
  "user": {
    "_id": "uuid",
    "name": "Your Name",
    "email": "you@example.com",
    "role": "user",               // "superadmin" for the first user
    "org_id": null,               // null until user creates/joins an org
    "is_org_admin": false,
    "is_active": true,
    "profile_image_base64": ""
  }
}`} />

      <H3>Login</H3>
      <CodeBlock label="POST /v1/auth/login" code={`{
  "email": "you@example.com",
  "password": "your-password"
}

// Response — same shape as /register
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "_id": "...", "role": "user", "org_id": "org-uuid", ... }
}`} />

      <H3>Update your profile</H3>
      <Para>
        All fields are optional — only send what you want to change. Returns a fresh token reflecting the updated user.
        Upload a profile avatar by passing a base64-encoded image string (max ~300 KB).
      </Para>
      <CodeBlock label="PUT /v1/auth/me  (Authorization: Bearer <token>)" code={`{
  "name": "New Name",
  "email": "new@example.com",
  "password": "new-password",                          // optional
  "profile_image_base64": "data:image/jpeg;base64,..."  // optional, max ~300 KB
}

// Response — { token, user } same as login`} />

      <H3>Using your API key</H3>
      <Para>
        Find your app's API key in <strong>App Settings → API Key</strong>. Pass it as a header on every
        send / template / log request. JWT is not needed for these routes.
      </Para>
      <CodeBlock label="All sending endpoints" code={`X-API-KEY: your-app-api-key-here
Content-Type: application/json`} />

      <InfoBox>
        The JWT is stored in <InlineCode>localStorage</InlineCode> by the dashboard. Your backend should store API keys
        in environment variables — never hardcode them in source code.
      </InfoBox>
    </DocSection>
  );
}

function OrgsSection() {
  return (
    <DocSection id="organisations" title="Organisations">
      <Para>
        Every user belongs to an <strong>Organisation</strong>. Orgs provide a shared identity — name, slug, and logo.
        They don't change how emails are sent, but they govern who can be invited to collaborate on Email Apps.
      </Para>

      <H3>Structure</H3>
      <CodeBlock code={`Organisation  (name, slug, logo_base64)
  └── Users  (org members — some flagged as is_org_admin)
        └── EmailApp memberships  (per-app CRUD permissions)`} />

      <H3>Creating an organisation</H3>
      <CodeBlock label="POST /v1/orgs  (Authorization: Bearer)" code={`{ "name": "Acme Inc." }

// Response
{
  "_id": "org-uuid",
  "name": "Acme Inc.",
  "slug": "acme-inc",         // auto-derived, unique
  "created_by": "user-uuid",
  "created_at": "2026-05-14T10:00:00.000Z"
}`} />
      <Para>The caller is automatically made org admin. A user can only belong to one organisation at a time.</Para>

      <H3>Inviting members</H3>
      <Para>
        The invited user must already have an account. Send them the registration link first, then invite by email.
      </Para>
      <CodeBlock label="POST /v1/orgs/me/members  (org admin only)" code={`{
  "email": "teammate@example.com",
  "is_org_admin": false        // optional — default false
}

// Response
{
  "_id": "user-uuid",
  "name": "Teammate",
  "email": "teammate@example.com",
  "is_org_admin": false
}`} />

      <H3>All org routes</H3>
      <RouteTable rows={[
        { method: 'GET',    path: '/v1/orgs/me',                  desc: 'Get your organisation' },
        { method: 'PUT',    path: '/v1/orgs/me',                  desc: 'Update name or logo (org admin). logo_base64 ≤ 300 KB.' },
        { method: 'GET',    path: '/v1/orgs/me/members',          desc: 'List org members' },
        { method: 'POST',   path: '/v1/orgs/me/members',          desc: 'Invite user by email (org admin)' },
        { method: 'PUT',    path: '/v1/orgs/me/members/:userId',  desc: 'Promote / demote org admin' },
        { method: 'DELETE', path: '/v1/orgs/me/members/:userId',  desc: 'Remove member from org' },
        { method: 'POST',   path: '/v1/orgs/join',                desc: 'Join an org by org_id (self-service)' },
      ]} />

      <InfoBox>All org routes require <InlineCode>Authorization: Bearer &lt;token&gt;</InlineCode>. Invite, update, and remove actions additionally require the caller to be an org admin.</InfoBox>
    </DocSection>
  );
}

function MultiAppSection() {
  return (
    <DocSection id="multi-app" title="Multi-App Setup">
      <Para>
        Each <InlineCode>Email App</InlineCode> is a fully isolated workspace — its own SMTP credentials, API key, templates, and logs.
        Create one per product, domain, or sending identity. Your backend stores each key as an environment variable
        and picks the right one per call.
      </Para>

      <H3>Creating apps</H3>
      <Para>
        Dashboard → app switcher at the top of the sidebar → <strong>New App</strong>.
        Configure SMTP under <strong>App Settings → SMTP</strong>. Copy the API key from <strong>App Settings → API Key</strong>.
      </Para>

      <H3>Backend setup</H3>
      <CodeBlock label=".env" code={`MAIL_SERVICE_URL=https://mail.yourdomain.com/v1
MAIL_KEY_NOTIFICATIONS=d8630c73-6ed9-41e3-a4ed-30b6f48e10d9
MAIL_KEY_BILLING=f2a10c84-7be2-52f4-b5fd-41c7g59f21e0`} />

      <CodeBlock label="Node.js" code={`const MAIL = process.env.MAIL_SERVICE_URL;

// Notification email — Notifications app SMTP + templates
await fetch(\`\${MAIL}/send\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-API-KEY': process.env.MAIL_KEY_NOTIFICATIONS },
  body: JSON.stringify({
    template_slug: 'welcome-email',
    recipient: user.email,
    data: { name: user.name, ctaUrl: 'https://app.acme.com/start' },
  }),
});

// Invoice email — Billing app SMTP + templates
await fetch(\`\${MAIL}/send\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-API-KEY': process.env.MAIL_KEY_BILLING },
  body: JSON.stringify({
    template_slug: 'invoice-ready',
    recipient: user.email,
    data: { invoiceId: '1042', amount: '$49.00' },
  }),
});`} />

      <InfoBox>
        Templates are scoped per app. <strong>Global templates</strong> (created by superadmin with <InlineCode>app_id: null</InlineCode>) are
        visible to all apps. App-specific templates are private to that app. When a slug exists in both, the
        app-specific version wins.
      </InfoBox>
    </DocSection>
  );
}

function PermissionsSection() {
  return (
    <DocSection id="permissions" title="App Permissions">
      <Para>
        App membership gives a dashboard user access to a specific Email App. Permissions use four independent boolean
        flags per member. These can be toggled individually in <strong>App Settings → Members</strong> after the initial role preset is applied.
      </Para>

      <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
        <div className="grid grid-cols-[120px_2fr] bg-slate-50 border-b border-slate-200 px-4 py-2">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Flag</span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">What it grants</span>
        </div>
        {[
          { flag: 'can_read',   desc: 'View templates, logs, and payload schemas for this app' },
          { flag: 'can_write',  desc: 'Create and edit templates and payload schemas' },
          { flag: 'can_delete', desc: 'Delete templates' },
          { flag: 'can_manage', desc: 'Edit SMTP settings, regenerate API key, manage the member roster' },
        ].map((r) => (
          <div key={r.flag} className="grid grid-cols-[120px_2fr] px-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
            <code className="text-[12px] font-mono text-indigo-700">{r.flag}</code>
            <span className="text-[12px] text-slate-600">{r.desc}</span>
          </div>
        ))}
      </div>

      <H3>Role presets</H3>
      <Para>
        When inviting a member you choose a preset that sets the initial flag values. Individual flags can be adjusted afterwards.
      </Para>

      <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
        <div className="grid grid-cols-[100px_1fr_1fr_1fr_1fr] bg-slate-50 border-b border-slate-200 px-4 py-2">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Preset</span>
          {['Read', 'Write', 'Delete', 'Manage'].map((h) => (
            <span key={h} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">{h}</span>
          ))}
        </div>
        {[
          { role: 'owner',  color: 'bg-blue-100 text-blue-700',   flags: [true, true, true, true]   },
          { role: 'editor', color: 'bg-green-100 text-green-700', flags: [true, true, false, false] },
          { role: 'viewer', color: 'bg-slate-100 text-slate-600', flags: [true, false, false, false] },
        ].map((r) => (
          <div key={r.role} className="grid grid-cols-[100px_1fr_1fr_1fr_1fr] px-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors items-center">
            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold w-fit ${r.color}`}>{r.role}</span>
            {r.flags.map((f, i) => (
              <div key={i} className="text-center">
                {f ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">—</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <H3>Responses include permissions</H3>
      <Para>Every app list and app detail response includes <InlineCode>my_permissions</InlineCode> for the current user.</Para>
      <CodeBlock label="GET /v1/apps  response excerpt" code={`{
  "_id": "app-uuid",
  "app_name": "Notify",
  "my_role": "editor",
  "my_permissions": {
    "can_read":   true,
    "can_write":  true,
    "can_delete": false,
    "can_manage": false
  }
}`} />

      <InfoBox>
        Permissions apply to <strong>dashboard users only</strong>. External API callers using <InlineCode>X-API-KEY</InlineCode>{' '}
        bypass all role checks — the key identifies the app, not a user.
      </InfoBox>
    </DocSection>
  );
}

function SendSection() {
  return (
    <DocSection id="send" title="Send via Template">
      <Para>
        Renders a pre-built Handlebars template with your data, checks for unsubscribes, inlines CSS with Juice,
        and delivers via your app's SMTP. Retries up to 3 times with exponential backoff on transient SMTP errors.
      </Para>

      <CodeBlock label="POST /v1/send  (X-API-KEY required)" code={`{
  "template_slug": "welcome-email",
  "recipient": "user@example.com",
  "data": {
    "name": "Alex",
    "company": "Acme Corp",
    "ctaUrl": "https://app.acme.com/start"
  }
}`} />

      <PropTable rows={[
        { name: 'template_slug', type: 'string', required: true,  desc: 'Slug of the template to render. App-specific wins over global if both exist with the same slug.' },
        { name: 'recipient',     type: 'string', required: true,  desc: 'Recipient email address.' },
        { name: 'data',          type: 'object', required: false, desc: 'Key-value pairs injected into the Handlebars template. Auto-injected vars (appName, year, unsubscribeUrl) are added on top.' },
        { name: 'version',       type: 'number', required: false, desc: 'Pin a specific template version number. Omit to use the active version (default). Useful for A/B tests, canary rollouts, or rollbacks.' },
      ]} />

      <H3>Response</H3>
      <CodeBlock code={`// Success
{ "success": true, "messageId": "<abc123@smtp.acme.com>" }

// Unsubscribed — recipient opted out (not an error, send is skipped and logged)
{ "success": false, "error": "Recipient has unsubscribed" }

// Template not found
{ "error": "Template \"welcome-email\" not found" }   // HTTP 400

// SMTP failure after retries
{ "error": "SMTP connection failed" }                  // HTTP 500`} />
    </DocSection>
  );
}

function SendRawSection() {
  return (
    <DocSection id="send-raw" title="Send Raw (Custom Message)">
      <Para>
        Send a one-off email without a pre-built template — supply the subject and HTML directly.
        Useful for dynamic alerts, admin notifications, or programmatically generated content.
        Unsubscribe checks, CSS inlining, and retries still apply.
      </Para>

      <CodeBlock label="POST /v1/send/raw  (X-API-KEY required)" code={`{
  "subject": "Your order #1042 has shipped",
  "html": "<h1>Great news!</h1><p>Your order is on its way. <a href='https://track.acme.com/1042'>Track it here</a>.</p>",
  "recipient": "user@example.com",
  "from_name": "Acme Orders"   // optional — falls back to smtp_from_name or app_name
}`} />

      <PropTable rows={[
        { name: 'subject',   type: 'string', required: true,  desc: 'Email subject line.' },
        { name: 'html',      type: 'string', required: true,  desc: 'Full HTML body. <style> blocks are auto-inlined by Juice before sending.' },
        { name: 'recipient', type: 'string', required: true,  desc: 'Recipient email address.' },
        { name: 'from_name', type: 'string', required: false, desc: 'Sender display name. Falls back to app smtp_from_name, then app_name.' },
      ]} />

      <InfoBox>
        Raw sends are logged with <InlineCode>template_slug: "_raw"</InlineCode> so they appear in your Send Logs
        dashboard. Use templates where possible — they give you live preview, AI assistance, and consistent branding.
      </InfoBox>
    </DocSection>
  );
}

function SenderAliasesSection() {
  return (
    <DocSection id="sender-aliases" title="Sender Aliases">
      <Para>
        Sender aliases let a single Email App send from multiple <InlineCode>From:</InlineCode> addresses —
        without creating separate apps. Every alias must be verified before it can be used, which confirms you
        control that address.
      </Para>

      <H3>Two levels of sender identity</H3>
      <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
        <div className="grid grid-cols-[160px_1fr_1fr] bg-slate-50 border-b border-slate-200 px-4 py-2">
          {['Level', 'Where set', 'Used when'].map((h) => (
            <span key={h} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</span>
          ))}
        </div>
        {[
          {
            level: 'Default sender',
            where: 'App Settings → SMTP → "From Email (alias)". Falls back to SMTP user if blank.',
            when:  'No alias specified in the send call. This is your app\'s baseline From: address.',
          },
          {
            level: 'Named alias',
            where: 'App Settings → Aliases tab. Add a name, email, and display name; verify ownership.',
            when:  'You pass "alias": "<name>" in a send call.',
          },
        ].map((r) => (
          <div key={r.level} className="grid grid-cols-[160px_1fr_1fr] px-4 py-3 border-b border-slate-100 last:border-0 items-start gap-2">
            <code className="text-[12px] font-mono text-indigo-700 font-semibold">{r.level}</code>
            <span className="text-[12px] text-slate-600 leading-relaxed">{r.where}</span>
            <span className="text-[12px] text-slate-600 leading-relaxed">{r.when}</span>
          </div>
        ))}
      </div>

      <H3>Priority chain</H3>
      <Para>When resolving the From: address for a send, the system checks in this order:</Para>
      <CodeBlock code={`1. Inline override  — "from_email" in the request body
2. Named alias      — "alias": "billing" in the request body (must be verified)
3. App default      — smtp_from_email set in App Settings → SMTP
4. SMTP user        — the SMTP authentication username (always present)`} />

      <H3>Setting the default sender (during app setup)</H3>
      <Para>
        In <strong>App Settings → SMTP</strong>, fill in <strong>From Email (alias)</strong> alongside the SMTP
        credentials. This becomes the <InlineCode>From:</InlineCode> address for every send from this app that
        doesn't specify an alias. Your SMTP provider must have this address verified or authorised.
      </Para>
      <CodeBlock label="App SMTP config" code={`smtp_host:       smtp.sendgrid.net
smtp_user:       apikey               // the SMTP auth credential (never exposed in From:)
smtp_from_name:  Acme
smtp_from_email: noreply@acme.com     // all sends use this as From: by default`} />

      <H3>Adding named aliases</H3>
      <Para>
        Go to <strong>App Settings → Aliases</strong>. Each alias has three fields:
      </Para>
      <PropTable rows={[
        { name: 'name',       type: 'string', required: true,  desc: 'A lowercase slug used in send calls (e.g. "billing", "support"). Only a–z, 0–9, hyphens, underscores.' },
        { name: 'from_email', type: 'string', required: true,  desc: 'The email address that will appear in the From: header. Must be verified.' },
        { name: 'from_name',  type: 'string', required: false, desc: 'Display name shown in email clients (e.g. "Billing Team"). Falls back to app smtp_from_name.' },
      ]} />

      <H3>Verification flow</H3>
      <Para>
        When you add an alias, a verification email is sent <strong>to the alias address itself</strong>.
        Whoever controls that inbox clicks the link to confirm ownership. Until verified, the alias
        cannot be used — sends that reference an unverified alias return <InlineCode>HTTP 400</InlineCode>.
      </Para>
      <div className="flex flex-col gap-2">
        {[
          { step: '1', text: 'Add alias in App Settings → Aliases tab.' },
          { step: '2', text: 'Verification email arrives at the alias address.' },
          { step: '3', text: 'Click "Verify alias" — status flips to Verified.' },
          { step: '4', text: 'Pass "alias": "<name>" in any send call.' },
        ].map(({ step, text }) => (
          <div key={step} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{step}</div>
            <span className="text-sm text-slate-600 pt-0.5">{text}</span>
          </div>
        ))}
      </div>

      <H3>Using an alias in a send call</H3>
      <Para>
        Pass the alias <InlineCode>name</InlineCode> as the <InlineCode>alias</InlineCode> field in either
        the template send or raw send endpoint. Both support it.
      </Para>
      <CodeBlock label="POST /v1/send  — template send with alias" code={`{
  "template_slug": "invoice-ready",
  "recipient":     "customer@example.com",
  "alias":         "billing",           // sends from billing@acme.com
  "data": { "amount": "$49.00", "invoiceId": "1042" }
}`} />
      <CodeBlock label="POST /v1/send/raw  — raw send with alias" code={`{
  "subject":   "Your support ticket #884 has been updated",
  "html":      "<p>Hi! We updated your ticket.</p>",
  "recipient": "customer@example.com",
  "alias":     "support"               // sends from support@acme.com
}`} />

      <H3>Alias management endpoints</H3>
      <RouteTable rows={[
        { method: 'GET',    path: '/v1/apps/:id/aliases',              desc: 'List all aliases for an app. Token is never returned.' },
        { method: 'POST',   path: '/v1/apps/:id/aliases',              desc: 'Create an alias and send verification email to from_email.' },
        { method: 'DELETE', path: '/v1/apps/:id/aliases/:name',        desc: 'Delete an alias.' },
        { method: 'POST',   path: '/v1/apps/:id/aliases/:name/resend', desc: 'Resend the verification email (refreshes the 24 h token).' },
        { method: 'GET',    path: '/v1/verify-alias?token=',           desc: 'Public — clicked from the verification email; redirects to App Settings on success.' },
      ]} />

      <H3>Alias in send logs</H3>
      <Para>
        Every log entry records which alias was used. When querying logs, look for the{' '}
        <InlineCode>alias_name</InlineCode> field — <InlineCode>null</InlineCode> means the default sender was used.
      </Para>
      <CodeBlock label="GET /v1/logs — response excerpt" code={`{
  "_id":           "log-uuid",
  "template_slug": "invoice-ready",
  "recipient":     "customer@example.com",
  "alias_name":    "billing",    // null when default sender was used
  "status":        "success",
  "sent_at":       "2026-07-08T10:30:00.000Z"
}`} />

      <InfoBox color="amber">
        Whether an alias address actually works depends on your SMTP provider. Providers like SendGrid, Mailgun,
        Postmark, and AWS SES require the sender address or domain to be verified in their dashboard before they
        will deliver mail from it. The alias verification in MailService proves you control the inbox — SMTP-level
        sender authorisation is configured separately in your provider.
      </InfoBox>
    </DocSection>
  );
}

function TemplateVarsSection() {
  return (
    <DocSection id="template-variables" title="Template Variables">
      <Para>
        These variables are automatically injected into every template render. You do not need to include them in your <InlineCode>data</InlineCode> payload.
      </Para>

      <PropTable rows={[
        { name: '{{appName}}',       type: 'string', desc: 'The app\'s display name from App Settings → General.' },
        { name: '{{year}}',          type: 'string', desc: 'Current 4-digit year — e.g. "2026". Useful in copyright footers.' },
        { name: '{{unsubscribeUrl}}',type: 'string', desc: 'HMAC-signed unsubscribe link. Only present when app_url or SERVER_URL env var is set. Guard with {{#if unsubscribeUrl}}.' },
      ]} />

      <H3>Unsubscribe footer (recommended)</H3>
      <CodeBlock label="Handlebars snippet" code={`{{#if unsubscribeUrl}}
<p style="font-size: 11px; color: #999; text-align: center; margin-top: 32px;">
  Don't want these emails?
  <a href="{{unsubscribeUrl}}" style="color: #999; text-decoration: underline;">Unsubscribe</a>
</p>
{{/if}}`} />

      <H3>Layout inheritance</H3>
      <Para>
        Create a layout template (slug: <InlineCode>_base_layout</InlineCode>, <InlineCode>is_layout: true</InlineCode>).
        Any template with <InlineCode>use_layout: true</InlineCode> will have its <InlineCode>body_html</InlineCode>{' '}
        injected into the <InlineCode>{'{{{body}}}'}</InlineCode> slot. Use triple braces to render unescaped HTML.
      </Para>
      <CodeBlock label="_base_layout — skeleton" code={`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, sans-serif; background: #f4f4f5; margin: 0; }
    .card { background: white; border-radius: 8px; padding: 40px; max-width: 560px; margin: 40px auto; }
    .footer { font-size: 11px; color: #aaa; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    {{{body}}}
    {{#if unsubscribeUrl}}
    <div class="footer">
      <a href="{{unsubscribeUrl}}" style="color:#aaa;">Unsubscribe</a>
    </div>
    {{/if}}
  </div>
</body>
</html>`} />
    </DocSection>
  );
}

function TemplatesApiSection() {
  return (
    <DocSection id="templates-api" title="Templates API">
      <Para>All template and preview endpoints require <InlineCode>X-API-KEY</InlineCode>. Responses include both app-specific and global templates.</Para>

      <RouteTable rows={[
        { method: 'GET',    path: '/v1/templates',                      desc: 'List all templates visible to this app (own + global)' },
        { method: 'POST',   path: '/v1/templates',                      desc: 'Create a new template (auto-creates v1)' },
        { method: 'GET',    path: '/v1/templates/:slug',                desc: 'Get a single template by slug' },
        { method: 'PUT',    path: '/v1/templates/:slug',                desc: 'Save a new version (active version unchanged by default)' },
        { method: 'DELETE', path: '/v1/templates/:slug',                desc: 'Delete a template and all its versions' },
        { method: 'GET',    path: '/v1/templates/:slug/versions',       desc: 'List all versions with author, note, and created_at' },
        { method: 'GET',    path: '/v1/templates/:slug/versions/:v',    desc: 'Get the full HTML/subject of a specific version' },
        { method: 'PUT',    path: '/v1/templates/:slug/activate/:v',    desc: 'Set active version (what production sends)' },
        { method: 'POST',   path: '/v1/templates/:slug/restore/:v',     desc: 'Clone a version as a new version (non-destructive rollback)' },
        { method: 'POST',   path: '/v1/preview/:slug',                  desc: 'Render a template without sending (pass version to preview a specific version)' },
        { method: 'POST',   path: '/v1/preview/raw',                    desc: 'Render arbitrary HTML + Handlebars' },
      ]} />

      <H3>Preview a template</H3>
      <Para>Renders template + layout with the given data. Useful for testing before going live.</Para>
      <CodeBlock label="POST /v1/preview/:slug" code={`// Body — the same data object you'd pass to /v1/send
{ "name": "Alex", "ctaUrl": "https://app.acme.com" }

// Response
{
  "subject": "Welcome, Alex!",
  "html": "<!DOCTYPE html><html>..."
}`} />

      <H3>Create / update a template</H3>
      <CodeBlock label="POST /v1/templates" code={`{
  "slug": "order-shipped",
  "name": "Order Shipped",
  "subject": "Your order #{{orderId}} has shipped!",
  "body_html": "<h1>Hi {{name}},</h1><p>Your order is on its way.</p>",
  "use_layout": true,
  "payload_schema_id": "schema-uuid"   // optional — links a Payload Schema
}`} />
    </DocSection>
  );
}

function VersioningSection() {
  return (
    <DocSection id="versioning" title="Template & Schema Versioning">
      <Para>
        Every save to a template or payload schema creates an immutable version with an optional commit note and author.
        The <InlineCode>active_version</InlineCode> determines what production sends — it is <strong>never automatically advanced</strong>.
        You must explicitly activate a version. This means a save or autosave can never silently break a live integration.
      </Para>

      <InfoBox color="indigo">
        <strong>Key invariant:</strong> saving a new version does not change what gets sent.
        Drafts can be iterated on in parallel with production traffic. Rollbacks are instant — just re-activate an older version.
      </InfoBox>

      <H3>Version resolution at send time</H3>
      <CodeBlock code={`// No version param → uses Template.active_version (the "production" version)
POST /v1/send
{ "template_slug": "welcome-email", "recipient": "user@example.com", "data": { ... } }

// Pinned version → sends exactly that version regardless of which is active
POST /v1/send
{ "template_slug": "welcome-email", "recipient": "user@example.com", "data": { ... }, "version": 2 }`} />

      <H3>Template version endpoints</H3>
      <RouteTable rows={[
        { method: 'GET',  path: '/v1/templates/:slug/versions',     desc: 'List all versions. Returns active_version + array of { version, note, author_id, created_at }.' },
        { method: 'GET',  path: '/v1/templates/:slug/versions/:v',  desc: 'Full content (html, subject) of a specific version.' },
        { method: 'PUT',  path: '/v1/templates/:slug/activate/:v',  desc: 'Set active_version to :v. This is what future sends will use.' },
        { method: 'POST', path: '/v1/templates/:slug/restore/:v',   desc: 'Clone version :v as a new version. Non-destructive rollback.' },
      ]} />

      <H3>Schema version endpoints</H3>
      <RouteTable rows={[
        { method: 'GET',  path: '/v1/payload-schemas/:id/versions',     desc: 'List all schema versions.' },
        { method: 'GET',  path: '/v1/payload-schemas/:id/versions/:v',  desc: 'Full fields array of a specific schema version.' },
        { method: 'PUT',  path: '/v1/payload-schemas/:id/activate/:v',  desc: 'Set active schema version.' },
        { method: 'POST', path: '/v1/payload-schemas/:id/restore/:v',   desc: 'Clone a schema version as a new version.' },
      ]} />

      <H3>Saving a new template version</H3>
      <Para>
        The standard <InlineCode>PUT /v1/templates/:slug</InlineCode> creates a version on every call when <InlineCode>body_html</InlineCode> or <InlineCode>subject</InlineCode> is provided.
        Pass <InlineCode>note</InlineCode> to attach a commit message. Pass <InlineCode>activate: true</InlineCode> to immediately promote the new version to active.
      </Para>
      <CodeBlock label="PUT /v1/templates/welcome-email  (X-API-KEY required)" code={`{
  "body_html": "<h1>New HTML content</h1>...",
  "subject":   "Welcome, {{name}}!",
  "note":      "Updated headline copy for March campaign",
  "activate":  false    // default — active_version stays unchanged
}`} />

      <H3>Activating a version (UI workflow)</H3>
      <CodeBlock label="PUT /v1/templates/welcome-email/activate/3  (X-API-KEY required)" code={`// No body required
// Response
{ "message": "Version 3 is now active", "active_version": 3 }`} />

      <H3>Restoring an older version</H3>
      <Para>
        Restore clones an older version as a new version number (never overwrites history). After restoring, you can review and then activate.
      </Para>
      <CodeBlock label="POST /v1/templates/welcome-email/restore/1" code={`{ "note": "Rolling back to v1 — v2 had a rendering bug" }

// Response
{ "message": "Restored v1 as v4", "version": { ... } }`} />

      <H3>Non-breaking migration</H3>
      <Para>
        Existing templates created before versioning was introduced are automatically assigned
        <InlineCode>active_version = 1</InlineCode> when first saved via the editor.
        API consumers sending without a <InlineCode>version</InlineCode> param continue working identically — they always get the active version.
      </Para>

      <H3>SDK usage with versions</H3>
      <CodeBlock label="TypeScript SDK (generated)" code={`// Sends the currently active version (production default)
await MailService.sendWelcomeEmail('user@example.com', { name: 'Alex' });

// Pins version 2 — useful for canary tests or explicit rollback
await MailService.sendWelcomeEmail('user@example.com', { name: 'Alex' }, 2);

// Generic send with version
await MailService.send('welcomeEmail', 'user@example.com', { name: 'Alex' }, 2);`} />
    </DocSection>
  );
}

function LogsApiSection() {
  return (
    <DocSection id="logs" title="Send Logs">
      <Para>
        Every send attempt is logged — success, failure, or unsubscribed. Logs are scoped to the authenticated app.
      </Para>

      <CodeBlock label="GET /v1/logs  (X-API-KEY required)" code={`// Query params: page, limit (max 100), status, template_slug
GET /v1/logs?page=1&limit=20&status=failed&template_slug=welcome-email

{
  "logs": [
    {
      "_id": "log-uuid",
      "template_slug": "welcome-email",
      "recipient": "alex@example.com",
      "status": "success",           // "success" | "failed" | "unsubscribed"
      "error_message": null,         // populated on "failed"
      "sent_at": "2026-05-14T10:30:00.000Z"
    },
    {
      "_id": "log-uuid2",
      "template_slug": "_raw",       // raw sends appear here too
      "recipient": "ops@example.com",
      "status": "success",
      "sent_at": "2026-05-14T11:00:00.000Z"
    }
  ],
  "total": 142,
  "page": 1,
  "pages": 8,
  "limit": 20
}`} />

      <PropTable rows={[
        { name: 'page',          type: 'number', desc: 'Page number (default: 1).' },
        { name: 'limit',         type: 'number', desc: 'Results per page (default: 20, max: 100).' },
        { name: 'status',        type: 'string', desc: 'Filter: success | failed | unsubscribed.' },
        { name: 'template_slug', type: 'string', desc: 'Filter by a specific template slug.' },
      ]} />
    </DocSection>
  );
}

// ─── SDK Export ───────────────────────────────────────────────────────────────

function SdkExportSection() {
  return (
    <DocSection id="sdk-export" title="SDK Export">
      <Para>
        The <strong>SDK Export</strong> wizard (<strong>Sidebar → SDK Export</strong>) generates complete, ready-to-drop-in
        mail client code pre-populated with your actual apps, API keys, template slugs, and typed method
        signatures derived from your Payload Schemas. You download a ZIP — no manual copy-pasting.
      </Para>

      <H3>The four steps</H3>
      <div className="space-y-3">
        {[
          {
            n: '1',
            title: 'Choose a language',
            body: 'Pick TypeScript, Python, Go, PHP, Ruby, Java, C#, Kotlin, Swift, or JavaScript for a Full SDK (config + service + .env). Or choose Shell, HTTP, PowerShell, R, C, C++, Objective-C, OCaml, or Clojure for a set of ready-to-run request examples.',
          },
          {
            n: '2',
            title: 'Select apps & templates',
            body: 'Tick which Email Apps and which templates to include. Each app header is a toggle-all shortcut. Only selected items appear in the generated files.',
          },
          {
            n: '3',
            title: 'Configure',
            body: 'Set the service base URL (e.g. https://mail.yourapp.com) and optionally rename the env var (default: MAIL_SERVICE_URL). The URL and each app\'s API key are written directly into the .env file.',
          },
          {
            n: '4',
            title: 'Download ZIP',
            body: 'Click Download — JSZip assembles the archive client-side and triggers an instant browser download. No data leaves your browser except to the Mail Service API to fetch your app/template data.',
          },
        ].map(({ n, title, body }) => (
          <div key={n} className="flex gap-4 items-start">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{n}</div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{title}</div>
              <div className="text-sm text-slate-500 mt-0.5">{body}</div>
            </div>
          </div>
        ))}
      </div>

      <H3>Full SDK output — TypeScript example</H3>
      <Para>
        A Full SDK export produces three files. Here's what they look like for a "Notify" app
        with a <em>Welcome Email</em> template that has a Payload Schema, and an <em>Order Confirmation</em> without one.
      </Para>

      <Collapsible label="mail.config.ts">
        <CodeBlock code={`/**
 * mail.config.ts — generated by Mail Service SDK Export
 * Edit to add apps / templates; run the generator again to regenerate.
 */

// ─── Apps ────────────────────────────────────────────────────────────────────

export const MAIL_APPS = {
  notify: {
    fromEmail: 'hello@notify.acme.com',
    keyEnv:    'MAIL_KEY_NOTIFY',
  },

  billing: {
    fromEmail: 'billing@acme.com',
    keyEnv:    'MAIL_KEY_BILLING',
  },
} as const;

export type MailAppName = keyof typeof MAIL_APPS;

// ─── Templates ───────────────────────────────────────────────────────────────

export const MAIL_TEMPLATES = {
  welcomeEmail: {
    /**
     * Payload:
     *   user_name  — Display name of the new user
     *   email      — User's email address
     *   ctaUrl     — Call-to-action URL (optional)
     */
    app:  'notify' as MailAppName,
    slug: 'welcome-email',
  },

  orderConfirmation: {
    app:  'billing' as MailAppName,
    slug: 'order-confirmation',
  },
} as const;

export type MailTemplateName = keyof typeof MAIL_TEMPLATES;`} />
      </Collapsible>

      <Collapsible label="mail.service.ts">
        <CodeBlock code={`import { MAIL_APPS, MAIL_TEMPLATES, MailAppName, MailTemplateName } from './mail.config';

const SERVICE_URL = (process.env.MAIL_SERVICE_URL || '').replace(/\/$/, '');

function getKey(app: MailAppName): string {
  return process.env[MAIL_APPS[app].keyEnv] || '';
}

function headers(app: MailAppName) {
  return { 'Content-Type': 'application/json', 'X-API-KEY': getKey(app) };
}

function isReady(app: MailAppName): boolean {
  return !!(SERVICE_URL && getKey(app));
}

async function post(app: MailAppName, path: string, body: object) {
  if (!isReady(app)) {
    console.warn(\`[Mail] App "\${app}" not configured\`);
    return { success: false, error: 'Not configured' };
  }
  try {
    const res = await fetch(\`\${SERVICE_URL}\${path}\`, {
      method: 'POST', headers: headers(app), body: JSON.stringify(body),
    });
    return res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(\`[Mail][\${app}] \${msg}\`);
    return { success: false, error: msg };
  }
}

export class MailService {
  // Generic send. Pass version to pin a specific template version; omit for the active version.
  static send(template: MailTemplateName, recipient: string, data: Record<string, unknown> = {}, version?: number) {
    const t = MAIL_TEMPLATES[template];
    return post(t.app, '/v1/send', { template_slug: t.slug, recipient, data, ...(version !== undefined ? { version } : {}) });
  }

  static sendRaw(app: MailAppName, params: { subject: string; html: string; recipient: string; fromName?: string }) {
    return post(app, '/v1/send/raw', { subject: params.subject, html: params.html, recipient: params.recipient, from_name: params.fromName });
  }

  // ── Typed helpers (generated from Payload Schemas) ───────────────────────

  // welcomeEmail has a schema → fully typed data parameter
  static sendWelcomeEmail(recipient: string, data: {
    user_name: string;
    email: string;
    ctaUrl?: string;
  }, version?: number) {
    return this.send('welcomeEmail', recipient, data, version);
  }

  // orderConfirmation has no schema → generic data parameter
  static sendOrderConfirmation(recipient: string, data: Record<string, unknown> = {}, version?: number) {
    return this.send('orderConfirmation', recipient, data, version);
  }
}`} />
      </Collapsible>

      <Collapsible label=".env">
        <CodeBlock code={`MAIL_SERVICE_URL=https://mail.acme.com
MAIL_KEY_NOTIFY=d8630c73-6ed9-41e3-a4ed-30b6f48e10d9
MAIL_KEY_BILLING=f2a10c84-7be2-52f4-b5fd-41c7g59f21e0`} />
      </Collapsible>

      <H3>Using the generated service in your app</H3>
      <CodeBlock label="Node.js / TypeScript usage" code={`import { MailService } from './mail.service';

// Typed helper — TypeScript will error if you forget user_name or pass a wrong type
await MailService.sendWelcomeEmail('alex@example.com', {
  user_name: 'Alex',
  email:     'alex@example.com',
  ctaUrl:    'https://app.acme.com/dashboard',
});

// Generic helper
await MailService.sendOrderConfirmation('alex@example.com', {
  order_id: '1042',
  total:    '$49.00',
  items:    ['Pro Plan × 1'],
});

// Raw send from the notify app
await MailService.sendRaw('notify', {
  subject:  'Server alert: disk at 92%',
  html:     '<p>Disk on <strong>prod-1</strong> is at 92%.</p>',
  recipient:'ops@acme.com',
  fromName: 'Acme Ops',
});`} />

      <H3>Full SDK output — Python example</H3>
      <Collapsible label="mail_service.py">
        <CodeBlock code={`# mail_service.py — generated by Mail Service SDK Export
import os, json, urllib.request
from mail_config import MAIL_APPS, MAIL_TEMPLATES


class MailService:
    def __init__(self):
        self.service_url = os.environ.get('MAIL_SERVICE_URL', '').rstrip('/')

    def _get_key(self, app: str) -> str:
        return os.environ.get(MAIL_APPS[app]['key_env'], '')

    def _headers(self, app: str) -> dict:
        return {'Content-Type': 'application/json', 'X-API-KEY': self._get_key(app)}

    def _post(self, app: str, path: str, body: dict) -> dict:
        if not (self.service_url and self._get_key(app)):
            return {'success': False, 'error': 'Not configured'}
        data = json.dumps(body).encode('utf-8')
        req = urllib.request.Request(
            f'{self.service_url}{path}', data=data,
            headers=self._headers(app), method='POST',
        )
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())

    def send(self, template: str, recipient: str, data: dict = None) -> dict:
        t = MAIL_TEMPLATES[template]
        return self._post(t['app'], '/v1/send', {
            'template_slug': t['slug'], 'recipient': recipient, 'data': data or {},
        })

    # ── Typed helpers ────────────────────────────────────────────────────────

    # Schema: user_name (str), email (str), ctaUrl (str, optional)
    def send_welcome_email(self, recipient: str, user_name: str, email: str, ctaUrl: str = None) -> dict:
        return self.send('welcomeEmail', recipient, {'user_name': user_name, 'email': email, 'ctaUrl': ctaUrl})

    def send_order_confirmation(self, recipient: str, data: dict = None) -> dict:
        return self.send('orderConfirmation', recipient, data or {})


mail = MailService()

# Usage:
# mail.send_welcome_email('alex@example.com', user_name='Alex', email='alex@example.com')
# mail.send_order_confirmation('alex@example.com', {'order_id': '1042', 'total': '$49.00'})`} />
      </Collapsible>

      <H3>Request example output — Shell (curl)</H3>
      <Para>
        Request-example generators don't produce a service class. Instead you get a single file with one <InlineCode>curl</InlineCode> call
        (or equivalent) per selected template, all pre-filled with real slugs, env var references, and example data from your schema.
      </Para>
      <Collapsible label="mail_requests.sh">
        <CodeBlock code={`#!/usr/bin/env bash
# mail_requests.sh — generated by Mail Service SDK Export
# Load your .env before running: source .env

SERVICE_URL="\${MAIL_SERVICE_URL}"

# ── Notify ────────────────────────────────────────────────────────
MAIL_KEY_NOTIFY="\${MAIL_KEY_NOTIFY}"

# Send: Welcome Email
# Payload fields:
#   user_name: "Espac"
#   email: "user@example.com"
#   ctaUrl: "https://app.acme.com" (optional)
curl -s -X POST "$SERVICE_URL/v1/send" \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: $MAIL_KEY_NOTIFY" \\
  -d '{"template_slug": "welcome-email", "recipient": "user@example.com", "data": {"user_name": "Espac", "email": "user@example.com", "ctaUrl": "https://app.acme.com"}}'

# ── Billing ───────────────────────────────────────────────────────
MAIL_KEY_BILLING="\${MAIL_KEY_BILLING}"

# Send: Order Confirmation
# Payload fields:
#   (no schema defined)
curl -s -X POST "$SERVICE_URL/v1/send" \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: $MAIL_KEY_BILLING" \\
  -d '{"template_slug": "order-confirmation", "recipient": "user@example.com", "data": {}}'`} />
      </Collapsible>

      <H3>Typed helpers — with vs without a Payload Schema</H3>
      <Para>
        When a template has a Payload Schema linked, the generated helper has explicit typed parameters instead of
        a generic <InlineCode>data</InlineCode> map. Link schemas in <strong>Payload Schemas</strong> →
        open a schema → edit, or in the <strong>Template Editor</strong> → Settings panel → Schema.
      </Para>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2">Without a schema</div>
          <CodeBlock code={`// TypeScript
static sendInvoiceReady(
  recipient: string,
  data: Record<string, unknown> = {}
) { ... }

# Python
def send_invoice_ready(
    self, recipient: str,
    data: dict = None
) -> dict: ...`} />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2">With a schema linked</div>
          <CodeBlock code={`// TypeScript
static sendInvoiceReady(
  recipient: string,
  data: {
    invoice_id: string;
    amount: string;
    due_date?: string;
  }
) { ... }

# Python
def send_invoice_ready(
    self, recipient: str,
    invoice_id: str,
    amount: str,
    due_date: str = None,
) -> dict: ...`} />
        </div>
      </div>

      <H3>Supported languages</H3>
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-xl p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Full SDK — 3 files</div>
          <div className="space-y-1 text-sm text-slate-700">
            {['TypeScript', 'JavaScript', 'Python', 'PHP', 'Go', 'Ruby', 'Java', 'C#', 'Kotlin', 'Swift'].map((l) => (
              <div key={l} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />{l}
              </div>
            ))}
          </div>
        </div>
        <div className="border border-slate-200 rounded-xl p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Request examples — 2 files</div>
          <div className="space-y-1 text-sm text-slate-700">
            {['Shell (curl)', 'HTTP', 'PowerShell', 'R', 'JSON config', 'C', 'C++', 'Objective-C', 'OCaml', 'Clojure'].map((l) => (
              <div key={l} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />{l}
              </div>
            ))}
          </div>
        </div>
      </div>

      <InfoBox color="emerald">
        The generator logic lives in <InlineCode>client/src/generators/</InlineCode> and has zero React or browser
        dependencies — pure TypeScript, string-in string-out. It is structured to be published as
        <InlineCode>@mail-service/sdk-gen</InlineCode>. See <InlineCode>client/src/generators/README.md</InlineCode> for
        the extraction and npm publish guide.
      </InfoBox>
    </DocSection>
  );
}

function UnsubscribeSection() {
  return (
    <DocSection id="unsubscribe" title="Unsubscribe System">
      <Para>
        MailService has a built-in, RFC-8058-compliant unsubscribe system. Every email automatically gets a
        <InlineCode>List-Unsubscribe</InlineCode> header when <InlineCode>app_url</InlineCode> or the <InlineCode>SERVER_URL</InlineCode>{' '}
        env var is set. Clicking the link opens a hosted confirmation page and permanently opts the recipient out of
        that app's emails.
      </Para>

      <H3>How tokens work</H3>
      <Para>
        Tokens are HMAC-SHA256 signatures of <InlineCode>appId|email</InlineCode> keyed with <InlineCode>JWT_SECRET</InlineCode>.
        They never expire — unsubscribes are permanent. Clicking the link twice is idempotent (upsert).
      </Para>

      <H3>Endpoints</H3>
      <CodeBlock code={`// One-click unsubscribe (RFC 8058 — triggered automatically by Gmail, Apple Mail, etc.)
POST /v1/unsubscribe
Content-Type: application/x-www-form-urlencoded
Body: List-Unsubscribe=One-Click

// Browser confirmation page (from email footer link)
GET /v1/unsubscribe?token=<hmac-sha256>&email=<address>&app=<appId>

// Both endpoints are fully public — no auth required`} />

      <H3>Pre-send check</H3>
      <Para>
        Before every <InlineCode>/v1/send</InlineCode> call, the service checks the <InlineCode>Unsubscribe</InlineCode> collection
        for that <InlineCode>appId + email</InlineCode> pair. If found, the send is skipped and logged as{' '}
        <InlineCode>status: "unsubscribed"</InlineCode> — no error is thrown to your backend.
      </Para>

      <InfoBox color="amber">
        Set <InlineCode>app_url</InlineCode> in <strong>App Settings → General</strong> to your app's public domain.
        Without it, <InlineCode>unsubscribeUrl</InlineCode> won't be injected and the <InlineCode>List-Unsubscribe</InlineCode> header won't be added.
        This will reduce deliverability scores with Gmail and Yahoo.
      </InfoBox>
    </DocSection>
  );
}

function EnvSection() {
  const vars = [
    { name: 'JWT_SECRET',          required: true,  desc: 'Secret for signing JWT tokens and HMAC unsubscribe tokens. Server refuses to start if missing. Min 32 chars recommended.' },
    { name: 'MONGODB_URI_DEV',     required: true,  desc: 'MongoDB connection string for the dev environment.' },
    { name: 'MONGODB_URI_STAGING', required: false, desc: 'MongoDB connection string for staging.' },
    { name: 'MONGODB_URI_PROD',    required: false, desc: 'MongoDB connection string for production.' },
    { name: 'MONGODB_ENV',         required: false, desc: 'Which URI to use: dev | staging | prod (default: dev).' },
    { name: 'SERVER_URL',          required: false, desc: 'Public URL of the mail service. Used as fallback base URL for unsubscribe links if app_url is not set on an app.' },
    { name: 'PORT',                required: false, desc: 'HTTP port for the server (default: 3001).' },
    { name: 'SEED_ADMIN_EMAIL',    required: false, desc: 'Email for the seeded superadmin (default: admin@example.com).' },
    { name: 'SEED_ADMIN_PASSWORD', required: false, desc: 'Password for the seeded superadmin (default: changeme123). Change immediately after first login.' },
  ];

  return (
    <DocSection id="environment" title="Environment Variables">
      <Para>
        Create <InlineCode>server/.env.dev</InlineCode>, <InlineCode>server/.env.staging</InlineCode>, and{' '}
        <InlineCode>server/.env.prod</InlineCode>. The npm scripts load the right file automatically via <InlineCode>dotenv-cli</InlineCode>.
        SMTP credentials go in App Settings inside the dashboard — not in env vars (each app has its own SMTP).
      </Para>

      <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
        <div className="grid grid-cols-[1fr_50px_2fr] bg-slate-50 border-b border-slate-200 px-4 py-2">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Variable</span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Req.</span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Description</span>
        </div>
        {vars.map((v) => (
          <div key={v.name} className="grid grid-cols-[1fr_50px_2fr] px-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
            <code className="text-[12px] font-mono text-indigo-700 break-all">{v.name}</code>
            <span>{v.required ? <span className="text-[10px] font-bold text-red-500">Yes</span> : <span className="text-[10px] text-slate-400">No</span>}</span>
            <span className="text-[12px] text-slate-600 leading-relaxed">{v.desc}</span>
          </div>
        ))}
      </div>

      <CodeBlock label="server/.env.dev" code={`# Generate JWT_SECRET:
# node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=a3f8c1d9e2b7...long-random-string...

MONGODB_URI_DEV=mongodb://localhost:27017/mail-service-dev
MONGODB_ENV=dev
SERVER_URL=https://mail.yourdomain.com
PORT=3001

# Seed script defaults — change before running in production
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=changeme123`} />

      <H3>Generating JWT_SECRET</H3>
      <CodeBlock label="Terminal" code={`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`} />

      <div className="flex flex-wrap gap-3 pt-4">
        <Link to="/register"
          className="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 hover:-translate-y-0.5">
          Get started free
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link to="/how-it-works"
          className="inline-flex items-center gap-2 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:bg-slate-50">
          See the walkthrough
        </Link>
      </div>
    </DocSection>
  );
}
