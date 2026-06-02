import { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, X, Loader2,
  Users, DollarSign, EyeOff,
} from 'lucide-react';
import client from '../api/client';
import type { Plan, PlanLimits } from '../types';

const EMPTY_LIMITS: PlanLimits = {
  max_apps: -1, max_emails_per_month: -1, max_members: -1,
  max_templates: -1, max_versions_per_template: -1,
  ai_enabled: false, custom_domain: false, priority_support: false,
};

const EMPTY_FORM = {
  name: '', slug: '', description: '', price_monthly: 0, price_yearly: 0,
  limits: { ...EMPTY_LIMITS }, features: '', badge: '',
  is_active: true, is_public: true, sort_order: 0,
};

type FormState = typeof EMPTY_FORM;

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-[var(--border)]'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function LimitField({
  label, field, limits, onChange,
}: {
  label: string;
  field: keyof Pick<PlanLimits, 'max_apps' | 'max_emails_per_month' | 'max_members' | 'max_templates' | 'max_versions_per_template'>;
  limits: PlanLimits;
  onChange: (f: keyof PlanLimits, v: unknown) => void;
}) {
  const val = limits[field] as number;
  const unlimited = val === -1;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label className="input-label">{label}</label>
        <input type="number" min={-1} value={unlimited ? '' : val} disabled={unlimited}
          placeholder={unlimited ? 'Unlimited' : ''}
          onChange={(e) => onChange(field, e.target.value === '' ? -1 : Number(e.target.value))}
          className="input disabled:opacity-50" />
      </div>
      <div className="mt-5 flex items-center gap-1.5">
        <Toggle on={unlimited} onChange={() => onChange(field, unlimited ? 10 : -1)} />
        <span className="text-xs text-[var(--text-muted)]">∞</span>
      </div>
    </div>
  );
}

