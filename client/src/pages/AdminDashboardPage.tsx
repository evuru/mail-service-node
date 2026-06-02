import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Building2, LayoutGrid, Send, TrendingUp, TrendingDown,
  Minus, RefreshCw, ArrowRight, CheckCircle2, XCircle, MinusCircle,
  DollarSign, CreditCard,
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import client from '../api/client';
import type { DashboardData, DashboardChartPoint, FinanceData } from '../types';

// ─── Smooth SVG line chart with hover tooltip ─────────────────────────────────

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

function LineChart({ data }: { data: DashboardChartPoint[] }) {
  const W = 800; const H = 180; const PAD = { top: 20, right: 16, bottom: 36, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; d: DashboardChartPoint } | null>(null);

  const maxVal = useMemo(() => Math.max(...data.map((d) => d.total), 1), [data]);
  const toX = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * innerW;
  const toY = (v: number) => PAD.top + innerH - (v / maxVal) * innerH;

  const totalPts = useMemo((): [number, number][] => data.map((d, i) => [toX(i), toY(d.total)]), [data]);
  const successPts = useMemo((): [number, number][] => data.map((d, i) => [toX(i), toY(d.success)]), [data]);

  const areaD = useMemo(() => {
    if (data.length < 2) return '';
    return `${bezierPath(totalPts)} L ${toX(data.length - 1)},${PAD.top + innerH} L ${toX(0)},${PAD.top + innerH} Z`;
  }, [totalPts, data.length]);

  const yTicks = [0, 0.33, 0.66, 1].map((f) => Math.round(maxVal * f));
  const xLabelEvery = Math.max(1, Math.floor(data.length / 7));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !data.length) return;
    const relX = ((e.clientX - rect.left) / rect.width) * W - PAD.left;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round((relX / innerW) * (data.length - 1))));
    setTooltip({ x: toX(idx), y: toY(data[idx].total), d: data[idx] });
  };

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
        <defs>
          <linearGradient id="agrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} y1={toY(v)} x2={PAD.left + innerW} y2={toY(v)}
              stroke="var(--border)" strokeWidth={0.7} strokeDasharray="4 3" />
            <text x={PAD.left - 6} y={toY(v) + 4} textAnchor="end" fontSize={9} fill="var(--text-muted)">{v}</text>
          </g>
        ))}

        {data.length >= 2 && (
          <>
            <path d={areaD} fill="url(#agrad)" />
            <path d={bezierPath(totalPts)} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" />
            <path d={bezierPath(successPts)} fill="none" stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 3" strokeLinecap="round" />
          </>
        )}

        {data.map((_, i) => i % xLabelEvery === 0 ? (
          <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
            {data[i].date.slice(5)}
          </text>
        ) : null)}

        {tooltip && (
          <>
            <line x1={tooltip.x} y1={PAD.top} x2={tooltip.x} y2={PAD.top + innerH}
              stroke="var(--border)" strokeWidth={1} strokeDasharray="3 2" />
            <circle cx={tooltip.x} cy={tooltip.y} r={4} fill="#6366f1" stroke="white" strokeWidth={2} />
          </>
        )}
      </svg>

      {tooltip && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none
          bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg text-xs z-10">
          <div className="font-semibold text-[var(--text-primary)] mb-1">{tooltip.d.date}</div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> {tooltip.d.total} total</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> {tooltip.d.success} ok</span>
            {tooltip.d.failed > 0 && <span className="text-red-500">{tooltip.d.failed} failed</span>}
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
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {delta && trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend === 'up'   ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
            trend === 'down' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'               :
                               'bg-[var(--surface-raised)] text-[var(--text-muted)]'
          }`}>
            {trend === 'up'   && <TrendingUp   className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown  className="w-3 h-3" />}
            {trend === 'flat' && <Minus         className="w-3 h-3" />}
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

// ─── Finance mini bar ─────────────────────────────────────────────────────────

function DistBar({ data }: { data: { plan_id?: string; name: string; count: number; revenue: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const colors = ['bg-brand-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500', 'bg-slate-400'];
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={d.plan_id ?? i}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-primary)] font-medium">{d.name}</span>
            <span className="text-[var(--text-muted)]">{d.count} org{d.count !== 1 ? 's' : ''} · ${d.revenue}/mo</span>
          </div>
          <div className="h-1.5 bg-[var(--surface-raised)] rounded-full overflow-hidden">
            <div className={`h-full ${colors[i % colors.length]} rounded-full`}
              style={{ width: `${(d.count / total) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminDashboardPage() {
  const [data, setData]         = useState<DashboardData | null>(null);
  const [finance, setFinance]   = useState<FinanceData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  async function fetchAll() {
    setLoading(true); setError('');
    try {
      const [{ data: d }, { data: f }] = await Promise.all([
        client.get<DashboardData>('/admin/dashboard'),
        client.get<FinanceData>('/admin/plans/finance'),
      ]);
      setData(d); setFinance(f);
    } catch {
      setError('Failed to load dashboard data');
    } finally { setLoading(false); }
  }

  useEffect(() => { void fetchAll(); }, []);

  const emailTrend: 'up' | 'down' | 'flat' = !data ? 'flat'
    : data.stats.emails_7d * 4 > data.stats.emails_30d * 1.1 ? 'up'
    : data.stats.emails_7d * 4 < data.stats.emails_30d * 0.9 ? 'down'
    : 'flat';

  const today = format(new Date(), 'EEE, MMM d yyyy');

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Admin Overview</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{today} · Platform-wide metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/plans" className="btn-secondary gap-1.5 text-xs">
            <CreditCard className="w-3.5 h-3.5" /> Manage Plans
          </Link>
          <button onClick={() => void fetchAll()} disabled={loading} className="btn-secondary gap-1.5 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading && !data
            ? [...Array(4)].map((_, i) => <div key={i} className="card p-5 h-28 animate-pulse bg-[var(--surface-raised)]" />)
            : data && (
              <>
                <KpiCard label="Total Users"      value={data.stats.total_users} gradient="from-brand-500 to-brand-700"    icon={Users}    />
                <KpiCard label="Organisations"    value={data.stats.total_orgs}  gradient="from-violet-500 to-purple-700"  icon={Building2} />
                <KpiCard label="Email Apps"       value={data.stats.total_apps}  gradient="from-amber-400 to-orange-600"   icon={LayoutGrid} />
                <KpiCard label="Emails sent (30d)"
                  value={data.stats.emails_30d.toLocaleString()}
                  delta={`${data.stats.emails_7d} this week`}
                  trend={emailTrend}
                  gradient="from-emerald-500 to-teal-700"
                  icon={Send} />
              </>
            )
          }
        </div>

        {/* Finance KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading && !finance
            ? [...Array(4)].map((_, i) => <div key={i} className="card p-5 h-24 animate-pulse bg-[var(--surface-raised)]" />)
            : finance && (
              <>
                <KpiCard label="Est. MRR"      value={`$${finance.mrr.toLocaleString()}`}  gradient="from-emerald-500 to-green-700"  icon={DollarSign} />
                <KpiCard label="Est. ARR"       value={`$${finance.arr.toLocaleString()}`}  gradient="from-teal-500 to-cyan-700"      icon={TrendingUp}  />
                <KpiCard label="Paid Orgs"      value={finance.paid_orgs}                   gradient="from-indigo-500 to-blue-700"    icon={Building2}   />
                <KpiCard label="Paid Apps"      value={finance.paid_apps}                   gradient="from-pink-500 to-rose-700"      icon={LayoutGrid}  />
              </>
            )
          }
        </div>

        {/* Chart + Finance distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">Email Volume — last 30 days</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">Hover for details</div>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-indigo-500 inline-block rounded" /> Total</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 inline-block rounded border-dashed border-t-2 border-emerald-500" style={{ background: 'none' }} /> Success</span>
              </div>
            </div>
            {data && data.chart.length > 0
              ? <LineChart data={data.chart} />
              : <div className="h-44 flex items-center justify-center text-sm text-[var(--text-muted)]">
                  {loading ? 'Loading…' : 'No data for the last 30 days'}
                </div>
            }
          </div>

          <div className="card p-5">
            <div className="text-sm font-semibold text-[var(--text-primary)] mb-4">Plan Distribution</div>
            {finance && finance.distribution.length > 0
              ? <DistBar data={finance.distribution} />
              : <p className="text-sm text-[var(--text-muted)]">{loading ? 'Loading…' : 'No plan data'}</p>
            }
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <Link to="/admin/plans" className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                Manage plans <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent logs + Quick links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="text-sm font-semibold text-[var(--text-primary)]">Recent Activity</div>
              <Link to="/logs" className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                All logs <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {loading && !data
                ? [...Array(5)].map((_, i) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full bg-[var(--surface-raised)] animate-pulse shrink-0" />
                      <div className="flex-1 h-3 rounded bg-[var(--surface-raised)] animate-pulse" />
                      <div className="w-20 h-3 rounded bg-[var(--surface-raised)] animate-pulse" />
                    </div>
                  ))
                : data?.recent_logs.length
                ? data.recent_logs.map((log) => {
                    const d = new Date(log.sent_at);
                    return (
                      <div key={log._id} className="px-5 py-3 flex items-center gap-3 hover:bg-[var(--surface-raised)] transition-colors">
                        {log.status === 'success'
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          : log.status === 'failed'
                          ? <XCircle      className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          : <MinusCircle  className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-[var(--text-primary)] truncate">{log.recipient}</div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate">
                            {log.template_slug}{log.app_name ? ` · ${log.app_name}` : ''}
                          </div>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] shrink-0">
                          {isValid(d) ? format(d, 'MMM d, HH:mm') : '—'}
                        </div>
                      </div>
                    );
                  })
                : <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">No recent activity</div>
              }
            </div>
          </div>

          <div className="card p-5">
            <div className="text-sm font-semibold text-[var(--text-primary)] mb-4">Admin Actions</div>
            <div className="space-y-1.5">
              {[
                { to: '/admin/plans',       label: 'Manage Plans',     desc: 'Tiers, pricing, limits'     },
                { to: '/users',             label: 'Users',            desc: 'View, edit, disable'        },
                { to: '/platform-settings', label: 'Platform Config',  desc: 'AI, mailers, verification'  },
                { to: '/templates',         label: 'Templates',        desc: 'Global template library'    },
                { to: '/logs',              label: 'All Send Logs',    desc: 'Audit trail'                },
              ].map((item) => (
                <Link key={item.to} to={item.to}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--surface-raised)] transition-colors group">
                  <div>
                    <div className="text-xs font-medium text-[var(--text-primary)] group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">{item.desc}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
