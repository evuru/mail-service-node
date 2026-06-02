import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Send, CheckCircle2, XCircle, ArrowRight,
  TrendingUp, TrendingDown, Minus, RefreshCw, LayoutGrid,
  CreditCard,
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import type { Plan } from '../types';

interface AppStats {
  total_templates: number;
  emails_30d: number;
  emails_7d: number;
  success_rate: number;
  chart: { date: string; total: number; success: number; failed: number }[];
  recent_logs: {
    _id: string; template_slug: string; recipient: string;
    status: 'success' | 'failed' | 'unsubscribed'; sent_at: string;
  }[];
}

// ─── Smooth bezier SVG chart ──────────────────────────────────────────────────

function bezierPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

function AppChart({ data }: { data: AppStats['chart'] }) {
  const W = 700; const H = 150; const PAD = { top: 16, right: 12, bottom: 30, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const svgRef = useRef<SVGSVGElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; d: AppStats['chart'][0] } | null>(null);

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const toX = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * innerW;
  const toY = (v: number) => PAD.top + innerH - (v / maxVal) * innerH;

  const pts: [number, number][] = data.map((d, i) => [toX(i), toY(d.total)]);
  const areaD = data.length >= 2
    ? `${bezierPath(pts)} L ${toX(data.length - 1)},${PAD.top + innerH} L ${toX(0)},${PAD.top + innerH} Z`
    : '';

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !data.length) return;
    const relX = ((e.clientX - rect.left) / rect.width) * W - PAD.left;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round((relX / innerW) * (data.length - 1))));
    setTip({ x: toX(idx), y: toY(data[idx].total), d: data[idx] });
  };

  const xStep = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 150 }}
        onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
        <defs>
          <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => {
          const v = Math.round(maxVal * f);
          return (
            <g key={f}>
              <line x1={PAD.left} y1={toY(v)} x2={PAD.left + innerW} y2={toY(v)}
                stroke="var(--border)" strokeWidth={0.7} strokeDasharray="4 3" />
              <text x={PAD.left - 4} y={toY(v) + 4} textAnchor="end" fontSize={8} fill="var(--text-muted)">{v}</text>
            </g>
          );
        })}
        {data.length >= 2 && (
          <>
            <path d={areaD} fill="url(#ug)" />
            <path d={bezierPath(pts)} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" />
          </>
        )}
        {data.map((_, i) => i % xStep === 0
          ? <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="var(--text-muted)">{data[i].date.slice(5)}</text>
          : null)}
        {tip && (
          <>
            <line x1={tip.x} y1={PAD.top} x2={tip.x} y2={PAD.top + innerH}
              stroke="var(--border)" strokeWidth={1} strokeDasharray="3 2" />
            <circle cx={tip.x} cy={tip.y} r={4} fill="#6366f1" stroke="white" strokeWidth={2} />
          </>
        )}
      </svg>
      {tip && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none
          bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 shadow-lg text-xs z-10">
          <div className="font-semibold text-[var(--text-primary)]">{tip.d.date}</div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-indigo-500">{tip.d.total} total</span>
            <span className="text-emerald-500">{tip.d.success} ok</span>
            {tip.d.failed > 0 && <span className="text-red-500">{tip.d.failed} failed</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, delta, trend, icon: Icon, gradient,
}: {
  label: string; value: string | number;
  delta?: string; trend?: 'up' | 'down' | 'flat';
  icon: React.ElementType; gradient: string;
}) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        {delta && trend && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
            trend === 'up'   ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
            trend === 'down' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'               :
                               'bg-[var(--surface-raised)] text-[var(--text-muted)]'
          }`}>
            {trend === 'up'   && <TrendingUp   className="w-2.5 h-2.5" />}
            {trend === 'down' && <TrendingDown  className="w-2.5 h-2.5" />}
            {trend === 'flat' && <Minus         className="w-2.5 h-2.5" />}
            {delta}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{value}</div>
        <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function UserDashboardPage() {
  const { user }        = useAuthStore();
  const { selectedApp } = useAppStore();

  const [stats, setStats]     = useState<AppStats | null>(null);
  const [plan, setPlan]       = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function fetchStats() {
    if (!selectedApp) return;
    setLoading(true); setError('');
    try {
      const [{ data: s }, planRes] = await Promise.all([
        client.get<AppStats>('/logs/stats'),
        user?.org_id
          ? client.get<{ plan: Plan | null }>('/orgs/me/plan').catch(() => ({ data: { plan: null } }))
          : Promise.resolve({ data: { plan: null } }),
      ]);
      setStats(s);
      setPlan(planRes.data.plan);
    } catch {
      setError('Failed to load stats');
    } finally { setLoading(false); }
  }

  useEffect(() => { void fetchStats(); }, [selectedApp?._id]);

  const emailTrend: 'up' | 'down' | 'flat' = !stats ? 'flat'
    : stats.emails_7d * 4 > stats.emails_30d * 1.1 ? 'up'
    : stats.emails_7d * 4 < stats.emails_30d * 0.9 ? 'down'
    : 'flat';

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }, []);

  const today = format(new Date(), 'EEE, MMM d yyyy');

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {selectedApp ? `Viewing ${selectedApp.app_name}` : 'Select an app to see your stats'} · {today}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {plan && (
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
              <CreditCard className="w-3.5 h-3.5" /> {plan.name}
            </span>
          )}
          <button onClick={() => void fetchStats()} disabled={loading || !selectedApp}
            className="btn-secondary gap-1.5 disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {!selectedApp ? (
          <div className="empty-state py-20">
            <LayoutGrid className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-3" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">No app selected</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Choose an app from the switcher in the sidebar</p>
            <Link to="/apps" className="btn-primary text-sm">Manage apps</Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {loading && !stats
                ? [...Array(4)].map((_, i) => <div key={i} className="card p-5 h-28 animate-pulse bg-[var(--surface-raised)]" />)
                : stats && (
                  <>
                    <KpiCard label="Templates" value={stats.total_templates}
                      gradient="from-brand-500 to-brand-700" icon={FileText} />
                    <KpiCard label="Emails sent (30d)" value={stats.emails_30d.toLocaleString()}
                      delta={`+${stats.emails_7d} this week`} trend={emailTrend}
                      gradient="from-indigo-500 to-violet-700" icon={Send} />
                    <KpiCard label="Success rate" value={`${stats.success_rate}%`}
                      gradient={stats.success_rate >= 95 ? 'from-emerald-500 to-teal-700' : stats.success_rate >= 80 ? 'from-amber-400 to-orange-600' : 'from-red-500 to-rose-700'}
                      icon={CheckCircle2} />
                    <KpiCard label="Failed (30d)" value={stats.chart.reduce((s, p) => s + p.failed, 0)}
                      gradient="from-slate-500 to-slate-700" icon={XCircle} />
                  </>
                )
              }
            </div>

            {/* Chart + Recent */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card p-5 lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Send Volume</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">Last 30 days · hover for details</div>
                  </div>
                </div>
                {stats && stats.chart.length > 0
                  ? <AppChart data={stats.chart} />
                  : <div className="h-36 flex items-center justify-center text-sm text-[var(--text-muted)]">
                      {loading ? 'Loading…' : 'No sends yet'}
                    </div>
                }
              </div>

              {/* Recent sends */}
              <div className="card">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Recent Sends</div>
                  <Link to="/logs" className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                    All <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {loading && !stats
                    ? [...Array(4)].map((_, i) => (
                        <div key={i} className="px-4 py-3 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[var(--surface-raised)] animate-pulse shrink-0" />
                          <div className="flex-1 h-2.5 rounded bg-[var(--surface-raised)] animate-pulse" />
                        </div>
                      ))
                    : stats?.recent_logs.length
                    ? stats.recent_logs.map((log) => {
                        const d = new Date(log.sent_at);
                        return (
                          <div key={log._id} className="px-4 py-3 flex items-center gap-2.5 hover:bg-[var(--surface-raised)] transition-colors">
                            {log.status === 'success'
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              : <XCircle      className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-[var(--text-primary)] truncate">{log.recipient}</div>
                              <div className="text-[10px] text-[var(--text-muted)]">{log.template_slug}</div>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] shrink-0">
                              {isValid(d) ? format(d, 'MMM d') : '—'}
                            </div>
                          </div>
                        );
                      })
                    : <div className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">No sends yet</div>
                  }
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { to: '/templates',   label: 'Templates',   Icon: FileText,    desc: 'Edit & create'   },
                { to: '/logs',        label: 'Send Logs',   Icon: Send,        desc: 'Full audit trail' },
                { to: '/schemas',     label: 'Schemas',     Icon: LayoutGrid,  desc: 'Payload schemas'  },
                { to: '/sdk-export',  label: 'SDK Export',  Icon: ArrowRight,  desc: 'Integration code' },
              ].map(({ to, label, Icon, desc }) => (
                <Link key={to} to={to}
                  className="card p-4 flex flex-col gap-2 hover:border-brand-400 hover:shadow-sm transition-all group cursor-pointer">
                  <Icon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)]">{label}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{desc}</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Plan upsell — regular users only, not superadmin */}
            {user?.role !== 'superadmin' && (!plan || plan.price_monthly === 0) && (
              <div className="card p-5 flex items-center gap-4 bg-gradient-to-r from-brand-50 to-violet-50 dark:from-brand-900/10 dark:to-violet-900/10 border-brand-200 dark:border-brand-800">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Upgrade your plan</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">Get more emails, AI features, and priority support</div>
                </div>
                <Link to="/pricing" className="btn-primary shrink-0 text-sm">View plans</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
