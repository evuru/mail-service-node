import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  Zap, Shield, LayoutTemplate, Code2, ChevronRight,
  CheckCircle, Mail, Globe, Users, ArrowRight, Layers,
  Lock, RefreshCw, Activity,
} from 'lucide-react';
import { PublicNavbar, PublicFooter } from '../components/PublicLayout';

export function LandingPage() {
  const { token } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate('/templates', { replace: true });
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <PublicNavbar />
      <Hero />
      <StatsStrip />
      <Features />
      <HowItWorks />
      <DeveloperSection />
      <CallToAction />
      <PublicFooter />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen bg-slate-950 overflow-hidden flex items-center">
      {/* Background grid */}
      <div className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Self-hosted · Multi-tenant · API-first
          </div>

          <h1 className="text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.05] tracking-tight text-white">
            Email that{' '}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                actually lands
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500/60 to-violet-500/60 rounded-full blur-sm" />
            </span>
            {' '}in the inbox.
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed max-w-lg">
            A self-hosted email template microservice for developers. Connect any SMTP provider,
            build with Handlebars, send via REST API — with deliverability built in from day one.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to="/register"
              className="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3.5 rounded-xl transition-all shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5">
              Start for free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/how-it-works"
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl transition-all">
              See how it works
            </Link>
          </div>

          <div className="flex items-center gap-6 pt-2">
            {['No credit card required', 'Self-hosted', 'Open source'].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Right — mock UI */}
        <div className="relative hidden lg:block">
          <DashboardMock />
        </div>
      </div>
    </section>
  );
}