function PlanModal({
  editing, onClose, onSaved,
}: { editing: Plan | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name, slug: editing.slug, description: editing.description,
        price_monthly: editing.price_monthly, price_yearly: editing.price_yearly,
        limits: { ...editing.limits }, features: editing.features.join('\n'),
        badge: editing.badge ?? '', is_active: editing.is_active,
        is_public: editing.is_public, sort_order: editing.sort_order,
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [editing]);

  const setF = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setL = (k: keyof PlanLimits, v: unknown) =>
    setForm((f) => ({ ...f, limits: { ...f.limits, [k]: v } }));

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSave = async () => {
    setSaving(true); setErr('');
    try {
      const body = {
        ...form,
        features: form.features.split('\n').map((s) => s.trim()).filter(Boolean),
      };
      if (editing) {
        await client.put(`/admin/plans/${editing._id}`, body);
      } else {
        await client.post('/admin/plans', body);
      }
      onSaved(); onClose();
    } catch (e) {
      setErr((e as Error).message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="card shadow-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)] z-10">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{editing ? 'Edit plan' : 'New plan'}</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Plan name</label>
              <input className="input" value={form.name}
                onChange={(e) => { setF('name', e.target.value); if (!editing) setF('slug', autoSlug(e.target.value)); }} />
            </div>
            <div>
              <label className="input-label">Slug</label>
              <input className="input font-mono" value={form.slug} onChange={(e) => setF('slug', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="input-label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setF('description', e.target.value)} />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="input-label">Monthly price (USD)</label>
              <input type="number" min={0} step={0.01} className="input" value={form.price_monthly}
                onChange={(e) => setF('price_monthly', Number(e.target.value))} />
            </div>
            <div>
              <label className="input-label">Yearly price (USD/mo)</label>
              <input type="number" min={0} step={0.01} className="input" value={form.price_yearly}
                onChange={(e) => setF('price_yearly', Number(e.target.value))} />
            </div>
            <div>
              <label className="input-label">Sort order</label>
              <input type="number" className="input" value={form.sort_order}
                onChange={(e) => setF('sort_order', Number(e.target.value))} />
            </div>
          </div>

          {/* Limits */}
          <div className="p-4 bg-[var(--surface-raised)] rounded-xl space-y-3">
            <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Limits</div>
            <div className="grid grid-cols-2 gap-4">
              <LimitField label="Max apps"               field="max_apps"                   limits={form.limits} onChange={setL} />
              <LimitField label="Max emails / month"     field="max_emails_per_month"       limits={form.limits} onChange={setL} />
              <LimitField label="Max members"            field="max_members"                limits={form.limits} onChange={setL} />
              <LimitField label="Max templates"          field="max_templates"              limits={form.limits} onChange={setL} />
              <LimitField label="Max versions / template" field="max_versions_per_template" limits={form.limits} onChange={setL} />
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              {([
                { k: 'ai_enabled' as const,       label: 'AI features' },
                { k: 'custom_domain' as const,     label: 'Custom domain' },
                { k: 'priority_support' as const,  label: 'Priority support' },
              ]).map(({ k, label }) => (
                <div key={k} className="flex items-center justify-between p-2.5 bg-[var(--surface)] rounded-lg">
                  <span className="text-xs text-[var(--text-primary)]">{label}</span>
                  <Toggle on={form.limits[k] as boolean} onChange={() => setL(k, !form.limits[k])} />
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="input-label">Features <span className="font-normal text-[var(--text-muted)]">(one per line)</span></label>
            <textarea className="input resize-none" rows={5} value={form.features}
              onChange={(e) => setF('features', e.target.value)}
              placeholder="Unlimited templates&#10;24/7 support&#10;99.9% uptime SLA" />
          </div>

          {/* Badge + toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Badge label <span className="font-normal text-[var(--text-muted)]">(optional)</span></label>
              <input className="input" value={form.badge} onChange={(e) => setF('badge', e.target.value)}
                placeholder="Most Popular" />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              {([
                { k: 'is_active' as const, label: 'Active' },
                { k: 'is_public' as const, label: 'Shown on /pricing' },
              ]).map(({ k, label }) => (
                <div key={k} className="flex items-center justify-between p-2.5 bg-[var(--surface-raised)] rounded-lg">
                  <span className="text-sm text-[var(--text-primary)]">{label}</span>
                  <Toggle on={form[k] as boolean} onChange={() => setF(k, !form[k])} />
                </div>
              ))}
            </div>
          </div>

          {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--border)]">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, onEdit, onDelete }: { plan: Plan; onEdit: () => void; onDelete: () => void }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delErr, setDelErr] = useState('');

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true);
    try { await client.delete(`/admin/plans/${plan._id}`); onDelete(); }
    catch (e) { setDelErr((e as Error).message || 'Delete failed'); setDeleting(false); setConfirmDel(false); }
  };

  const fmt = (v: number) => v === -1 ? '∞' : v.toLocaleString();
  const free = plan.price_monthly === 0;

  return (
    <div className={`card p-5 space-y-4 ${!plan.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[var(--text-primary)]">{plan.name}</span>
            {plan.badge && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400">
                {plan.badge}
              </span>
            )}
            {!plan.is_active && <span className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--border)] text-[var(--text-muted)]">Inactive</span>}
            {!plan.is_public && (
              <span title="Hidden from pricing page" className="text-[var(--text-muted)]"><EyeOff className="w-3.5 h-3.5" /></span>
            )}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{plan.slug}</div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="btn-ghost p-1.5" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => void handleDelete()}
            className={`btn-ghost p-1.5 ${confirmDel ? 'text-red-500' : ''}`}
            title={confirmDel ? 'Click again to confirm' : 'Delete'}
            disabled={deleting}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-[var(--text-primary)]">
          {free ? 'Free' : `$${plan.price_monthly}`}
        </span>
        {!free && <span className="text-xs text-[var(--text-muted)]">/mo</span>}
        {!free && plan.price_yearly > 0 && (
          <span className="text-xs text-[var(--text-muted)] ml-1">· ${plan.price_yearly}/mo yearly</span>
        )}
      </div>

      {/* Limits chips */}
      <div className="flex flex-wrap gap-1.5">
        {[
          `${fmt(plan.limits.max_apps)} apps`,
          `${fmt(plan.limits.max_emails_per_month)} emails/mo`,
          `${fmt(plan.limits.max_members)} members`,
          plan.limits.max_versions_per_template === 0
            ? 'No versioning'
            : `${fmt(plan.limits.max_versions_per_template)} versions/template`,
        ].map((l) => (
          <span key={l} className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--surface-raised)] text-[var(--text-secondary)]">{l}</span>
        ))}
        {plan.limits.ai_enabled      && <span className="px-2 py-0.5 text-[10px] rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">AI</span>}
        {plan.limits.priority_support && <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Priority support</span>}
        {plan.limits.custom_domain    && <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Custom domain</span>}
      </div>

      {/* Subscribers */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <Users className="w-3.5 h-3.5" />
        {(plan.subscriber_count ?? 0).toLocaleString()} subscriber{plan.subscriber_count !== 1 ? 's' : ''}
      </div>

      {delErr && <p className="text-xs text-red-600 dark:text-red-400">{delErr}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminPlansPage() {
  const [plans, setPlans]     = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try { const { data } = await client.get<Plan[]>('/admin/plans'); setPlans(data); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchPlans(); }, []);

  const mrr = plans.reduce((s, p) => s + (p.subscriber_count ?? 0) * p.price_monthly, 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto">
      <div className="px-6 py-4 border-b border-[var(--border)] shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Plans</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Manage pricing tiers · Est. MRR{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              ${mrr.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </span>
          </p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New plan
        </button>
      </div>

      <div className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : plans.length === 0 ? (
          <div className="empty-state py-20">
            <DollarSign className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-3" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">No plans yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Create your first pricing tier</p>
            <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
              <Plus className="w-3.5 h-3.5" /> Create plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <PlanCard key={plan._id} plan={plan}
                onEdit={() => { setEditing(plan); setShowModal(true); }}
                onDelete={() => void fetchPlans()} />
            ))}

            {/* Summary card */}
            <div className="card p-5 border-dashed flex flex-col items-center justify-center gap-2 text-center min-h-[200px]">
              <div className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                ${mrr.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Est. MRR across {plans.reduce((s, p) => s + (p.subscriber_count ?? 0), 0)} subscribers</div>
              <div className="flex items-center gap-1.5 mt-2">
                {plans.map((p) => (
                  <div key={p._id} title={`${p.name}: ${p.subscriber_count ?? 0}`}
                    className="w-2 h-2 rounded-full bg-brand-500 opacity-80"
                    style={{ width: `${Math.max(8, ((p.subscriber_count ?? 0) / Math.max(1, plans.reduce((s, x) => s + (x.subscriber_count ?? 0), 0))) * 48)}px`, height: 8 }} />
                ))}
              </div>
              <div className="flex items-center gap-1 mt-1 flex-wrap justify-center">
                {plans.filter((p) => (p.subscriber_count ?? 0) > 0).map((p) => (
                  <span key={p._id} className="text-[10px] text-[var(--text-muted)]">
                    {p.name} {p.subscriber_count}
                  </span>
                ))}
              </div>
              <button onClick={() => { setEditing(null); setShowModal(true); }}
                className="btn-secondary mt-2 text-xs gap-1">
                <Plus className="w-3 h-3" /> Add plan
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <PlanModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => void fetchPlans()}
        />
      )}
    </div>
  );
}
