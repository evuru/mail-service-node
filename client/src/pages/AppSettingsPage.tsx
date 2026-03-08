import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { SmtpProviderPicker } from '../components/SmtpProviderPicker';
import { useAppStore } from '../store/appStore';
import client from '../api/client';
import type { EmailApp, MemberRole, SmtpProvider } from '../types';

type Tab = 'general' | 'smtp' | 'apikey' | 'members' | 'dns';

// Shape returned by GET /apps/:id/members and POST /apps/:id/members
interface MemberRow {
  _id: string;
  role: MemberRole;
  created_at: string;
  user: { _id: string; name?: string; email: string } | null;
}

export function AppSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateApp } = useAppStore();
  const [tab, setTab] = useState<Tab>('general');
  const [app, setApp] = useState<EmailApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  // General fields
  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl] = useState('');

  // SMTP fields
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');

  // Members
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviting, setInviting] = useState(false);

  // API key
  const [showKey, setShowKey] = useState(false);
  const [regen, setRegen] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      client.get<EmailApp>(`/apps/${id}`),
      client.get<MemberRow[]>(`/apps/${id}/members`),
    ]).then(([appRes, membRes]) => {
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
      setMembers(membRes.data);
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
      });
      setApp(res.data); updateApp(res.data); flash('SMTP settings saved!');
    } catch (err) { setError((err as Error).message); } finally { setSaving(false); }
  };

  const applyProvider = (p: SmtpProvider) => {
    setSmtpHost(p.host);
    setSmtpPort(p.port);
    setSmtpSecure(p.secure);
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

  const TABS: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'smtp', label: 'SMTP' },
    { id: 'apikey', label: 'API Key' },
    { id: 'members', label: 'Members' },
    { id: 'dns', label: 'DNS Guide' },
  ];

  if (loading) return <><Header /><main className="p-6 text-sm text-gray-400">Loading...</main></>;

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => navigate('/apps')}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Apps
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-900">{app?.app_name}</span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}
          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 mb-4">
              {saved}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200 mb-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab === t.id
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── General ── */}
          {tab === 'general' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">General</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App name</label>
                <input
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Used as the <code>{'{{appName}}'}</code> variable in templates.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App URL</label>
                <input
                  type="url"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  placeholder="https://yourapp.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Used as the base URL for unsubscribe links in emails. Falls back to the server's <code>SERVER_URL</code> env var if left blank.
                </p>
              </div>
              <button
                onClick={saveGeneral}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}

          {/* ── SMTP ── */}
          {tab === 'smtp' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">SMTP Settings</h2>
                <SmtpProviderPicker onSelect={applyProvider} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                  <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="smtp.example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                  <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)}
                      className="w-4 h-4 rounded" />
                    TLS / SSL (port 465)
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP User</label>
                  <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="user@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
                  <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                  <input value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="My Company" />
                </div>
              </div>

              <button
                onClick={saveSMTP}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save SMTP'}
              </button>
            </div>
          )}

          {/* ── API Key ── */}
          {tab === 'apikey' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">API Key</h2>
              <p className="text-xs text-gray-500">
                Send this as the <code className="bg-gray-100 px-1 rounded">X-API-KEY</code> header to authenticate API requests for this app.
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  readOnly
                  value={app?.api_key ?? ''}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-gray-50"
                />
                <button
                  onClick={() => setShowKey((v) => !v)}
                  className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(app?.api_key ?? ''); flash('Copied!'); }}
                  className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Copy
                </button>
              </div>
              <button
                onClick={regenerateKey}
                disabled={regen}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
              >
                {regen ? 'Regenerating...' : 'Regenerate key'}
              </button>
            </div>
          )}

          {/* ── Members ── */}
          {tab === 'members' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
              <h2 className="text-sm font-semibold text-gray-900">Members</h2>

              <form onSubmit={inviteMember} className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  placeholder="user@example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {inviting ? 'Adding...' : 'Add'}
                </button>
              </form>

              <div className="space-y-2">
                {members.map((m) => {
                  const u = m.user;
                  return (
                    <div key={m._id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                        {(u?.name || u?.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{u?.name || u?.email || '—'}</div>
                        {u?.name && <div className="text-xs text-gray-400">{u.email}</div>}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        m.role === 'owner' ? 'bg-blue-100 text-blue-700' :
                        m.role === 'editor' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{m.role}</span>
                      {m.role !== 'owner' && u && (
                        <button
                          onClick={() => removeMember(u._id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
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

// ─── DNS Guide component ──────────────────────────────────────────────────────

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
      className="ml-2 px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors flex-shrink-0"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function DnsRecord({ type, name, value }: { type: string; name: string; value: string }) {
  return (
    <div className="bg-gray-900 rounded-lg p-3 space-y-2 font-mono text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-4 min-w-0 flex-1">
          <span className="text-blue-400 flex-shrink-0">Type: <span className="text-white">{type}</span></span>
          <span className="text-blue-400 flex-shrink-0">Name: <span className="text-white">{name}</span></span>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-blue-400 flex-shrink-0">Value:</span>
        <span className="text-green-400 break-all flex-1">{value}</span>
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
      {/* Header card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Sending domain detected: </strong>
        <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">{domain}</code>
        <span className="text-blue-600 ml-2">(from SMTP user field)</span>
        <p className="mt-1 text-blue-700 text-xs">Add the following records to your DNS settings in your domain registrar. Changes can take up to 48 hours to propagate.</p>
      </div>

      {/* SPF */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <h3 className="text-sm font-semibold text-gray-900">SPF Record</h3>
          <span className="text-xs text-gray-400">Sender Policy Framework — declares authorised mail servers</span>
        </div>
        <DnsRecord type="TXT" name={`@`} value={spfValue} />
        <p className="text-xs text-gray-500">
          Provider detected from SMTP host: <code className="bg-gray-100 px-1 rounded">{smtpHost || 'not set'}</code>.
          If incorrect, replace <code className="bg-gray-100 px-1 rounded">{spfInclude}</code> with your provider's SPF include.
        </p>
      </div>

      {/* DKIM */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          <h3 className="text-sm font-semibold text-gray-900">DKIM Record</h3>
          <span className="text-xs text-gray-400">Cryptographic email signature — generated by your provider</span>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
          DKIM keys are generated inside your SMTP provider's dashboard and cannot be auto-generated here.
          Go to your email provider's panel → <strong>Email Authentication</strong> or <strong>DKIM Settings</strong> and copy the TXT record they provide.
        </div>
        <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-gray-400 space-y-1">
          <div>Type: <span className="text-white">TXT</span></div>
          <div>Name: <span className="text-white">selector._domainkey.{domain}</span></div>
          <div>Value: <span className="text-green-400">(copy from your provider's DKIM panel)</span></div>
        </div>
      </div>

      {/* DMARC */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          <h3 className="text-sm font-semibold text-gray-900">DMARC Record</h3>
          <span className="text-xs text-gray-400">Policy for SPF/DKIM failures — start with p=none to monitor</span>
        </div>
        <DnsRecord type="TXT" name={`_dmarc.${domain}`} value={dmarcValue} />
        <div className="text-xs text-gray-500 space-y-1">
          <p>Start with <code className="bg-gray-100 px-1 rounded">p=none</code> for 2–4 weeks to collect reports, then upgrade:</p>
          <div className="flex items-center gap-2 mt-1">
            <code className="bg-gray-100 px-2 py-1 rounded text-gray-700 flex-1">v=DMARC1; p=quarantine; adkim=r; aspf=r;</code>
            <CopyButton value="v=DMARC1; p=quarantine; adkim=r; aspf=r;" />
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Setup Checklist</h3>
        <ul className="space-y-2 text-sm text-gray-600">
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
              <span className="mt-0.5 w-4 h-4 border-2 border-gray-300 rounded flex-shrink-0 inline-block" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
