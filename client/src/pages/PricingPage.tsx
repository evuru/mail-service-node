import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Check, X, ArrowRight, Server, Cloud,
  Download, Star,
} from 'lucide-react';
import { PublicPage, PageHero } from '../components/PublicLayout';

export function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <PublicPage>
      <PageHero
        badge="Pricing"
        title={<>Simple, honest<br /><span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">pricing</span></>}
        subtitle="From fully self-hosted and free to fully managed with enterprise support — pick the plan that fits how you work."
      />
      <PricingCards yearly={yearly} setYearly={setYearly} />
      <ComparisonTable />
      <FaqSection />
      <PricingCta />
    </PublicPage>
  );
}

// ─── Plans data ───────────────────────────────────────────────────────────────

const plans = [
  {
    id: 'open',
    name: 'Mailer Open',
    tagline: 'You run everything',
    icon: Download,
    iconColor: 'from-slate-500 to-slate-700',
    badge: null,
    monthlyPrice: 0,
    yearlyPrice: 0,
    priceSuffix: 'Free forever',
    priceNote: 'No credit card, no account needed',
    cta: 'Download on GitHub',
    ctaTo: '/register',
    ctaStyle: 'border',
    description: 'Download, self-host, and run the full mail service on your own infrastructure. Community support only.',
    highlights: [
      'All core features included',
      'Unlimited apps & templates',
      'REST API + Handlebars engine',
      'Multi-tenant support',
      'Community support (GitHub)',
      'You manage hosting & backups',
    ],
    limitations: [
      'No setup assistance',
      'No SLA or uptime guarantee',
      'No managed backups',
    ],
  },
  {
    id: 'expert',
    name: 'Mailer Expert',
    tagline: 'You host, we help',
    icon: Server,
    iconColor: 'from-violet-500 to-purple-600',
    badge: null,
    monthlyPrice: 9,
    yearlyPrice: 7,
    priceSuffix: '/month',
    priceNote: 'billed monthly or annually',
    cta: 'Get started',
    ctaTo: '/register',
    ctaStyle: 'border',
    description: 'Host on your own servers. We guide the setup, provide ongoing support, and help you stay up and running.',
    highlights: [
      'All core features included',
      'Guided setup & onboarding',
      'Email & chat support',
      'Backup strategy guidance',
      'Update & migration support',
      'Monthly check-in calls',
    ],
    limitations: [
      'You manage your own infra',
      'No 24/7 emergency support',
      'No managed hosting',
    ],
  },
  {
    id: 'cloud',
    name: 'Mailer Cloud',
    tagline: 'We handle everything',
    icon: Cloud,
    iconColor: 'from-indigo-500 to-violet-600',
    badge: 'Most Popular',
    monthlyPrice: 15,
    yearlyPrice: 12,
    priceSuffix: '/month',
    priceNote: 'billed monthly or annually',
    cta: 'Start free trial',
    ctaTo: '/register',
    ctaStyle: 'primary',
    description: 'Fully managed. You register, connect your SMTP, and send. We handle hosting, storage, backups, and support.',
    highlights: [
      'Fully managed infrastructure',
      '10 GB storage included',
      'Up to 50,000 emails/month',
      '24/7 email support',
      'Automated daily backups',
      '99.9% uptime SLA',
      'Monitoring & alerting',
      'One-click updates',
    ],
    limitations: [],
  },
  {
    id: 'cloud-pro',
    name: 'Mailer Cloud Pro',
    tagline: 'Cloud + premium support',
    icon: Star,
    iconColor: 'from-amber-400 to-orange-500',
    badge: 'Best for Teams',
    monthlyPrice: 60,
    yearlyPrice: 50,
    priceSuffix: '/month',
    priceNote: 'billed monthly or annually',
    cta: 'Start free trial',
    ctaTo: '/register',
    ctaStyle: 'primary',
    description: 'Everything in Cloud, plus dedicated phone support, higher limits, priority assistance, and a dedicated success manager.',
    highlights: [
      'Everything in Mailer Cloud',
      '100 GB storage included',
      'Up to 500,000 emails/month',
      'Dedicated phone & call support',
      '24/7 priority support',
      '99.99% uptime SLA',
      'Dedicated success manager',
      'Custom retention & log archiving',
      'White-label option',
      'Priority feature requests',
    ],
    limitations: [],
  },
];

// ─── Pricing Cards ────────────────────────────────────────────────────────────

