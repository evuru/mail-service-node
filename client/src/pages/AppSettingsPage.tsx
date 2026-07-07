import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { Header } from '../components/Header';
import { SmtpProviderPicker } from '../components/SmtpProviderPicker';
import { PasswordInput } from '../components/PasswordInput';
import { useAppStore } from '../store/appStore';
import client from '../api/client';
import type { AppAlias, EmailApp, MemberRole, SmtpProvider } from '../types';

type Tab = 'general' | 'smtp' | 'apikey' | 'members' | 'dns' | 'ai' | 'aliases';

interface MemberRow {
  _id: string;
  role: MemberRole;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_manage: boolean;
  created_at: string;
  user: { _id: string; name?: string; email: string } | null;
}

export function AppSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateApp } = useAppStore();
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'general');
  const [app, setApp] = useState<EmailApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl] = useState('');

  const [smtpHost, setSmtpHost]               = useState('');
  const [smtpPort, setSmtpPort]               = useState(587);
  const [smtpSecure, setSmtpSecure]           = useState(false);
  const [smtpUser, setSmtpUser]               = useState('');
  const [smtpPass, setSmtpPass]               = useState('');
  const [smtpFromName, setSmtpFromName]       = useState('');
  const [smtpFromEmail, setSmtpFromEmail]     = useState('');

  const [members, setMembers]       = useState<MemberRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState<'editor' | 'viewer'>('editor');
  const [inviting, setInviting]       = useState(false);

  const [showKey, setShowKey] = useState(false);
  const [regen, setRegen]     = useState(false);

  const [llmEnabled, setLlmEnabled]   = useState(false);
  const [llmMinRole, setLlmMinRole]   = useState<MemberRole>('editor');

  const [aliases, setAliases]               = useState<AppAlias[]>([]);
  const [aliasName, setAliasName]           = useState('');
  const [aliasEmail, setAliasEmail]         = useState('');
  const [aliasFromName, setAliasFromName]   = useState('');
  const [aliasAdding, setAliasAdding]       = useState(false);
  const [aliasResending, setAliasResending] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      client.get<EmailApp>(`/apps/${id}`),
      client.get<MemberRow[]>(`/apps/${id}/members`),
      client.get<AppAlias[]>(`/apps/${id}/aliases`),
    ]).then(([appRes, membRes, aliasRes]) => {
      const a = appRes.data;
      setApp(a);
      setAppName(a.app_name);
      setAppUrl(a.app_url ?? '');
      setSmtpHost(a.smtp_host);
      setSmtpPort(a.smtp_port);
      setSmtpSecure(a.smtp_secure);
      setSmtpUser(a.smtp_user);
      setSmtpPass(a.smtp_pass);
      setSmtpFromName(a.smtp_from_name);
      setSmtpFromEmail(a.smtp_from_email ?? '');
      setLlmEnabled(a.llm_enabled ?? false);
      setLlmMinRole(a.llm_min_role ?? 'editor');
      setMembers(membRes.data);
      setAliases(aliasRes.data);
    }).catch(() => setError('Failed to load app')).finally(() => setLoading(false));
  }, [id]);

  const flash = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(''), 2500); };

  const saveGeneral = async () => {
    setSaving(true); setError('');
    try {
      const res = await client.put<EmailApp>(`/apps/${id}`, { app_name: appName, app_url: appUrl });
      setApp(res.data); updateApp(res.data); flash('Saved!');
    } catch (err) { setError((err as Error).message); } finally { setSaving(false); }
  };

  const saveSMTP = async () => {
    setSaving(true); setError('');
    try {
      const res = await client.put<EmailApp>(`/apps/${id}`, {
        smtp_host: smtpHost, smtp_port: smtpPort, smtp_secure: smtpSecure,
        smtp_user: smtpUser, smtp_pass: smtpPass, smtp_from_name: smtpFromName,
        smtp_from_email: smtpFromEmail,
      });
      setApp(res.data); updateApp(res.data); flash('SMTP settings saved!');
    } catch (err) { setError((err as Error).message); } finally { setSaving(false); }
  };

  const applyProvider = (p: SmtpProvider) => {
    setSmtpHost(p.host); setSmtpPort(p.port); setSmtpSecure(p.secure);
  };

  const regenerateKey = async () => {
    if (!confirm('Regenerate API key? The old key will stop working immediately.')) return;
    setRegen(true); setError('');
    try {
      const res = await client.post<{ api_key: string }>(`/apps/${id}/regenerate-key`);
      const updated = { ...app!, api_key: res.data.api_key };
      setApp(updated); updateApp(updated); flash('API key regenerated!');
    } catch (err) { setError((err as Error).message); } finally { setRegen(false); }
  };

  const inviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true); setError('');
    try {
      const res = await client.post<MemberRow>(`/apps/${id}/members`, { email: inviteEmail, role: inviteRole });
      setMembers((prev) => [...prev, res.data]);
      setInviteEmail(''); flash('Member added!');
    } catch (err) { setError((err as Error).message); } finally { setInviting(false); }
  };

  const removeMember = async (userId: string) => {
    try {
      await client.delete(`/apps/${id}/members/${userId}`);
      setMembers((prev) => prev.filter((m) => m.user?._id !== userId));
    } catch (err) { setError((err as Error).message); }
  };

  const saveAi = async () => {
    setSaving(true); setError('');
    try {
      const res = await client.put<EmailApp>(`/apps/${id}`, { llm_enabled: llmEnabled, llm_min_role: llmMinRole });
      setApp(res.data); updateApp(res.data); flash('AI settings saved!');
    } catch (err) { setError((err as Error).message); } finally { setSaving(false); }
  };

  const addAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    setAliasAdding(true); setError('');
    try {
      const res = await client.post<AppAlias>(`/apps/${id}/aliases`, { name: aliasName, from_email: aliasEmail, from_name: aliasFromName });
      setAliases((prev) => [...prev, res.data]);
      setAliasName(''); setAliasEmail(''); setAliasFromName('');
      flash('Alias added — check your inbox to verify');
    } catch (err) { setError((err as Error).message); } finally { setAliasAdding(false); }
  };

  const deleteAlias = async (name: string) => {
    if (!confirm(`Delete alias "${name}"?`)) return;
    try {
      await client.delete(`/apps/${id}/aliases/${name}`);
      setAliases((prev) => prev.filter((a) => a.name !== name));
      flash('Alias deleted');
    } catch (err) { setError((err as Error).message); }
  };

  const resendAlias = async (name: string) => {
    setAliasResending(name); setError('');
    try {
      await client.post(`/apps/${id}/aliases/${name}/resend`);
      flash('Verification email resent');
    } catch (err) { setError((err as Error).message); } finally { setAliasResending(null); }
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'smtp',    label: 'SMTP' },
    { id: 'apikey',  label: 'API Key' },
    { id: 'members', label: 'Members' },
    { id: 'aliases', label: 'Aliases' },
    { id: 'ai',      label: 'AI' },
    { id: 'dns',     label: 'DNS Guide' },
  ];

  if (loading) return <><Header /><main className="p-6 text-sm text-[var(--text-muted)]">Loading…</main></>;

  return (
    <>
      <Header />
      <main className="page-content">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => navigate('/apps')} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              Apps
            </button>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{app?.app_name}</span>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {saved && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-400">
              {saved}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b border-[var(--border)] mb-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab === t.id
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── General ── */}
          {tab === 'general' && (
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">General</h2>
              <div>
                <label className="input-label">App name</label>
                <input value={appName} onChange={(e) => setAppName(e.target.value)} className="input" />
                <p className="text-xs text-[var(--text-muted)] mt-1">Used as the <code className="bg-[var(--surface-raised)] px-1 rounded">{'{{appName}}'}</code> variable in templates.</p>
              </div>
              <div>
                <label className="input-label">App URL</label>
                <input type="url" value={appUrl} onChange={(e) => setAppUrl(e.target.value)}
                  placeholder="https://yourapp.com" className="input" />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Base URL for unsubscribe links. Falls back to the server's <code className="bg-[var(--surface-raised)] px-1 rounded">SERVER_URL</code> env var if blank.
                </p>
              </div>
              <button onClick={saveGeneral} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}

          {/* ── SMTP ── */}
          {tab === 'smtp' && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">SMTP Settings</h2>
                <SmtpProviderPicker onSelect={applyProvider} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="input-label">SMTP Host</label>
                  <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="input" placeholder="smtp.example.com" />
                </div>
                <div>
                  <label className="input-label">Port</label>
                  <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} className="input" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                    <input type="checkbox" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} className="w-4 h-4 rounded accent-brand-600" />
                    TLS / SSL (port 465)
                  </label>
                </div>
                <div>
                  <label className="input-label">SMTP User</label>
                  <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="input" placeholder="user@example.com" />
                </div>
                <div>
                  <label className="input-label">SMTP Password</label>
                  <PasswordInput value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="••••••••" />
                </div>
                <div>
                  <label className="input-label">From Name</label>
                  <input value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)} className="input" placeholder="My Company" />
                </div>
                <div>
                  <label className="input-label">
                    From Email
                    <span className="ml-1.5 text-[var(--text-muted)] font-normal">(alias)</span>
                  </label>
                  <input
                    type="email"
                    value={smtpFromEmail}
                    onChange={(e) => setSmtpFromEmail(e.target.value)}
                    className="input"
                    placeholder={smtpUser || 'noreply@yourapp.com'}
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    If your provider supports it, emails send from this address instead of the SMTP user. Leave blank to use the SMTP user.
                  </p>
                </div>
              </div>

              <button onClick={saveSMTP} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving…' : 'Save SMTP'}
              </button>
            </div>
          )}

          {/* ── API Key ── */}
          {tab === 'apikey' && (
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">API Key</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Send this as the <code className="bg-[var(--surface-raised)] px-1 rounded">X-API-KEY</code> header to authenticate API requests for this app.
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  readOnly
                  value={app?.api_key ?? ''}
                  className="input flex-1 font-mono bg-[var(--surface-raised)]"
                />
                <button onClick={() => setShowKey((v) => !v)} className="btn-secondary">{showKey ? 'Hide' : 'Show'}</button>
                <button onClick={() => { navigator.clipboard.writeText(app?.api_key ?? ''); flash('Copied!'); }} className="btn-secondary">Copy</button>
              </div>
              <button onClick={regenerateKey} disabled={regen} className="btn-danger disabled:opacity-50">
                {regen ? 'Regenerating…' : 'Regenerate key'}
              </button>
            </div>
          )}

          {/* ── Members ── */}
          {tab === 'members' && (
            <div className="card p-5 space-y-5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Members</h2>

              <form onSubmit={inviteMember} className="flex gap-2">
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  required placeholder="user@example.com" className="input flex-1" />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')} className="input w-auto">
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button type="submit" disabled={inviting} className="btn-primary disabled:opacity-50">
                  {inviting ? 'Adding…' : 'Add'}
                </button>
              </form>

              {members.length > 0 && (
                <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 items-center px-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                  <span>User</span>
                  <span className="w-10 text-center">Read</span>
                  <span className="w-10 text-center">Write</span>
                  <span className="w-10 text-center">Delete</span>
                  <span className="w-10 text-center">Manage</span>
                  <span className="w-12" />
                </div>
              )}

              <div className="space-y-2">
                {members.map((m) => {
                  const u = m.user;
                  const isOwner = m.role === 'owner';
                  const updatePerm = async (field: 'can_read' | 'can_write' | 'can_delete' | 'can_manage', value: boolean) => {
                    if (!u) return;
                    try {
                      const res = await client.put<MemberRow>(`/apps/${id}/members/${u._id}`, { [field]: value });
                      setMembers((prev) => prev.map((x) => x._id === m._id ? { ...x, ...res.data } : x));
                    } catch (err) { setError((err as Error).message); }
                  };

                  return (
                    <div key={m._id} className="grid md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 gap-y-2 items-center py-2.5 border-b border-[var(--border)] last:border-0 px-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-600 dark:text-brand-400 shrink-0">
                          {(u?.name || u?.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--text-primary)] truncate">{u?.name || u?.email || '—'}</div>
                          {u?.name && <div className="text-xs text-[var(--text-muted)] truncate">{u.email}</div>}
                        </div>
                        <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${
                          isOwner     ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400' :
                          m.role === 'editor' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                          'bg-[var(--surface-raised)] text-[var(--text-muted)]'
                        }`}>{m.role}</span>
                      </div>

                      {(['can_read', 'can_write', 'can_delete', 'can_manage'] as const).map((flag) => (
                        <div key={flag} className="flex items-center justify-center w-10">
                          <input
                            type="checkbox"
                            checked={m[flag]}
                            disabled={isOwner}
                            onChange={(e) => updatePerm(flag, e.target.checked)}
                            className="w-4 h-4 accent-brand-600 disabled:opacity-40 cursor-pointer disabled:cursor-default"
                            title={flag.replace('can_', '')}
                          />
                        </div>
                      ))}

                      <div className="w-12 flex justify-end">
                        {!isOwner && u && (
                          <button onClick={() => removeMember(u._id)} className="btn-danger text-xs">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                Read — view templates &amp; logs · Write — create/edit templates · Delete — remove templates · Manage — SMTP, API key, member management
              </p>
            </div>
          )}

          {/* ── AI ── */}
          {tab === 'ai' && (
            <div className="card p-5 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">AI Features</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Control whether AI features are available to members of this app. The platform-wide AI config must also be enabled by a superadmin.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-[var(--surface-raised)] rounded-xl">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">Enable AI for this app</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">Allow members to use AI features in templates and schemas</div>
                </div>
                <button
                  onClick={() => setLlmEnabled((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${llmEnabled ? 'bg-brand-600' : 'bg-[var(--border)]'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${llmEnabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div>
                <label className="input-label">Minimum role to use AI</label>
                <select value={llmMinRole} onChange={(e) => setLlmMinRole(e.target.value as MemberRole)}
                  disabled={!llmEnabled} className="input disabled:opacity-50">
                  <option value="viewer">Viewer — all members</option>
                  <option value="editor">Editor and above</option>
                  <option value="owner">Owner only</option>
                </select>
                <p className="text-xs text-[var(--text-muted)] mt-1">Members below this role will not see AI controls.</p>
              </div>

              <button onClick={saveAi} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving…' : 'Save AI settings'}
              </button>
            </div>
          )}

          {/* ── Aliases ── */}
          {tab === 'aliases' && (
            <div className="card p-5 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Sender Aliases</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Aliases let you send as different addresses (e.g. <code className="bg-[var(--surface-raised)] px-1 rounded">billing@</code>, <code className="bg-[var(--surface-raised)] px-1 rounded">support@</code>) using this app's SMTP connection.
                  Each alias must be verified before it can be used. Pass <code className="bg-[var(--surface-raised)] px-1 rounded">"alias": "name"</code> in your send call.
                </p>
              </div>

              {/* Alias list */}
              {aliases.length > 0 && (
                <div className="space-y-2">
                  {aliases.map((a) => (
                    <div key={a.name} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-sm font-mono font-semibold text-[var(--text-primary)]">{a.name}</code>
                          <span className="text-xs text-[var(--text-muted)]">→ {a.from_email}{a.from_name ? ` (${a.from_name})` : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {a.verified ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                            <button
                              onClick={() => resendAlias(a.name)}
                              disabled={aliasResending === a.name}
                              className="btn-ghost text-xs py-1 px-2 gap-1"
                              title="Resend verification email"
                            >
                              <RefreshCw className={`w-3 h-3 ${aliasResending === a.name ? 'animate-spin' : ''}`} />
                              Resend
                            </button>
                          </>
                        )}
                        <button onClick={() => deleteAlias(a.name)} className="btn-ghost text-xs py-1 px-2 text-red-500 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add alias form */}
              <form onSubmit={addAlias} className="space-y-3 pt-1 border-t border-[var(--border)]">
                <p className="text-xs font-medium text-[var(--text-secondary)] pt-1">Add a new alias</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Alias name <span className="text-[var(--text-muted)] font-normal">(used in API)</span></label>
                    <input
                      value={aliasName} onChange={(e) => setAliasName(e.target.value)}
                      required placeholder="billing" className="input"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">Lowercase slug, e.g. <code>support</code></p>
                  </div>
                  <div>
                    <label className="input-label">From email</label>
                    <input
                      type="email" value={aliasEmail} onChange={(e) => setAliasEmail(e.target.value)}
                      required placeholder="billing@yourapp.com" className="input"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="input-label">From name <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
                    <input
                      value={aliasFromName} onChange={(e) => setAliasFromName(e.target.value)}
                      placeholder="Billing Team" className="input"
                    />
                  </div>
                </div>
                <button type="submit" disabled={aliasAdding} className="btn-primary disabled:opacity-50">
                  {aliasAdding ? 'Adding…' : 'Add alias'}
                </button>
              </form>
            </div>
          )}

          {/* ── DNS Guide ── */}
          {tab === 'dns' && (
            <DnsGuide smtpUser={app?.smtp_user ?? ''} smtpHost={app?.smtp_host ?? ''} />
          )}
        </div>
      </main>
    </>
  );
}

// ─── DNS Guide ────────────────────────────────────────────────────────────────

const SPF_INCLUDES: Record<string, string> = {
  'hostinger': 'include:_spf.mail.hostinger.com',
  'godaddy': 'include:secureserver.net',
  'namecheap': 'include:spf.namecheap.com',
  'sendgrid': 'include:sendgrid.net',
  'mailgun': 'include:mailgun.org',
  'zoho': 'include:zoho.com',
  'brevo': 'include:sendinblue.com',
  'outlook': 'include:spf.protection.outlook.com',
  'gmail': 'include:_spf.google.com',
  'amazonses': 'include:amazonses.com',
};

function detectSpfInclude(host: string): string {
  const h = host.toLowerCase();
  for (const [key, val] of Object.entries(SPF_INCLUDES)) {
    if (h.includes(key)) return val;
  }
  return 'include:_spf.yourprovider.com';
}

function extractDomain(smtpUser: string): string {
  const match = smtpUser.match(/@(.+)$/);
  return match ? match[1] : 'yourdomain.com';
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="ml-2 px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors shrink-0"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function DnsRecord({ type, name, value }: { type: string; name: string; value: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-3 space-y-2 font-mono text-xs">
      <div className="flex items-center gap-4">
        <span className="text-blue-400 shrink-0">Type: <span className="text-white">{type}</span></span>
        <span className="text-blue-400 shrink-0">Name: <span className="text-white">{name}</span></span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-blue-400 shrink-0">Value:</span>
        <span className="text-emerald-400 break-all flex-1">{value}</span>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function DnsGuide({ smtpUser, smtpHost }: { smtpUser: string; smtpHost: string }) {
  const domain = extractDomain(smtpUser);
  const spfInclude = detectSpfInclude(smtpHost);
  const spfValue = `v=spf1 ${spfInclude} ~all`;
  const dmarcValue = `v=DMARC1; p=none; rua=mailto:dmarc@${domain}; adkim=r; aspf=r;`;

  return (
    <div className="space-y-5">
      <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-4 text-sm text-brand-800 dark:text-brand-300">
        <strong>Sending domain detected: </strong>
        <code className="bg-brand-100 dark:bg-brand-900/40 px-1.5 py-0.5 rounded font-mono">{domain}</code>
        <span className="text-brand-600 dark:text-brand-400 ml-2">(from SMTP user field)</span>
        <p className="mt-1 text-xs opacity-80">Add the following records to your DNS settings in your domain registrar. Changes can take up to 48 hours to propagate.</p>
      </div>

      {[
        {
          dot: 'bg-emerald-500',
          title: 'SPF Record',
          sub: 'Sender Policy Framework — declares authorised mail servers',
          content: <DnsRecord type="TXT" name="@" value={spfValue} />,
          note: <p className="text-xs text-[var(--text-muted)]">Provider detected from SMTP host: <code className="bg-[var(--surface-raised)] px-1 rounded">{smtpHost || 'not set'}</code>. If incorrect, replace <code className="bg-[var(--surface-raised)] px-1 rounded">{spfInclude}</code> with your provider's SPF include.</p>,
        },
        {
          dot: 'bg-amber-400',
          title: 'DKIM Record',
          sub: 'Cryptographic email signature — generated by your provider',
          content: (
            <>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                DKIM keys are generated inside your SMTP provider's dashboard. Go to <strong>Email Authentication</strong> or <strong>DKIM Settings</strong> and copy the TXT record they provide.
              </div>
              <div className="bg-gray-900 rounded-xl p-3 font-mono text-xs text-gray-400 space-y-1">
                <div>Type: <span className="text-white">TXT</span></div>
                <div>Name: <span className="text-white">selector._domainkey.{domain}</span></div>
                <div>Value: <span className="text-emerald-400">(copy from your provider's DKIM panel)</span></div>
              </div>
            </>
          ),
        },
        {
          dot: 'bg-brand-500',
          title: 'DMARC Record',
          sub: 'Policy for SPF/DKIM failures — start with p=none to monitor',
          content: <DnsRecord type="TXT" name={`_dmarc.${domain}`} value={dmarcValue} />,
          note: (
            <div className="text-xs text-[var(--text-muted)] space-y-1">
              <p>Start with <code className="bg-[var(--surface-raised)] px-1 rounded">p=none</code> for 2–4 weeks to collect reports, then upgrade:</p>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-[var(--surface-raised)] px-2 py-1 rounded text-[var(--text-secondary)] flex-1">v=DMARC1; p=quarantine; adkim=r; aspf=r;</code>
                <CopyButton value="v=DMARC1; p=quarantine; adkim=r; aspf=r;" />
              </div>
            </div>
          ),
        },
      ].map((section) => (
        <div key={section.title} className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${section.dot} inline-block`} />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{section.title}</h3>
            <span className="text-xs text-[var(--text-muted)]">{section.sub}</span>
          </div>
          {section.content}
          {section.note}
        </div>
      ))}

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Setup Checklist</h3>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          {[
            'SPF TXT record added to DNS',
            'DKIM TXT record generated in provider panel and added to DNS',
            'DMARC TXT record added (p=none to start)',
            'App URL set in General settings (or SERVER_URL env var configured as fallback)',
            'SMTP credentials verified with Test Send',
            'Sending volume kept under 100/day for the first week on a new domain',
            'DMARC reports reviewed after 2 weeks — escalate to p=quarantine',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 w-4 h-4 border-2 border-[var(--border)] rounded shrink-0 inline-block" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
