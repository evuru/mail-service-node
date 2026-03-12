import { Link } from 'react-router-dom';
import {
  Globe, LayoutTemplate, Zap, ChevronRight, CheckCircle,
  ArrowRight, Mail, Key, Settings, Send, Eye, FileText, Layers,
} from 'lucide-react';
import { PublicPage, PageHero } from '../components/PublicLayout';

export function HowItWorksPage() {
  return (
    <PublicPage>
      <PageHero
        badge="How it works"
        title={<>From zero to sending<br /><span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">in minutes</span></>}
        subtitle="Three steps to production-ready email delivery. No vendor lock-in, no per-email pricing, no black-box spam filters."
      />
      <StepsSection />
      <DetailedWalkthrough />
      <HowItWorksCta />
    </PublicPage>
  );
}

// ─── Steps overview ───────────────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    icon: Globe,
    color: 'from-indigo-500 to-violet-600',
    glow: 'shadow-indigo-500/20',
    title: 'Create apps & connect SMTP',
    summary: 'Register your account, create one or more Email Apps, and plug in your SMTP credentials.',
    details: [
      'Register — first user becomes superadmin automatically',
      'Create an Email App per product or domain (e.g. "Acme Notifications", "Acme Billing")',
      'Set your SMTP credentials — any provider works (Hostinger, SendGrid, Gmail, Mailgun…)',
      'Each app gets its own unique API key — your backend\'s identifier for that app',
      'Optionally invite teammates with editor or viewer roles',
    ],
  },
  {
    number: '02',
    icon: LayoutTemplate,
    color: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/20',
    title: 'Build templates with Handlebars',
    summary: 'Use the in-browser Monaco editor to craft HTML email templates with dynamic data.',
    details: [
      'Write HTML email templates using Handlebars syntax — {{name}}, {{#if}}, {{#each}}',
      'Create a base layout (with a {{{body}}} slot) for consistent headers and footers',
      'Templates automatically inherit your layout — just write the content',
      'Live preview renders your template with real data before you send',
      'CSS is auto-inlined by Juice so emails look right everywhere',
    ],
  },
  {
    number: '03',
    icon: Zap,
    color: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/20',
    title: 'Send via REST API',
    summary: 'Template-based or raw custom HTML — one POST, we handle the rest.',
    details: [
      'POST /v1/send with template_slug + data — renders your template and delivers',
      'POST /v1/send/raw with subject + html — no template needed, great for dynamic alerts',
      'Unsubscribe check runs before every send — opted-out recipients are skipped and logged',
      'Automatic retry up to 3× with exponential backoff on SMTP failure',
      'Every send (success, failure, or unsubscribed) is logged to your app\'s send log',
    ],
  },
];

function StepsSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-3 gap-8 relative">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.number} className="relative">
                <div className="h-full bg-white border border-slate-200 hover:border-indigo-200 rounded-2xl p-7 transition-all hover:shadow-xl hover:shadow-slate-200/80 hover:-translate-y-1">
                  {/* Step number + icon */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg ${s.glow}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-5xl font-black text-slate-100 select-none leading-none">{s.number}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-5">{s.summary}</p>
                  <ul className="space-y-2">
                    {s.details.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Connector arrow */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-4 top-14 z-10 w-8 h-8 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm">
                    <ChevronRight className="w-4 h-4 text-indigo-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Detailed walkthrough ─────────────────────────────────────────────────────

const walkthrough = [
  {
    icon: Key,
    label: 'Step 1a',
    title: 'Register your account',
    desc: 'Hit /register — the very first user is automatically promoted to superadmin. No extra config needed.',
    code: `POST /v1/auth/register
{
  "name": "Your Name",
  "email": "you@example.com",
  "password": "••••••••"
}

→ { "token": "eyJ...", "user": { "role": "superadmin" } }`,
  },
  {
    icon: Settings,
    label: 'Step 1b',
    title: 'Configure your Email App',
    desc: 'Create an app, enter SMTP credentials, and set the App URL so unsubscribe links resolve correctly.',
    code: `POST /v1/apps   (Authorization: Bearer <token>)
{
  "app_name": "Acme Notifications",
  "app_url": "https://api.acme.com",
  "smtp_host": "smtp.hostinger.com",
  "smtp_port": 587,
  "smtp_user": "no-reply@acme.com",
  "smtp_pass": "••••••••"
}`,
  },
  {
    icon: Layers,
    label: 'Step 1c',
    title: 'Multiple apps, one service',
    desc: 'Create a separate Email App per product or domain. Each gets its own API key, SMTP, templates, and logs.',
    code: `# Backend env vars — one key per app
MAIL_KEY_NOTIFICATIONS=d8630c73-6ed9-41e3-a4ed-...
MAIL_KEY_BILLING=f2a10c84-7be2-52f4-b5fd-...
MAIL_KEY_SUPPORT=a1b2c3d4-e5f6-7890-abcd-...

# Each key routes to its own SMTP + templates
POST /v1/send   X-API-KEY: $MAIL_KEY_BILLING
→ sends from billing@acme.com via Billing SMTP`,
  },
  {
    icon: FileText,
    label: 'Step 2',
    title: 'Create a template',
    desc: 'Write HTML with Handlebars. Layouts wrap your content automatically. CSS is inlined on send.',
    code: `<!-- welcome-email template body -->
<h1>Welcome, {{name}}!</h1>
<p>Thanks for joining <strong>{{appName}}</strong>.</p>
<p>
  <a href="{{ctaUrl}}">Get started →</a>
</p>
{{#if unsubscribeUrl}}
<p style="font-size:11px;color:#999;">
  <a href="{{unsubscribeUrl}}">Unsubscribe</a>
</p>
{{/if}}`,
  },
  {
    icon: Eye,
    label: 'Step 2b',
    title: 'Preview before sending',
    desc: 'Render any template with real data via the preview API or the live preview panel in the editor.',
    code: `POST /v1/preview/welcome-email   (X-API-KEY: ...)
{
  "name": "Alex",
  "ctaUrl": "https://app.acme.com/onboarding"
}

→ { "subject": "Welcome, Alex!", "html": "..." }`,
  },
  {
    icon: Send,
    label: 'Step 3a',
    title: 'Send via template',
    desc: 'One request. We render, check unsubscribes, inline CSS, and deliver with automatic retries.',
    code: `POST /v1/send   (X-API-KEY: ...)
{
  "template_slug": "welcome-email",
  "recipient": "alex@example.com",
  "data": {
    "name": "Alex",
    "ctaUrl": "https://app.acme.com/onboarding"
  }
}

→ { "success": true, "messageId": "<abc@smtp.acme.com>" }`,
  },
  {
    icon: Zap,
    label: 'Step 3b',
    title: 'Send raw (no template)',
    desc: 'Need a one-off or fully dynamic email? Skip the template — send subject + HTML directly.',
    code: `POST /v1/send/raw   (X-API-KEY: ...)
{
  "subject": "Your order #1042 has shipped",
  "html": "<h1>It's on its way!</h1><p>Track: <a href='...'>here</a></p>",
  "recipient": "alex@example.com",
  "from_name": "Acme Orders"
}

→ { "success": true, "messageId": "<def@smtp.acme.com>" }`,
  },
  {
    icon: Mail,
    label: 'Step 3c',
    title: 'Monitor send logs',
    desc: 'Every send — success, failure, or unsubscribed — is logged with timestamp and error details.',
    code: `GET /v1/logs?page=1&limit=20   (X-API-KEY: ...)

→ {
    "logs": [
      { "recipient": "alex@example.com",
        "template_slug": "welcome-email",
        "status": "success",
        "sent_at": "2026-03-10T09:15:00Z" },
      { "recipient": "alex@example.com",
        "template_slug": "_raw",
        "status": "success",
        "sent_at": "2026-03-10T09:20:00Z" }
    ],
    "total": 2, "pages": 1
  }`,
  },
];

function DetailedWalkthrough() {
  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(99,102,241,0.06) 0%, transparent 50%),
                            radial-gradient(circle at 80% 50%, rgba(139,92,246,0.05) 0%, transparent 50%)`,
        }} />

      <div className="relative max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-4">
            Detailed walkthrough
          </h2>
          <p className="text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Every API call, in order. Copy and adapt these for your stack.
          </p>
        </div>

        <div className="space-y-6">
          {walkthrough.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={item.label}
                className="grid lg:grid-cols-2 gap-6 bg-slate-900 border border-slate-700/80 hover:border-indigo-500/30 rounded-2xl p-6 transition-all">
                {/* Left */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-2">
                      <Icon className="w-4.5 h-4.5 text-indigo-400" />
                    </div>
                    {i < walkthrough.length - 1 && (
                      <div className="w-px h-full bg-slate-800 mx-auto mt-1 hidden lg:block" />
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-1">{item.label}</div>
                    <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>

                {/* Right — code */}
                <div className="bg-slate-950 border border-slate-700/60 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-700/60">
                    <span className="text-[10px] font-mono text-slate-500">example</span>
                  </div>
                  <pre className="p-4 text-[11px] leading-5 font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
                    {item.code}
                  </pre>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────

function HowItWorksCta() {
  return (
    <section className="py-24 bg-white border-t border-slate-100">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-4 tracking-tight">
          Looks simple?{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            It is.
          </span>
        </h2>
        <p className="text-base text-slate-500 mb-8 leading-relaxed">
          Create your account and send your first email in under 5 minutes.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/register"
            className="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-xl shadow-indigo-600/25 hover:-translate-y-0.5">
            Get started free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/docs"
            className="inline-flex items-center gap-2 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold px-6 py-3.5 rounded-xl transition-all hover:bg-slate-50">
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}