function PricingCards({ yearly, setYearly }: { yearly: boolean; setYearly: (v: boolean) => void }) {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-14">
          <span className={`text-sm font-semibold ${!yearly ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-indigo-600' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${yearly ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <span className={`text-sm font-semibold ${yearly ? 'text-slate-900' : 'text-slate-400'}`}>
            Yearly
            <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Save ~17%
            </span>
          </span>
        </div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
            const isPopular = plan.badge === 'Most Popular';
            const isPro = plan.badge === 'Best for Teams';
            const isFeatured = isPopular || isPro;

            return (
              <div key={plan.id}
                className={`relative flex flex-col rounded-2xl transition-all ${
                  isFeatured
                    ? 'border-2 border-indigo-500 shadow-2xl shadow-indigo-500/15 scale-[1.02]'
                    : 'border border-slate-200 hover:border-slate-300 hover:shadow-lg'
                } bg-white`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${
                    isPopular ? 'bg-indigo-600 text-white' : 'bg-amber-400 text-amber-900'
                  }`}>
                    {plan.badge}
                  </div>
                )}

                <div className="p-6 flex flex-col flex-1">
                  {/* Header */}
                  <div className="mb-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.iconColor} flex items-center justify-center shadow-md mb-4`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-base font-black text-slate-900">{plan.name}</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">{plan.tagline}</div>
                  </div>

                  {/* Price */}
                  <div className="mb-5 pb-5 border-b border-slate-100">
                    {plan.monthlyPrice === 0 ? (
                      <div className="text-4xl font-black text-slate-900">Free</div>
                    ) : (
                      <div className="flex items-end gap-1">
                        <span className="text-slate-400 text-lg font-semibold">$</span>
                        <span className="text-4xl font-black text-slate-900 leading-none">{price}</span>
                        <span className="text-slate-400 text-sm font-medium pb-0.5">{plan.priceSuffix}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 mt-1">{plan.priceNote}</div>
                    {yearly && plan.monthlyPrice > 0 && (
                      <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                        Save ${(plan.monthlyPrice - plan.yearlyPrice) * 12}/yr
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 leading-relaxed mb-5">{plan.description}</p>

                  {/* Features */}
                  <ul className="space-y-2 flex-1 mb-6">
                    {plan.highlights.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-700">
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                    {plan.limitations.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-400">
                        <X className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link to={plan.ctaTo}
                    className={`w-full text-center text-sm font-bold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 group ${
                      plan.ctaStyle === 'primary'
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5'
                        : 'border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          All Cloud plans include a 14-day free trial. No credit card required to start.
          Need a custom volume plan?{' '}
          <a href="mailto:hello@mailservice.dev" className="text-indigo-500 hover:underline">Contact us</a>.
        </p>
      </div>
    </section>
  );
}

// ─── Comparison Table ─────────────────────────────────────────────────────────

type CellValue = boolean | string;

interface FeatureRow {
  label: string;
  open: CellValue;
  expert: CellValue;
  cloud: CellValue;
  cloudPro: CellValue;
  group?: boolean;
}

const comparisonRows: FeatureRow[] = [
  { label: 'Core features', open: true, expert: true, cloud: true, cloudPro: true, group: true },
  { label: 'All email templates & layouts', open: true, expert: true, cloud: true, cloudPro: true },
  { label: 'Multi-tenant app isolation', open: true, expert: true, cloud: true, cloudPro: true },
  { label: 'REST API (send, preview, logs)', open: true, expert: true, cloud: true, cloudPro: true },
  { label: 'Deliverability headers & unsubscribe', open: true, expert: true, cloud: true, cloudPro: true },
  { label: 'Payload schema validation', open: true, expert: true, cloud: true, cloudPro: true },

  { label: 'Hosting & infrastructure', open: false, expert: false, cloud: false, cloudPro: false, group: true },
  { label: 'Managed hosting', open: false, expert: false, cloud: true, cloudPro: true },
  { label: 'Self-hosted', open: true, expert: true, cloud: false, cloudPro: false },
  { label: 'Storage included', open: 'Self-managed', expert: 'Self-managed', cloud: '10 GB', cloudPro: '100 GB' },
  { label: 'Emails per month', open: 'SMTP limit', expert: 'SMTP limit', cloud: '50,000', cloudPro: '500,000' },
  { label: 'Automated backups', open: false, expert: 'Guided', cloud: 'Daily', cloudPro: 'Daily + archive' },
  { label: 'Uptime SLA', open: false, expert: false, cloud: '99.9%', cloudPro: '99.99%' },
  { label: 'One-click updates', open: false, expert: false, cloud: true, cloudPro: true },
  { label: 'Monitoring & alerting', open: false, expert: false, cloud: true, cloudPro: true },

  { label: 'Support', open: false, expert: false, cloud: false, cloudPro: false, group: true },
  { label: 'Community support (GitHub)', open: true, expert: true, cloud: true, cloudPro: true },
  { label: 'Email & chat support', open: false, expert: true, cloud: true, cloudPro: true },
  { label: '24/7 support', open: false, expert: false, cloud: true, cloudPro: true },
  { label: 'Dedicated phone & call support', open: false, expert: false, cloud: false, cloudPro: true },
  { label: 'Dedicated success manager', open: false, expert: false, cloud: false, cloudPro: true },
  { label: 'Setup & onboarding assistance', open: false, expert: true, cloud: true, cloudPro: true },
  { label: 'Priority feature requests', open: false, expert: false, cloud: false, cloudPro: true },
  { label: 'White-label option', open: false, expert: false, cloud: false, cloudPro: true },
];

function Cell({ value }: { value: CellValue }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-500 mx-auto" />;
  if (value === false) return <span className="text-slate-200 text-lg leading-none block text-center">—</span>;
  return <span className="text-xs text-slate-600 font-medium text-center block">{value}</span>;
}

function ComparisonTable() {
  return (
    <section className="py-20 bg-slate-50 border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Compare all features</h2>
          <p className="text-sm text-slate-500">Everything side by side so you can pick with confidence.</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[36%]">Feature</th>
                {[
                  { name: 'Open', sub: 'Free' },
                  { name: 'Expert', sub: 'From $24/mo' },
                  { name: 'Cloud', sub: 'From $65/mo', highlight: true },
                  { name: 'Cloud Pro', sub: 'From $165/mo' },
                ].map((col) => (
                  <th key={col.name} className={`text-center px-4 py-4 w-[16%] ${col.highlight ? 'bg-indigo-50' : ''}`}>
                    <div className={`text-sm font-black ${col.highlight ? 'text-indigo-700' : 'text-slate-900'}`}>{col.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{col.sub}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => {
                if (row.group) {
                  return (
                    <tr key={i} className="bg-slate-50 border-t border-b border-slate-200">
                      <td colSpan={5} className="px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {row.label}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-xs text-slate-700 font-medium">{row.label}</td>
                    <td className="px-4 py-3"><Cell value={row.open} /></td>
                    <td className="px-4 py-3"><Cell value={row.expert} /></td>
                    <td className="px-4 py-3 bg-indigo-50/40"><Cell value={row.cloud} /></td>
                    <td className="px-4 py-3"><Cell value={row.cloudPro} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const faqs = [
  {
    q: 'What SMTP providers work with MailService?',
    a: 'Any SMTP provider — Hostinger, GoDaddy, SendGrid, Mailgun, Zoho, Brevo, Gmail Workspace, Amazon SES, or your own mail server. You configure the credentials; we use them.',
  },
  {
    q: 'What\'s the difference between Cloud and Cloud Pro?',
    a: 'Cloud Pro gives you 10× the storage (100 GB vs 10 GB), 10× the monthly email volume (500K vs 50K), dedicated phone and call support, a success manager, a higher uptime SLA (99.99% vs 99.9%), and white-label options.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes. Upgrade or downgrade at any time. When upgrading from Open or Expert to Cloud, we handle data migration for you.',
  },
  {
    q: 'What does "Mailer Expert" support look like?',
    a: 'After signup we schedule an onboarding call to walk through your server setup, environment configuration, DNS records, and SMTP testing. Ongoing support is via email and chat for questions, updates, and backup strategy.',
  },
  {
    q: 'Is the self-hosted (Open) version truly free?',
    a: 'Yes. Download the code from GitHub and run it yourself indefinitely at no cost. The only limitation is that support is community-only via GitHub issues.',
  },
  {
    q: 'Do you offer volume discounts or custom plans?',
    a: 'Yes — if you need more than 500K emails/month or have specific compliance requirements, email us and we\'ll tailor a plan.',
  },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-20 bg-white border-t border-slate-100">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Frequently asked questions</h2>
          <p className="text-sm text-slate-500">Still have questions?{' '}
            <a href="mailto:hello@mailservice.dev" className="text-indigo-600 hover:underline font-medium">Email us</a>.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i}
              className="border border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden transition-colors">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left gap-4">
                <span className="text-sm font-semibold text-slate-900">{faq.q}</span>
                <span className={`text-slate-400 text-xl leading-none flex-shrink-0 transition-transform ${open === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────

function PricingCta() {
  return (
    <section className="py-20 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-3xl lg:text-4xl font-black text-white mb-4 tracking-tight">
          Not sure which plan?
        </h2>
        <p className="text-base text-slate-400 mb-8 leading-relaxed">
          Start with Mailer Open for free, or try a Cloud plan with a 14-day trial. You can always switch.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/register"
            className="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-xl shadow-indigo-600/25 hover:-translate-y-0.5">
            Start free trial
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a href="mailto:hello@mailservice.dev"
            className="inline-flex items-center gap-2 border border-slate-700 hover:border-slate-500 bg-white/5 text-white font-bold px-6 py-3.5 rounded-xl transition-all">
            Talk to us
          </a>
        </div>
      </div>
    </section>
  );
}