function DashboardMock() {
  const templates = [
    { name: 'welcome-email', tag: 'Transactional', color: 'bg-indigo-500' },
    { name: 'password-reset', tag: 'Security', color: 'bg-violet-500' },
    { name: 'order-confirmed', tag: 'Transactional', color: 'bg-emerald-500' },
    { name: 'newsletter', tag: 'Marketing', color: 'bg-amber-500' },
  ];

  const logs = [
    { email: 'alex@acme.com', template: 'welcome-email' },
    { email: 'sam@startup.io', template: 'order-confirmed' },
    { email: 'riley@corp.com', template: 'password-reset' },
  ];

  return (
    <div className="relative w-full max-w-md ml-auto">
      {/* Floating stat — top left */}
      <div className="absolute -top-8 -left-8 z-20 bg-emerald-500 text-white rounded-2xl px-5 py-3.5 shadow-2xl shadow-emerald-500/30">
        <div className="text-2xl font-black">99.8%</div>
        <div className="text-xs font-medium opacity-80 mt-0.5">Delivery rate</div>
      </div>

      {/* Floating stat — bottom right */}
      <div className="absolute -bottom-6 -right-4 z-20 bg-slate-800 border border-slate-700 text-white rounded-2xl px-5 py-3.5 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 font-medium">Live sends</span>
        </div>
        <div className="text-2xl font-black">2,847</div>
      </div>

      {/* Main card */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
        <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-800/60 border-b border-slate-700/60">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-amber-500/70" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
          <span className="ml-4 text-xs text-slate-500 font-mono">mail-service / templates</span>
        </div>

        <div className="p-4 space-y-2 border-b border-slate-700/60">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Templates</div>
          {templates.map((t) => (
            <div key={t.name} className="flex items-center gap-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg px-3 py-2.5 transition-colors cursor-default group">
              <div className={`w-2 h-2 rounded-full ${t.color} flex-shrink-0`} />
              <span className="text-sm font-medium text-slate-200 font-mono flex-1">{t.name}</span>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-700 rounded px-1.5 py-0.5">{t.tag}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
          ))}
        </div>

        <div className="p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent Sends</div>
          {logs.map((log, i) => (
            <div key={i} className="flex items-center gap-3 px-1">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                {log.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-300 truncate">{log.email}</div>
                <div className="text-[10px] text-slate-600 font-mono">{log.template}</div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                <CheckCircle className="w-2.5 h-2.5" />
                sent
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stats Strip ──────────────────────────────────────────────────────────────

function StatsStrip() {
  const stats = [
    { value: '< 200ms', label: 'Avg. send latency' },
    { value: '3×', label: 'Automatic retry on failure' },
    { value: 'HMAC', label: 'Signed unsubscribe tokens' },
    { value: 'SPF · DKIM · DMARC', label: 'Deliverability built in' },
  ];

  return (
    <section className="bg-slate-900 border-y border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-2xl font-black mb-1 bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              {s.value}
            </div>
            <div className="text-xs text-slate-500 font-medium">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Features teaser ─────────────────────────────────────────────────────────

const features = [
  {
    icon: Layers,
    color: 'from-indigo-500 to-violet-600',
    glow: 'shadow-indigo-500/20',
    title: 'Multi-tenant apps',
    description: 'One service, unlimited clients. Each app gets its own SMTP config, API key, templates, and send logs — fully isolated.',
    bullets: ['Per-app SMTP transporter cache', 'API key scoped to each app', 'Role-based team members'],
  },
  {
    icon: LayoutTemplate,
    color: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/20',
    title: 'Handlebars templates',
    description: 'Build reusable layouts and templates with Handlebars. Inject any JSON payload. CSS inlined automatically via Juice.',
    bullets: ['Layouts with {{body}} slots', 'Payload schema validation', 'Live preview before sending'],
  },
  {
    icon: Shield,
    color: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/20',
    title: 'Deliverability first',
    description: 'SPF, DKIM, DMARC guidance built in. Automatic List-Unsubscribe headers, plain-text alt, and a full unsubscribe system.',
    bullets: ['One-click unsubscribe (RFC 8058)', 'Auto plain-text generation', 'DNS setup guide in the UI'],
  },
  {
    icon: Zap,
    color: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/20',
    title: 'REST API with retries',
    description: 'Send emails from any backend with a single POST request. Automatic 3× retry with exponential backoff on failure.',
    bullets: ['POST /v1/send with X-API-KEY', 'Full send log per app', 'Unsubscribe check before send'],
  },
  {
    icon: Code2,
    color: 'from-sky-500 to-cyan-600',
    glow: 'shadow-sky-500/20',
    title: 'Developer experience',
    description: 'TypeScript throughout, Monaco editor in the UI, JSON payload schemas, and a full API you can integrate in minutes.',
    bullets: ['Monaco code editor in browser', 'Payload schema editor', 'JWT + API key auth'],
  },
  {
    icon: Users,
    color: 'from-pink-500 to-rose-600',
    glow: 'shadow-pink-500/20',
    title: 'Team collaboration',
    description: 'Invite team members to each app with owner, editor, or viewer roles. Superadmin panel for platform management.',
    bullets: ['Owner / editor / viewer roles', 'Superadmin user management', 'Per-app member list'],
  },
];

function Features() {
  return (
    <section className="py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-6">
            Features
          </div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 mb-5">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              send at scale
            </span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Built for developers who need a reliable, self-hosted email layer — not another SaaS subscription.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title}
                className="group bg-white border border-slate-200 hover:border-indigo-200 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-slate-200/80 hover:-translate-y-1">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg ${f.glow} mb-5`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-5">{f.description}</p>
                <ul className="space-y-2">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-slate-600">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link to="/features"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
            Explore all features in detail
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

const steps = [
  {
    step: '01',
    icon: Globe,
    title: 'Create an app & connect SMTP',
    description: 'Register, create an Email App, and plug in your SMTP credentials — Hostinger, SendGrid, Gmail, or any provider. Each app gets a unique API key.',
  },
  {
    step: '02',
    icon: LayoutTemplate,
    title: 'Build templates with Handlebars',
    description: 'Use the Monaco editor in the browser to craft HTML email templates. Use layouts, inject dynamic data via {{variable}}, and preview instantly.',
  },
  {
    step: '03',
    icon: Zap,
    title: 'Send via REST API',
    description: 'POST to /v1/send with your API key and a JSON payload. We render the template, inline the CSS, check unsubscribes, and deliver — with retries.',
  },
];

function HowItWorks() {
  return (
    <section className="py-28 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 50%, rgba(99,102,241,0.08) 0%, transparent 60%),
                            radial-gradient(circle at 70% 50%, rgba(139,92,246,0.06) 0%, transparent 60%)`,
        }} />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">
            How it works
          </div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white mb-5">
            Up and running{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              in minutes
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Three steps from zero to sending production emails.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 relative">
          <div className="hidden lg:block absolute top-12 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="relative">
                <div className="bg-slate-900 border border-slate-700/80 hover:border-indigo-500/40 rounded-2xl p-8 transition-all hover:shadow-2xl hover:shadow-indigo-500/5 h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <span className="text-4xl font-black text-slate-800 select-none">{s.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{s.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-4 top-12 z-10 w-8 h-8 bg-slate-900 border border-slate-700 rounded-full items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-indigo-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link to="/how-it-works"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            See the detailed walkthrough
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Developer Section ────────────────────────────────────────────────────────

function DeveloperSection() {
  const snippet = `curl -X POST https://your-server.com/v1/send \\
  -H "X-API-KEY: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_slug": "welcome-email",
    "recipient": "user@example.com",
    "data": {
      "name": "Alex",
      "company": "Acme Corp"
    }
  }'`;

  return (
    <section className="py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-widest">
            API-first
          </div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            One request.{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Email delivered.
            </span>
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            Integrate in minutes from any language. Pass your template slug, recipient, and a JSON data object — we handle the rest.
          </p>

          <ul className="space-y-4">
            {[
              { icon: Lock, text: 'Per-app API keys — no shared secrets' },
              { icon: RefreshCw, text: 'Automatic retry with exponential backoff' },
              { icon: Activity, text: 'Full send log per app for debugging' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-sm text-slate-700 font-medium leading-relaxed pt-1.5">{text}</span>
              </li>
            ))}
          </ul>

          <Link to="/docs"
            className="group inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:text-indigo-800 transition-colors">
            Read the full API docs
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Code block */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-3xl blur-2xl" />
          <div className="relative bg-slate-950 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/40">
            <div className="flex items-center justify-between px-5 py-3 bg-slate-900/80 border-b border-slate-700/60">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
              </div>
              <span className="text-xs text-slate-500 font-mono">POST /v1/send</span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">200 OK</span>
            </div>
            <div className="p-6 overflow-x-auto">
              <pre className="text-xs leading-6 font-mono">
                {snippet.split('\n').map((line, i) => (
                  <div key={i} className="flex">
                    <span className="text-slate-600 select-none w-5 flex-shrink-0 text-right mr-5">{i + 1}</span>
                    <span className={
                      line.includes('curl') || line.includes('-X') ? 'text-sky-400' :
                      line.includes('-H') ? 'text-amber-400' :
                      line.includes('-d') ? 'text-violet-400' :
                      line.startsWith('  ') && (line.includes('"') || line.includes('{') || line.includes('}')) ? 'text-emerald-300' :
                      'text-slate-300'
                    }>{line}</span>
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Call To Action ───────────────────────────────────────────────────────────

function CallToAction() {
  return (
    <section className="py-28 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-indigo-500/20 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/30 flex items-center justify-center mx-auto mb-8">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-white mb-6">
          Ready to take control of{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            your email?
          </span>
        </h2>
        <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-xl mx-auto">
          Deploy once, use everywhere. No per-email pricing, no monthly limits, no black-box algorithms deciding if your email lands.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/register"
            className="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-xl text-base transition-all shadow-2xl shadow-indigo-600/30 hover:-translate-y-0.5">
            Get started — it's free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/login"
            className="inline-flex items-center gap-2 border border-slate-700 hover:border-slate-500 bg-white/5 hover:bg-white/10 text-white font-bold px-8 py-4 rounded-xl text-base transition-all">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
