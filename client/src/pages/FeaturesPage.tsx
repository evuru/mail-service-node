import { Link } from 'react-router-dom';
import {
  Shield, LayoutTemplate, Code2, Users, Layers,
  CheckCircle, ArrowRight, Globe, Lock,
  Key, BarChart2, FileCode, Mail,
} from 'lucide-react';
import { PublicPage, PageHero } from '../components/PublicLayout';

export function FeaturesPage() {
  return (
    <PublicPage>
      <PageHero
        badge="Features"
        title={<>Everything you need to<br /><span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">send at scale</span></>}
        subtitle="Built for developers who need a reliable, self-hosted email layer — not another SaaS subscription with per-email pricing."
      />
      <MultiTenantSection />
      <TemplatesSection />
      <DeliverabilitySection />
      <ApiSection />
      <TeamsSection />
      <FeatureCta />
    </PublicPage>
  );
}

// ─── Multi-tenant ─────────────────────────────────────────────────────────────

function MultiTenantSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
            One service,{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              many clients
            </span>
          </h2>
          <p className="text-base text-slate-500 leading-relaxed">
            Create multiple Email Apps under one account. Each app has its own SMTP configuration, API key, templates, send logs, and team members — completely isolated from every other app.
          </p>
          <ul className="space-y-3">
            {[
              { icon: Key, text: 'Unique API key per app — scoped access only' },
              { icon: Globe, text: 'Any SMTP provider per app — mix and match' },
              { icon: BarChart2, text: 'Per-app send logs and analytics' },
              { icon: Lock, text: 'Global templates shared across all apps' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <span className="text-sm text-slate-700 font-medium pt-1">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Visual — app switcher mockup */}
        <div className="bg-slate-950 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/30">
          <div className="flex items-center gap-1.5 px-5 py-3 bg-slate-900/80 border-b border-slate-700/60">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            <span className="ml-4 text-xs text-slate-500 font-mono">My Apps</span>
          </div>
          <div className="p-5 space-y-3">
            {[
              { name: 'Acme Corp Notifications', key: 'ak_7f2a...', role: 'owner', sends: '12,430', color: 'bg-indigo-500' },
              { name: 'StartupX Transactional', key: 'ak_9e1c...', role: 'editor', sends: '4,891', color: 'bg-violet-500' },
              { name: 'DevTools Newsletter', key: 'ak_3b8d...', role: 'owner', sends: '2,105', color: 'bg-emerald-500' },
            ].map((app) => (
              <div key={app.name} className="bg-slate-800/60 border border-slate-700/50 hover:border-indigo-500/30 rounded-xl p-4 transition-colors cursor-default">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${app.color} flex-shrink-0`} />
                    <span className="text-sm font-semibold text-white">{app.name}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-700 rounded px-1.5 py-0.5 flex-shrink-0">{app.role}</span>
                </div>
                <div className="flex items-center gap-4 pl-5">
                  <span className="text-[11px] font-mono text-slate-500">{app.key}</span>
                  <span className="text-[11px] text-slate-400"><span className="text-emerald-400 font-semibold">{app.sends}</span> sent</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Templates ────────────────────────────────────────────────────────────────

function TemplatesSection() {
  const templateFeatures = [
    { title: 'Handlebars syntax', desc: 'Use {{variable}}, {{#if}}, {{#each}}, and partials to build dynamic emails.' },
    { title: 'Layout inheritance', desc: 'Create a base layout with a {{body}} slot. Templates inject into it automatically.' },
    { title: 'Monaco editor', desc: 'Edit HTML directly in the browser with full syntax highlighting and autocompletion.' },
    { title: 'Live preview', desc: 'Render templates with real data before sending — see exactly what recipients receive.' },
    { title: 'CSS inlining', desc: 'Juice automatically inlines all CSS so emails render correctly in every client.' },
    { title: 'Payload schemas', desc: 'Define JSON schemas to validate and document the data each template expects.' },
  ];

  return (
    <section className="py-24 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25 mx-auto mb-5">
            <LayoutTemplate className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 mb-4">
            Powerful{' '}
            <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              template engine
            </span>
          </h2>
          <p className="text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
            Build reusable, maintainable email templates with the full power of Handlebars. No proprietary drag-and-drop lock-in.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templateFeatures.map((f) => (
            <div key={f.title} className="bg-white border border-slate-200 hover:border-violet-200 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-violet-50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <h3 className="text-sm font-bold text-slate-900">{f.title}</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pl-6">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Deliverability ───────────────────────────────────────────────────────────

function DeliverabilitySection() {
  const items = [
    { label: 'Precedence: bulk', desc: 'Suppresses auto-replies from corporate mail servers.' },
    { label: 'List-Unsubscribe header', desc: 'Required by Gmail and Yahoo for bulk senders. Enables the native "Unsubscribe" button.' },
    { label: 'RFC 8058 one-click', desc: 'List-Unsubscribe-Post header enables Gmail\'s one-click unsubscribe button.' },
    { label: 'HMAC unsubscribe tokens', desc: 'Signed with your JWT_SECRET. Permanent per-recipient opt-out stored in MongoDB.' },
    { label: 'Plain-text alternative', desc: 'Auto-generated from HTML. Improves spam scores and reaches text-only clients.' },
    { label: 'DNS Guide tab', desc: 'Auto-detected SPF record for your SMTP provider + DKIM and DMARC copy-paste values.' },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-start">
        <div className="space-y-6 lg:sticky lg:top-28">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
            Deliverability{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              built in
            </span>
          </h2>
          <p className="text-base text-slate-500 leading-relaxed">
            Most email services treat deliverability as an afterthought. We ship SPF guidance, automatic unsubscribe handling, and correct headers out of the box.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <div className="text-2xl font-black text-emerald-700 mb-1">99.8%</div>
            <div className="text-xs text-emerald-600 font-medium">Average delivery rate with correct DNS setup</div>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.label}
              className="flex items-start gap-4 bg-slate-50 border border-slate-200 hover:border-emerald-200 rounded-xl p-4 transition-all hover:bg-emerald-50/30">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 mb-0.5">{item.label}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── API ─────────────────────────────────────────────────────────────────────

function ApiSection() {
  const endpoints = [
    { method: 'POST', path: '/v1/send', desc: 'Send an email using a template', auth: 'X-API-KEY' },
    { method: 'GET', path: '/v1/templates', desc: 'List templates for the app', auth: 'X-API-KEY' },
    { method: 'GET', path: '/v1/logs', desc: 'Paginated send history', auth: 'X-API-KEY' },
    { method: 'GET', path: '/v1/preview/:slug', desc: 'Render template without sending', auth: 'X-API-KEY' },
    { method: 'POST', path: '/v1/auth/register', desc: 'Create account (first = superadmin)', auth: 'Public' },
    { method: 'POST', path: '/v1/auth/login', desc: 'Get JWT token', auth: 'Public' },
  ];

  const methodColor: Record<string, string> = {
    GET: 'text-sky-400 bg-sky-400/10',
    POST: 'text-emerald-400 bg-emerald-400/10',
    PUT: 'text-amber-400 bg-amber-400/10',
    DELETE: 'text-red-400 bg-red-400/10',
  };

  return (
    <section className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-sky-500/25 mx-auto mb-5">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white mb-4">
            Simple{' '}
            <span className="bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">
              REST API
            </span>
          </h2>
          <p className="text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            All core operations exposed as clean JSON endpoints. Integrate from any language or framework in minutes.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/60 flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-mono text-slate-500">API Endpoints</span>
          </div>
          <div className="divide-y divide-slate-800">
            {endpoints.map((ep) => (
              <div key={ep.path} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/40 transition-colors">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded font-mono w-12 text-center flex-shrink-0 ${methodColor[ep.method]}`}>
                  {ep.method}
                </span>
                <span className="text-sm font-mono text-slate-200 flex-1">{ep.path}</span>
                <span className="text-xs text-slate-500 hidden sm:block">{ep.desc}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  ep.auth === 'Public' ? 'text-slate-400 bg-slate-700' : 'text-indigo-400 bg-indigo-400/10'
                }`}>{ep.auth}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Full API reference available in the{' '}
          <Link to="/docs" className="text-indigo-400 hover:text-indigo-300 transition-colors">Docs</Link>.
        </p>
      </div>
    </section>
  );
}

// ─── Teams ────────────────────────────────────────────────────────────────────

function TeamsSection() {
  const roles = [
    { role: 'Owner', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', perms: ['Full app control', 'SMTP settings', 'API key management', 'Member management', 'Templates & logs'] },
    { role: 'Editor', color: 'bg-violet-100 text-violet-700 border-violet-200', perms: ['Edit templates', 'View logs', 'App name / URL', 'No SMTP access', 'No member management'] },
    { role: 'Viewer', color: 'bg-slate-100 text-slate-600 border-slate-200', perms: ['View templates', 'View logs', 'Read-only access', 'No edits', 'No settings'] },
  ];

  return (
    <section className="py-24 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/25 mx-auto mb-5">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 mb-4">
            Team{' '}
            <span className="bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
              collaboration
            </span>
          </h2>
          <p className="text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
            Invite teammates to any app with fine-grained role-based access. Superadmins can manage the entire platform.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {roles.map((r) => (
            <div key={r.role} className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border mb-5 ${r.color}`}>
                {r.role}
              </div>
              <ul className="space-y-2">
                {r.perms.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      p.startsWith('No') ? 'bg-slate-300' : 'bg-emerald-400'
                    }`} />
                    <span className={p.startsWith('No') ? 'text-slate-400' : ''}>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────

function FeatureCta() {
  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative max-w-2xl mx-auto px-6 text-center">
        <Mail className="w-10 h-10 text-indigo-400 mx-auto mb-6" />
        <h2 className="text-3xl lg:text-4xl font-black text-white mb-4 tracking-tight">
          Ready to start sending?
        </h2>
        <p className="text-base text-slate-400 mb-8 leading-relaxed">
          No per-email fees. No black boxes. Deploy once and send from anywhere.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/register"
            className="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-xl shadow-indigo-600/25 hover:-translate-y-0.5">
            Get started free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/how-it-works"
            className="inline-flex items-center gap-2 border border-slate-700 hover:border-slate-500 bg-white/5 text-white font-bold px-6 py-3.5 rounded-xl transition-all">
            See how it works
          </Link>
        </div>
      </div>
    </section>
  );
}
