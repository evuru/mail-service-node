import { Link } from 'react-router-dom';
import { ArrowRight, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { PublicPage, PageHero } from '../components/PublicLayout';

export function DocsPage() {
  return (
    <PublicPage>
      <PageHero
        badge="Documentation"
        title={<>API Reference &<br /><span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Integration Guide</span></>}
        subtitle="Everything you need to integrate MailService into your application. Authentication, sending, templates, and more."
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
          <SendSection />
          <TemplateVarsSection />
          <TemplatesApiSection />
          <LogsApiSection />
          <UnsubscribeSection />
          <EnvSection />
        </main>
      </div>
    </section>
  );
}

function Sidebar() {
  const sections = [
    { id: 'authentication', label: 'Authentication' },
    { id: 'send', label: 'Sending Email' },
    { id: 'template-variables', label: 'Template Variables' },
    { id: 'templates-api', label: 'Templates API' },
    { id: 'logs', label: 'Send Logs' },
    { id: 'unsubscribe', label: 'Unsubscribe System' },
    { id: 'environment', label: 'Environment Variables' },
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

// ─── Shared doc components ────────────────────────────────────────────────────

function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-black text-slate-900 mb-6 pb-3 border-b border-slate-100">{title}</h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-600 leading-relaxed">{children}</p>;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[12px] font-mono">{children}</code>;
}

function CodeBlock({ label, code, lang = 'text' }: { label?: string; code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
      {label && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
          <span className="text-[10px] font-mono text-slate-500">{label}</span>
          <button onClick={copy}
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

function PropTable({ rows }: { rows: { name: string; type: string; required?: boolean; desc: string }[] }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
      <div className="grid grid-cols-[1fr_80px_60px_2fr] bg-slate-50 border-b border-slate-200 px-4 py-2">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Field</span>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Type</span>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Req.</span>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Description</span>
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

// ─── Sections ─────────────────────────────────────────────────────────────────

function AuthSection() {
  return (
    <DocSection id="authentication" title="Authentication">
      <Para>
        MailService uses two authentication mechanisms: <InlineCode>JWT tokens</InlineCode> for the dashboard and management API,
        and <InlineCode>X-API-KEY</InlineCode> headers for the email sending API.
      </Para>

      <h3 className="text-base font-bold text-slate-900 mt-6">Register</h3>
      <Para>The first user to register is automatically promoted to <InlineCode>superadmin</InlineCode>.</Para>
      <CodeBlock label="POST /v1/auth/register" code={`{
  "name": "Your Name",
  "email": "you@example.com",
  "password": "your-password"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "_id": "uuid",
    "email": "you@example.com",
    "role": "superadmin"
  }
}`} />

      <h3 className="text-base font-bold text-slate-900 mt-6">Login</h3>
      <CodeBlock label="POST /v1/auth/login" code={`{
  "email": "you@example.com",
  "password": "your-password"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "_id": "uuid", "email": "you@example.com", "role": "superadmin" }
}`} />

      <h3 className="text-base font-bold text-slate-900 mt-6">Using your API key</h3>
      <Para>Find your app's API key in <strong>App Settings → API Key</strong>. Pass it as a header on every send/template/log request.</Para>
      <CodeBlock label="Header" code={`X-API-KEY: your-app-api-key-here`} />
    </DocSection>
  );
}

function SendSection() {
  return (
    <DocSection id="send" title="Sending Email">
      <Para>
        The send endpoint renders a template with your data, checks for unsubscribes, and delivers via your app's SMTP.
        It retries up to 3 times with exponential backoff on failure.
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
        { name: 'template_slug', type: 'string', required: true, desc: 'The slug of the template to render. Looks up app-specific first, then global.' },
        { name: 'recipient', type: 'string', required: true, desc: 'Recipient email address.' },
        { name: 'data', type: 'object', required: false, desc: 'Arbitrary key-value pairs injected into the Handlebars template.' },
      ]} />

      <h3 className="text-base font-bold text-slate-900 mt-6">Response</h3>
      <CodeBlock code={`// Success
{ "success": true, "messageId": "<abc123@smtp.acme.com>" }

// Unsubscribed (not an error — recipient opted out)
{ "success": false, "error": "Recipient has unsubscribed" }

// Template not found
{ "error": "Template \"welcome-email\" not found" }   // 404`} />
    </DocSection>
  );
}

function TemplateVarsSection() {
  return (
    <DocSection id="template-variables" title="Template Variables">
      <Para>
        These variables are automatically available in every template. You don't need to pass them in <InlineCode>data</InlineCode>.
      </Para>

      <PropTable rows={[
        { name: '{{appName}}', type: 'string', desc: 'The app\'s name from App Settings → General.' },
        { name: '{{year}}', type: 'string', desc: 'The current 4-digit year, e.g. "2026".' },
        { name: '{{unsubscribeUrl}}', type: 'string', desc: 'HMAC-signed unsubscribe link. Only present if app_url or SERVER_URL is set. Use {{#if unsubscribeUrl}} to guard.' },
      ]} />

      <h3 className="text-base font-bold text-slate-900 mt-6">Example footer with unsubscribe link</h3>
      <CodeBlock label="HTML (in any template)" code={`{{#if unsubscribeUrl}}
<p style="font-size: 11px; color: #999; text-align: center; margin-top: 32px;">
  Don't want these emails?
  <a href="{{unsubscribeUrl}}" style="color: #999;">Unsubscribe</a>
</p>
{{/if}}`} />

      <h3 className="text-base font-bold text-slate-900 mt-6">Layout inheritance</h3>
      <Para>
        Create a template with <InlineCode>is_layout: true</InlineCode> and a slug like <InlineCode>_base_layout</InlineCode>.
        Other templates with <InlineCode>use_layout: true</InlineCode> will have their <InlineCode>body_html</InlineCode> injected into <InlineCode>{'{{body}}'}</InlineCode>.
      </Para>
      <CodeBlock label="Base layout" code={`<!-- _base_layout -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background: #f4f4f5; }
    .card { background: white; border-radius: 8px; padding: 32px; max-width: 560px; margin: 40px auto; }
  </style>
</head>
<body>
  <div class="card">
    {{{body}}}
    {{#if unsubscribeUrl}}
    <p style="font-size:11px;color:#aaa;margin-top:24px;">
      <a href="{{unsubscribeUrl}}">Unsubscribe</a>
    </p>
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
      <Para>All template endpoints require the <InlineCode>X-API-KEY</InlineCode> header.</Para>

      <h3 className="text-base font-bold text-slate-900 mt-4">List templates</h3>
      <CodeBlock label="GET /v1/templates" code={`// Returns app-specific templates + global templates (app_id: null)
[
  {
    "_id": "uuid",
    "slug": "welcome-email",
    "name": "Welcome Email",
    "subject": "Welcome, {{name}}!",
    "is_layout": false,
    "use_layout": true,
    "is_global": false,
    "app_id": "app-uuid"
  }
]`} />

      <h3 className="text-base font-bold text-slate-900 mt-6">Preview a template</h3>
      <CodeBlock label="POST /v1/preview/:slug" code={`// Body: same data object as /v1/send
{ "name": "Alex", "ctaUrl": "https://..." }

// Response
{
  "subject": "Welcome, Alex!",
  "html": "<!DOCTYPE html>..."
}`} />
    </DocSection>
  );
}

function LogsApiSection() {
  return (
    <DocSection id="logs" title="Send Logs">
      <Para>
        Every send is logged — success, failure, or unsubscribed. Logs are scoped to the authenticated app.
      </Para>

      <CodeBlock label="GET /v1/logs?page=1&limit=20&status=success" code={`{
  "logs": [
    {
      "_id": "uuid",
      "template_slug": "welcome-email",
      "recipient": "alex@example.com",
      "status": "success",        // "success" | "failed" | "unsubscribed"
      "sent_at": "2026-03-08T10:30:00.000Z"
    }
  ],
  "total": 142,
  "page": 1,
  "pages": 8,
  "limit": 20
}`} />

      <PropTable rows={[
        { name: 'page', type: 'number', desc: 'Page number (default: 1).' },
        { name: 'limit', type: 'number', desc: 'Results per page (default: 20, max: 100).' },
        { name: 'status', type: 'string', desc: 'Filter by status: success, failed, or unsubscribed.' },
        { name: 'template_slug', type: 'string', desc: 'Filter by a specific template slug.' },
      ]} />
    </DocSection>
  );
}

function UnsubscribeSection() {
  return (
    <DocSection id="unsubscribe" title="Unsubscribe System">
      <Para>
        MailService has a built-in unsubscribe system. Every email includes a <InlineCode>List-Unsubscribe</InlineCode> header
        (if <InlineCode>app_url</InlineCode> or <InlineCode>SERVER_URL</InlineCode> is configured). Clicking it opens a confirmation page and permanently opts the recipient out of that app's emails.
      </Para>

      <h3 className="text-base font-bold text-slate-900 mt-6">How tokens work</h3>
      <Para>
        Tokens are HMAC-SHA256 signatures of <InlineCode>appId|email</InlineCode> using <InlineCode>JWT_SECRET</InlineCode>.
        They never expire — unsubscribes are permanent. Clicking twice is safe (idempotent upsert).
      </Para>

      <h3 className="text-base font-bold text-slate-900 mt-6">Endpoints</h3>
      <CodeBlock code={`// One-click unsubscribe (RFC 8058 — triggered by email clients)
POST /v1/unsubscribe
{ "List-Unsubscribe": "One-Click", "recipient-email": "user@example.com" }

// Browser link (renders confirmation page)
GET /v1/unsubscribe?token=<hmac>&email=<address>&app=<appId>

// Both endpoints are public — no auth required`} />

      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm mt-4">
        <CheckCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <span className="text-amber-800">
          Before every send, the service checks if the recipient is in the <strong>Unsubscribe</strong> collection for that app.
          If they are, the send is skipped and logged as <InlineCode>unsubscribed</InlineCode>.
        </span>
      </div>
    </DocSection>
  );
}

function EnvSection() {
  const vars = [
    { name: 'JWT_SECRET', required: true, desc: 'Secret for signing JWT tokens and HMAC unsubscribe tokens. Server refuses to start if missing.' },
    { name: 'MONGODB_URI_DEV', required: true, desc: 'MongoDB connection string for the dev environment.' },
    { name: 'MONGODB_URI_STAGING', required: false, desc: 'MongoDB connection string for staging.' },
    { name: 'MONGODB_URI_PROD', required: false, desc: 'MongoDB connection string for production.' },
    { name: 'MONGODB_ENV', required: false, desc: 'Which URI to use: dev | staging | prod (default: dev).' },
    { name: 'SERVER_URL', required: false, desc: 'Public URL of the mail service server. Used as fallback base URL for unsubscribe links.' },
    { name: 'PORT', required: false, desc: 'HTTP port for the server (default: 3001).' },
    { name: 'SEED_ADMIN_EMAIL', required: false, desc: 'Email for the seeded admin user (default: admin@example.com).' },
    { name: 'SEED_ADMIN_PASSWORD', required: false, desc: 'Password for the seeded admin user (default: changeme123).' },
  ];

  return (
    <DocSection id="environment" title="Environment Variables">
      <Para>
        Add these to your <InlineCode>.env.dev</InlineCode>, <InlineCode>.env.staging</InlineCode>, or <InlineCode>.env.prod</InlineCode> file in the <InlineCode>server/</InlineCode> directory.
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

      <CodeBlock label="server/.env.dev (example)" code={`JWT_SECRET=supersecretkey-change-me-in-production
MONGODB_URI_DEV=mongodb://localhost:27017/mail-service-dev
MONGODB_ENV=dev
SERVER_URL=https://api.yourdomain.com
PORT=3001
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=changeme123`} />

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
