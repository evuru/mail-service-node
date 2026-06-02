import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput } from '../components/PasswordInput';
import {
  Camera, Building2, UserPlus, Trash2, Shield,
  Cpu, CheckCircle, XCircle, Lock,
  ShieldCheck, Server, LogOut, Pencil, X,
  CreditCard, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useOrgStore } from '../store/orgStore';
import { Header } from '../components/Header';
import { Badge } from '../components/Badge';
import { ConfirmModal } from '../components/ConfirmModal';
import client from '../api/client';
import type { User, LlmProvider, Plan, OrgPlanUsage } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'account' | 'organisation' | 'advanced' | 'system';

interface HealthData { status: string; env: string; node_env: string; timestamp: string; }

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button" onClick={onChange}
      className={`relative inline-flex h-[22px] w-10 items-center rounded-full shrink-0 transition-colors ${enabled ? 'bg-brand-600' : 'bg-[var(--border)]'}`}
    >
      <span className={`absolute left-[3px] h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-0'}`} />
    </button>
  );
}

function FeedbackMsg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
      msg.ok
        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
    }`}>
      {msg.ok ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
      {msg.text}
    </div>
  );
}

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  POST:   'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-400',
  PUT:    'bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-400',
  DELETE: 'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-400',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const orgLogoInputRef = useRef<HTMLInputElement>(null);

  const {
    org, members, orgLlm, orgVerification,
    fetchOrg, fetchMembers, updateOrg,
    inviteMember, updateMember, removeMember,
    fetchOrgLlm, saveOrgLlm, testOrgLlm,
    fetchOrgVerification, saveOrgVerification,
  } = useOrgStore();

  const isOrgMember = !!user?.org_id;
  const isOrgAdmin  = !!user?.is_org_admin;

  // Derive available tabs based on role
  const tabs: { id: Tab; label: string }[] = [
    { id: 'account',      label: 'Account' },
    ...(isOrgMember ? [{ id: 'organisation' as Tab, label: 'Organisation' }] : []),
    ...(isOrgAdmin  ? [{ id: 'advanced'     as Tab, label: 'Advanced' }] : []),
    { id: 'system',       label: 'System' },
  ];

  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ── Account state ──────────────────────────────────────────────────────────
  const [password,      setPassword]      = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg,   setPasswordMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  // ── Organisation state ─────────────────────────────────────────────────────
  const [editingOrg,  setEditingOrg]  = useState(false);
  const [orgName,     setOrgName]     = useState('');
  const [orgSaving,   setOrgSaving]   = useState(false);
  const [orgMsg,      setOrgMsg]      = useState<{ ok: boolean; text: string } | null>(null);

  // ── Plan state ─────────────────────────────────────────────────────────────
  const [orgPlan,       setOrgPlan]       = useState<Plan | null>(null);
  const [orgUsage,      setOrgUsage]      = useState<OrgPlanUsage | null>(null);
  const [publicPlans,   setPublicPlans]   = useState<Plan[]>([]);
  const [planLoading,   setPlanLoading]   = useState(false);
  const [planChanging,  setPlanChanging]  = useState(false);
  const [planMsg,       setPlanMsg]       = useState<{ ok: boolean; text: string } | null>(null);
  const [showPlanPicker, setShowPlanPicker] = useState(false);

  // ── Members state ──────────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteAdmin, setInviteAdmin] = useState(false);
  const [inviting,    setInviting]    = useState(false);
  const [inviteMsg,   setInviteMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  // ── AI / Verification state ────────────────────────────────────────────────
  const [requirePhone,  setRequirePhone]  = useState(false);
  const [verifySaving,  setVerifySaving]  = useState(false);
  const [verifyMsg,     setVerifyMsg]     = useState<{ ok: boolean; text: string } | null>(null);
  const [llmProvider,   setLlmProvider]   = useState<LlmProvider>('gemini');
  const [llmModel,      setLlmModel]      = useState('');
  const [llmBaseUrl,    setLlmBaseUrl]    = useState('');
  const [llmEnabled,    setLlmEnabled]    = useState(false);
  const [llmApiKey,     setLlmApiKey]     = useState('');
  const [llmSaving,     setLlmSaving]     = useState(false);
  const [llmTesting,    setLlmTesting]    = useState(false);
  const [llmMsg,        setLlmMsg]        = useState<{ ok: boolean; text: string } | null>(null);

  // ── System state ───────────────────────────────────────────────────────────
  const [health,      setHealth]      = useState<HealthData | null>(null);
  const [healthError, setHealthError] = useState('');

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/health').then((r) => r.json()).then(setHealth).catch(() => setHealthError('Could not reach server'));
  }, []);

  useEffect(() => {
    if (user?.org_id) { void fetchOrg(); void fetchMembers(); }
  }, [user?.org_id, fetchOrg, fetchMembers]);

  useEffect(() => {
    if (isOrgAdmin && user?.org_id) { void fetchOrgLlm(); void fetchOrgVerification(); }
  }, [isOrgAdmin, user?.org_id, fetchOrgLlm, fetchOrgVerification]);

  useEffect(() => {
    if (!user?.org_id) return;
    setPlanLoading(true);
    Promise.all([
      client.get<{ plan: Plan | null; usage: OrgPlanUsage }>('/orgs/me/plan'),
      client.get<Plan[]>('/plans'),
    ]).then(([planRes, plansRes]) => {
      setOrgPlan(planRes.data.plan);
      setOrgUsage(planRes.data.usage);
      setPublicPlans(plansRes.data);
    }).catch(() => {}).finally(() => setPlanLoading(false));
  }, [user?.org_id]);

  useEffect(() => { if (org) setOrgName(org.name); }, [org]);
  useEffect(() => { if (orgVerification) setRequirePhone(orgVerification.require_phone); }, [orgVerification]);
  useEffect(() => {
    if (orgLlm) {
      setLlmProvider(orgLlm.provider); setLlmModel(orgLlm.model);
      setLlmBaseUrl(orgLlm.base_url);  setLlmEnabled(orgLlm.enabled);
    }
  }, [orgLlm]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const flash = (set: React.Dispatch<React.SetStateAction<{ ok: boolean; text: string } | null>>, msg: { ok: boolean; text: string }) => {
    set(msg); setTimeout(() => set(null), 3000);
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setPasswordSaving(true); setPasswordMsg(null);
    try {
      const res = await client.put<{ token: string; user: User }>('/auth/me', { password });
      setAuth(res.data.token, res.data.user); setPassword('');
      flash(setPasswordMsg, { ok: true, text: 'Password updated' });
    } catch (err) { setPasswordMsg({ ok: false, text: (err as Error).message }); }
    finally { setPasswordSaving(false); }
  };

  const handleOrgLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 300_000) { setOrgMsg({ ok: false, text: 'Logo must be under 300 KB' }); return; }
    const base64 = await fileToBase64(file);
    setOrgSaving(true); setOrgMsg(null);
    try { await updateOrg({ logo_base64: base64 }); flash(setOrgMsg, { ok: true, text: 'Logo updated' }); }
    catch (err) { setOrgMsg({ ok: false, text: (err as Error).message }); }
    finally { setOrgSaving(false); }
  };

  const saveOrg = async () => {
    setOrgSaving(true); setOrgMsg(null);
    try { await updateOrg({ name: orgName }); setEditingOrg(false); flash(setOrgMsg, { ok: true, text: 'Organisation saved' }); }
    catch (err) { setOrgMsg({ ok: false, text: (err as Error).message }); }
    finally { setOrgSaving(false); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault(); setInviting(true); setInviteMsg(null);
    try { await inviteMember(inviteEmail, inviteAdmin); setInviteEmail(''); setInviteAdmin(false); flash(setInviteMsg, { ok: true, text: `Invite sent to ${inviteEmail}` }); }
    catch (err) { setInviteMsg({ ok: false, text: (err as Error).message }); }
    finally { setInviting(false); }
  };

  const changePlan = async (planId: string | null) => {
    setPlanChanging(true); setPlanMsg(null);
    try {
      await client.post('/orgs/me/plan', { plan_id: planId });
      const res = await client.get<{ plan: Plan | null; usage: OrgPlanUsage }>('/orgs/me/plan');
      setOrgPlan(res.data.plan);
      setOrgUsage(res.data.usage);
      setShowPlanPicker(false);
      flash(setPlanMsg, { ok: true, text: planId ? 'Plan updated' : 'Downgraded to free plan' });
    } catch (err) { flash(setPlanMsg, { ok: false, text: (err as Error).message }); }
    finally { setPlanChanging(false); }
  };

  const saveVerification = async () => {
    setVerifySaving(true); setVerifyMsg(null);
    try { await saveOrgVerification({ require_phone: requirePhone }); flash(setVerifyMsg, { ok: true, text: 'Verification settings saved' }); }
    catch (err) { setVerifyMsg({ ok: false, text: (err as Error).message }); }
    finally { setVerifySaving(false); }
  };

  const saveLlm = async (e: React.FormEvent) => {
    e.preventDefault(); setLlmSaving(true); setLlmMsg(null);
    try {
      const payload: Record<string, unknown> = { provider: llmProvider, model: llmModel, base_url: llmBaseUrl, enabled: llmEnabled };
      if (llmApiKey) payload.api_key = llmApiKey;
      await saveOrgLlm(payload as Parameters<typeof saveOrgLlm>[0]);
      setLlmApiKey(''); flash(setLlmMsg, { ok: true, text: 'AI configuration saved' });
    } catch (err) { setLlmMsg({ ok: false, text: (err as Error).message }); }
    finally { setLlmSaving(false); }
  };

  const handleTestLlm = async () => {
    setLlmTesting(true); setLlmMsg(null);
    try { const reply = await testOrgLlm(); flash(setLlmMsg, { ok: true, text: `OK — "${reply}"` }); }
    catch (err) { setLlmMsg({ ok: false, text: (err as Error).message }); }
    finally { setLlmTesting(false); }
  };

  if (!user) return null;
  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <>
      <Header />
      <main className="page-content">
        <div className="max-w-2xl">

          {/* ── Tab bar ───────────────────────────────────────────────── */}
          <div className="flex gap-0 border-b border-[var(--border)] mb-6">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === t.id
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ACCOUNT TAB                                                 */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'account' && (
            <div className="space-y-4">

              {/* Identity card */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Your account</h3>
                  <Link to="/profile" className="btn-secondary text-xs py-1 px-2.5">
                    <Pencil className="w-3 h-3" /> Edit profile
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
                  <div className="px-5 py-4 flex items-center gap-3 sm:col-span-1">
                    {user.profile_image_base64 ? (
                      <img src={user.profile_image_base64} alt="Profile" className="w-10 h-10 rounded-xl object-cover border border-[var(--border)] shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-base font-bold text-brand-600 dark:text-brand-400 shrink-0">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-[var(--text-primary)] truncate">{user.name || '—'}</div>
                      <div className="text-xs text-[var(--text-muted)] truncate">{user.email}</div>
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">Role</p>
                    <Badge variant={user.role === 'superadmin' ? 'info' : 'neutral'}>
                      {user.role === 'superadmin' ? 'Superadmin' : 'User'}
                    </Badge>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">Membership</p>
                    {user.org_id ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                        <Building2 className="w-3.5 h-3.5" />
                        {isOrgAdmin ? 'Org admin' : 'Org member'}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">No organisation</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Change password */}
              <div className="card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--border)]">
                  <Lock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Change password</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <FeedbackMsg msg={passwordMsg} />
                  <form onSubmit={savePassword} className="space-y-3">
                    <div>
                      <label className="input-label">New password</label>
                      <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)}
                        required minLength={8} className="input max-w-sm" placeholder="Min. 8 characters" />
                    </div>
                    <button type="submit" disabled={passwordSaving || !password} className="btn-primary disabled:opacity-50">
                      {passwordSaving ? 'Updating…' : 'Update password'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Danger zone */}
              <div className="card overflow-hidden border-red-200 dark:border-red-800">
                <div className="px-5 py-3.5 border-b border-red-200 dark:border-red-800">
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger zone</h3>
                </div>
                <div className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Sign out</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">You will be redirected to the login page</p>
                  </div>
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="btn-danger text-sm"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ORGANISATION TAB                                            */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'organisation' && isOrgMember && (
            <div className="space-y-4">

              {/* Org identity */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Organisation details</h3>
                  {isOrgAdmin && !editingOrg && (
                    <button onClick={() => setEditingOrg(true)} className="btn-secondary text-xs py-1 px-2.5">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  )}
                  {isOrgAdmin && editingOrg && (
                    <button onClick={() => { setEditingOrg(false); if (org) setOrgName(org.name); }} className="btn-ghost text-xs py-1 px-2.5">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  )}
                </div>

                {orgMsg && <div className="mx-5 mt-4"><FeedbackMsg msg={orgMsg} /></div>}

                {!editingOrg ? (
                  <div className="px-5 py-4 flex items-center gap-4">
                    {org?.logo_base64 ? (
                      <img src={org.logo_base64} alt="Logo" className="w-14 h-14 rounded-xl object-cover border border-[var(--border)] shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center border border-[var(--border)] shrink-0">
                        <Building2 className="w-6 h-6 text-[var(--text-muted)]" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">{org?.name}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">/{org?.slug}</div>
                      {isOrgAdmin && <span className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 mt-1"><ShieldCheck className="w-3 h-3" /> You are an admin</span>}
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="relative group shrink-0">
                        {org?.logo_base64 ? (
                          <img src={org.logo_base64} alt="Logo" className="w-14 h-14 rounded-xl object-cover border border-[var(--border)]" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center border border-[var(--border)]">
                            <Building2 className="w-6 h-6 text-[var(--text-muted)]" />
                          </div>
                        )}
                        <button onClick={() => orgLogoInputRef.current?.click()} disabled={orgSaving}
                          className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Camera className="w-4 h-4 text-white" />
                        </button>
                        <input ref={orgLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handleOrgLogoChange} />
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">Click the logo to upload a new one. Max 300 KB.</p>
                    </div>
                    <div>
                      <label className="input-label">Organisation name</label>
                      <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="input max-w-sm" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveOrg} disabled={orgSaving || !orgName.trim()} className="btn-primary disabled:opacity-50">
                        {orgSaving ? 'Saving…' : 'Save changes'}
                      </button>
                      <button onClick={() => { setEditingOrg(false); if (org) setOrgName(org.name); }} className="btn-secondary">Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Members */}
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--border)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Members
                    <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">{members.length}</span>
                  </h3>
                </div>

                <div className="divide-y divide-[var(--border)]">
                  {members.map((m) => (
                    <div key={m._id} className="flex items-center gap-3 px-5 py-3">
                      {m.profile_image_base64 ? (
                        <img src={m.profile_image_base64} alt={m.name || m.email} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-600 dark:text-brand-400 shrink-0">
                          {(m.name || m.email || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-[var(--text-primary)] truncate">{m.name || '—'}</span>
                          {m._id === user._id && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-semibold">You</span>
                          )}
                          {m.is_org_admin && (
                            <span title="Org admin"><Shield className="w-3.5 h-3.5 text-brand-500 shrink-0" /></span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] truncate">{m.email}</div>
                      </div>
                      {isOrgAdmin && m._id !== user._id && (
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => updateMember(m._id, !m.is_org_admin)} className="btn-ghost text-xs py-1 px-2">
                            {m.is_org_admin ? 'Demote' : 'Make admin'}
                          </button>
                          <button
                            onClick={() => { if (confirm(`Remove ${m.name || m.email} from the org?`)) void removeMember(m._id); }}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {isOrgAdmin && (
                  <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-raised)]">
                    <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Invite by email</p>
                    <FeedbackMsg msg={inviteMsg} />
                    <form onSubmit={handleInvite} className="flex gap-2 mt-2">
                      <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                        required placeholder="colleague@example.com" className="input flex-1" />
                      <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] whitespace-nowrap cursor-pointer select-none">
                        <input type="checkbox" checked={inviteAdmin} onChange={(e) => setInviteAdmin(e.target.checked)} className="accent-brand-600" />
                        Admin
                      </label>
                      <button type="submit" disabled={inviting} className="btn-primary disabled:opacity-50">
                        <UserPlus className="w-4 h-4" />
                        {inviting ? 'Adding…' : 'Invite'}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Plan */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Plan &amp; usage</h3>
                  </div>
                  {isOrgAdmin && publicPlans.length > 0 && (
                    <button onClick={() => setShowPlanPicker((v) => !v)}
                      className="btn-secondary text-xs py-1 px-2.5">
                      {showPlanPicker ? 'Cancel' : 'Change plan'}
                    </button>
                  )}
                </div>

                <div className="px-5 py-4 space-y-4">
                  {planMsg && <FeedbackMsg msg={planMsg} />}

                  {planLoading ? (
                    <div className="h-8 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${
                        orgPlan ? 'from-brand-500 to-violet-600' : 'from-slate-400 to-slate-600'
                      }`}>
                        <CreditCard className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                          {orgPlan ? orgPlan.name : 'Free'}
                          {orgPlan?.badge && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-semibold">
                              {orgPlan.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          {orgPlan
                            ? `$${orgPlan.price_monthly}/mo · ${orgPlan.description}`
                            : 'No paid plan — limited features'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Usage bars */}
                  {orgUsage && orgPlan && (
                    <div className="space-y-2.5 pt-1">
                      {([
                        { label: 'Members',        used: orgUsage.member_count,   max: orgPlan.limits.max_members },
                        { label: 'Apps',            used: orgUsage.app_count,      max: orgPlan.limits.max_apps },
                        { label: 'Templates',       used: orgUsage.template_count, max: orgPlan.limits.max_templates },
                        { label: 'Emails (30d)',    used: orgUsage.emails_month,   max: orgPlan.limits.max_emails_per_month },
                      ] as { label: string; used: number; max: number }[]).map(({ label, used, max }) => {
                        const pct = max === -1 ? 0 : Math.min(100, Math.round((used / Math.max(max, 1)) * 100));
                        const over = max !== -1 && used >= max;
                        return (
                          <div key={label}>
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-[var(--text-muted)]">{label}</span>
                              <span className={`font-medium ${over ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}>
                                {used.toLocaleString()} {max === -1 ? '/ ∞' : `/ ${max.toLocaleString()}`}
                              </span>
                            </div>
                            {max !== -1 && (
                              <div className="h-1.5 rounded-full bg-[var(--surface-raised)] overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-brand-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Plan picker */}
                  {showPlanPicker && (
                    <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                      <p className="text-xs font-medium text-[var(--text-muted)]">Select a plan</p>
                      {publicPlans.map((p) => (
                        <button
                          key={p._id}
                          disabled={planChanging || orgPlan?._id === p._id}
                          onClick={() => void changePlan(p._id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                            ${orgPlan?._id === p._id
                              ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20'
                              : 'border-[var(--border)] hover:border-brand-300 hover:bg-[var(--surface-raised)]'}
                            disabled:opacity-50`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[var(--text-primary)]">{p.name}</span>
                              {p.badge && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                                  {p.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] mt-0.5">{p.description}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-sm font-bold text-[var(--text-primary)]">${p.price_monthly}<span className="font-normal text-xs text-[var(--text-muted)]">/mo</span></div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                        </button>
                      ))}
                      {orgPlan && (
                        <button
                          disabled={planChanging}
                          onClick={() => void changePlan(null)}
                          className="w-full text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 py-2 text-center disabled:opacity-50 transition-colors"
                        >
                          Downgrade to free
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ADVANCED TAB  (org admin only)                              */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'advanced' && isOrgAdmin && (
            <div className="space-y-4">

              {/* AI Configuration */}
              <div className="card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--border)]">
                  <Cpu className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Organisation AI</h3>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <p className="text-xs text-[var(--text-muted)]">
                    Set your own LLM API key. When configured, it overrides the platform default for all org members.
                  </p>
                  <FeedbackMsg msg={llmMsg} />
                  <form onSubmit={saveLlm} className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl bg-[var(--surface-raised)] px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-secondary)]">Enable org AI</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Allow members to use AI features</p>
                      </div>
                      <Toggle enabled={llmEnabled} onChange={() => setLlmEnabled((v) => !v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">Provider</label>
                        <select value={llmProvider} onChange={(e) => setLlmProvider(e.target.value as LlmProvider)} className="input">
                          <option value="gemini">Google Gemini</option>
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="ollama">Ollama (self-hosted)</option>
                          <option value="openai-compatible">OpenAI-compatible</option>
                        </select>
                      </div>
                      <div>
                        <label className="input-label">Model</label>
                        <input value={llmModel} onChange={(e) => setLlmModel(e.target.value)}
                          placeholder={llmProvider === 'gemini' ? 'gemini-2.0-flash' : llmProvider === 'openai' ? 'gpt-4o' : 'model-name'}
                          className="input" />
                      </div>
                    </div>
                    {(llmProvider === 'ollama' || llmProvider === 'openai-compatible') && (
                      <div>
                        <label className="input-label">Base URL</label>
                        <input value={llmBaseUrl} onChange={(e) => setLlmBaseUrl(e.target.value)}
                          placeholder={llmProvider === 'ollama' ? 'http://localhost:11434' : 'https://api.example.com/v1'}
                          className="input" />
                      </div>
                    )}
                    <div>
                      <label className="input-label">
                        API Key
                        {orgLlm?.api_key_set && (
                          <span className="ml-2 font-normal text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                            <CheckCircle className="w-3 h-3" /> Key set
                          </span>
                        )}
                      </label>
                      <PasswordInput value={llmApiKey} onChange={(e) => setLlmApiKey(e.target.value)}
                        placeholder={orgLlm?.api_key_set ? 'Leave blank to keep current key' : 'Paste your API key'} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="submit" disabled={llmSaving} className="btn-primary disabled:opacity-50">
                        {llmSaving ? 'Saving…' : 'Save AI config'}
                      </button>
                      {orgLlm?.api_key_set && (
                        <button type="button" onClick={handleTestLlm} disabled={llmTesting} className="btn-secondary disabled:opacity-50">
                          {llmTesting ? 'Testing…' : 'Test connection'}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* Verification */}
              <div className="card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--border)]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Member verification</h3>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <p className="text-xs text-[var(--text-muted)]">
                    Require members to provide certain information before accessing org resources.
                  </p>
                  <FeedbackMsg msg={verifyMsg} />
                  <div className="flex items-center justify-between rounded-xl bg-[var(--surface-raised)] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-secondary)]">Require phone number</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">Members must add a phone to their profile</p>
                    </div>
                    <Toggle enabled={requirePhone} onChange={() => setRequirePhone((v) => !v)} />
                  </div>
                  <button onClick={saveVerification} disabled={verifySaving} className="btn-primary disabled:opacity-50">
                    {verifySaving ? 'Saving…' : 'Save verification settings'}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SYSTEM TAB                                                  */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'system' && (
            <div className="space-y-4">

              {/* Server status */}
              <div className="card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--border)]">
                  <Server className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Server status</h3>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {healthError ? (
                    <div className="flex items-center gap-2 px-5 py-4 text-sm text-red-600 dark:text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      {healthError}
                    </div>
                  ) : !health ? (
                    <div className="px-5 py-4 text-sm text-[var(--text-muted)] animate-pulse">Checking…</div>
                  ) : (
                    [
                      { label: 'API status',          value: <Badge variant="success" dot>Online</Badge> },
                      { label: 'MongoDB environment', value: <Badge variant="info">{health.env || 'unknown'}</Badge> },
                      { label: 'Node environment',    value: <Badge variant="neutral">{health.node_env}</Badge> },
                      { label: 'Server time',         value: <span className="text-xs font-mono text-[var(--text-secondary)]">{new Date(health.timestamp).toLocaleString()}</span> },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between px-5 py-3">
                        <span className="text-sm text-[var(--text-muted)]">{label}</span>
                        {value}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* API Reference */}
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--border)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">API reference</h3>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {[
                    { method: 'POST',   path: '/v1/send',           desc: 'Send an email using a template' },
                    { method: 'GET',    path: '/v1/templates',       desc: 'List templates (app-scoped)' },
                    { method: 'POST',   path: '/v1/templates',       desc: 'Create a template' },
                    { method: 'PUT',    path: '/v1/templates/:slug', desc: 'Update a template' },
                    { method: 'DELETE', path: '/v1/templates/:slug', desc: 'Delete a template' },
                    { method: 'GET',    path: '/v1/logs',            desc: 'View send logs (app-scoped)' },
                    { method: 'POST',   path: '/v1/preview',         desc: 'Render a saved template' },
                    { method: 'POST',   path: '/v1/preview/raw',     desc: 'Render raw HTML + Handlebars' },
                    { method: 'GET',    path: '/v1/smtp-providers',  desc: 'List SMTP provider presets' },
                  ].map(({ method, path, desc }) => (
                    <div key={path} className="flex items-center gap-3 px-5 py-2.5">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 ${METHOD_COLORS[method] ?? ''}`}>
                        {method}
                      </span>
                      <code className="text-xs text-[var(--text-secondary)] shrink-0">{path}</code>
                      <span className="text-xs text-[var(--text-muted)] truncate">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {showLogoutConfirm && (
        <ConfirmModal
          title="Sign out"
          message="Are you sure you want to sign out?"
          confirmLabel="Sign out"
          danger
          onConfirm={() => { clearAuth(); navigate('/login'); }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </>
  );
}
