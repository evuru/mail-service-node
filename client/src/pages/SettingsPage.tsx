import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Building2, UserPlus, Trash2, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useOrgStore } from '../store/orgStore';
import { Header } from '../components/Header';
import { Badge } from '../components/Badge';
import client from '../api/client';
import type { User } from '../types';

interface HealthData {
  status: string;
  env: string;
  node_env: string;
  timestamp: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SettingsPage() {
  const { user, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const orgLogoInputRef = useRef<HTMLInputElement>(null);

  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthError, setHealthError] = useState('');

  // Profile
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Org
  const { org, members, fetchOrg, fetchMembers, updateOrg, inviteMember, updateMember, removeMember } = useOrgStore();
  const [orgName, setOrgName] = useState('');
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgMsg, setOrgMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteAdmin, setInviteAdmin] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetch('/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealthError('Could not reach server'));
  }, []);

  useEffect(() => {
    if (user?.org_id) {
      void fetchOrg();
      void fetchMembers();
    }
  }, [user?.org_id, fetchOrg, fetchMembers]);

  useEffect(() => {
    if (org) setOrgName(org.name);
  }, [org]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300_000) {
      setProfileMsg({ ok: false, text: 'Image must be under 300 KB' });
      return;
    }
    const base64 = await fileToBase64(file);
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await client.put<{ token: string; user: User }>('/auth/me', { profile_image_base64: base64 });
      setAuth(res.data.token, res.data.user);
      setProfileMsg({ ok: true, text: 'Avatar updated!' });
    } catch (err) {
      setProfileMsg({ ok: false, text: (err as Error).message });
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(null), 3000);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const payload: Record<string, string> = { name, email };
      if (password) payload.password = password;
      const res = await client.put<{ token: string; user: User }>('/auth/me', payload);
      setAuth(res.data.token, res.data.user);
      setPassword('');
      setProfileMsg({ ok: true, text: 'Profile saved!' });
      setTimeout(() => setProfileMsg(null), 2500);
    } catch (err) {
      setProfileMsg({ ok: false, text: (err as Error).message });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleOrgLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300_000) {
      setOrgMsg({ ok: false, text: 'Logo must be under 300 KB' });
      return;
    }
    const base64 = await fileToBase64(file);
    setOrgSaving(true);
    setOrgMsg(null);
    try {
      await updateOrg({ logo_base64: base64 });
      setOrgMsg({ ok: true, text: 'Logo updated!' });
      setTimeout(() => setOrgMsg(null), 2500);
    } catch (err) {
      setOrgMsg({ ok: false, text: (err as Error).message });
    } finally {
      setOrgSaving(false);
    }
  };

  const saveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgSaving(true);
    setOrgMsg(null);
    try {
      await updateOrg({ name: orgName });
      setOrgMsg({ ok: true, text: 'Organisation saved!' });
      setTimeout(() => setOrgMsg(null), 2500);
    } catch (err) {
      setOrgMsg({ ok: false, text: (err as Error).message });
    } finally {
      setOrgSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      await inviteMember(inviteEmail, inviteAdmin);
      setInviteEmail('');
      setInviteAdmin(false);
    } catch (err) {
      setOrgMsg({ ok: false, text: (err as Error).message });
    } finally {
      setInviting(false);
    }
  };

  const logout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl space-y-6">

          {/* Profile */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Your Profile</h2>

            {/* Avatar */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative group">
                {user?.profile_image_base64 ? (
                  <img
                    src={user.profile_image_base64}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600 border-2 border-gray-200">
                    {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={profileSaving}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <div className="font-medium text-gray-900">{user?.name || '—'}</div>
                <div className="text-xs text-gray-400">{user?.email}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  <Badge variant={user?.role === 'superadmin' ? 'info' : 'neutral'}>{user?.role}</Badge>
                </div>
              </div>
            </div>

            {profileMsg && (
              <div className={`rounded-lg px-3 py-2 text-sm mb-3 ${profileMsg.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={saveProfile} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {profileSaving ? 'Saving…' : 'Save profile'}
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                >
                  Sign out
                </button>
              </div>
            </form>
          </div>

          {/* Organisation */}
          {user?.org_id && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                Organisation
              </h2>

              {/* Org logo + name */}
              {user.is_org_admin && (
                <>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="relative group">
                      {org?.logo_base64 ? (
                        <img
                          src={org.logo_base64}
                          alt="Logo"
                          className="w-14 h-14 rounded-xl object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200">
                          <Building2 className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <button
                        onClick={() => orgLogoInputRef.current?.click()}
                        disabled={orgSaving}
                        className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <Camera className="w-4 h-4 text-white" />
                      </button>
                      <input
                        ref={orgLogoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleOrgLogoChange}
                      />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{org?.name}</div>
                      <div className="text-xs text-gray-400">/{org?.slug}</div>
                    </div>
                  </div>

                  {orgMsg && (
                    <div className={`rounded-lg px-3 py-2 text-sm mb-3 ${orgMsg.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                      {orgMsg.text}
                    </div>
                  )}

                  <form onSubmit={saveOrg} className="space-y-3 mb-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Organisation name</label>
                      <input
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={orgSaving || !orgName.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {orgSaving ? 'Saving…' : 'Save organisation'}
                    </button>
                  </form>
                </>
              )}

              {/* Members list */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Members</h3>
                <div className="space-y-2 mb-4">
                  {members.map((m) => (
                    <div key={m._id} className="flex items-center gap-3">
                      {m.profile_image_base64 ? (
                        <img src={m.profile_image_base64} alt={m.name || m.email} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                          {(m.name || m.email || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{m.name || '—'}</div>
                        <div className="text-xs text-gray-400 truncate">{m.email}</div>
                      </div>
                      {m.is_org_admin && <span title="Org admin"><Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /></span>}
                      {user.is_org_admin && m._id !== user._id && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => updateMember(m._id, !m.is_org_admin)}
                            className="text-xs text-gray-500 border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-50"
                            title={m.is_org_admin ? 'Remove admin' : 'Make admin'}
                          >
                            {m.is_org_admin ? 'Demote' : 'Admin'}
                          </button>
                          <button
                            onClick={() => { if (confirm(`Remove ${m.name || m.email} from your org?`)) void removeMember(m._id); }}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Invite form (org admin only) */}
                {user.is_org_admin && (
                  <form onSubmit={handleInvite} className="flex gap-2 pt-3 border-t border-gray-100">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      placeholder="user@example.com"
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={inviteAdmin}
                        onChange={(e) => setInviteAdmin(e.target.checked)}
                        className="accent-blue-600"
                      />
                      Admin
                    </label>
                    <button
                      type="submit"
                      disabled={inviting}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      {inviting ? 'Adding…' : 'Invite'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Server Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Server Status</h2>
            {healthError ? (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                {healthError}
              </div>
            ) : health ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    <Badge variant="success">Online</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">MongoDB Environment</span>
                  <Badge variant="info">{health.env || 'unknown'}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Node Environment</span>
                  <Badge variant="neutral">{health.node_env}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Server Time</span>
                  <span className="text-gray-700 text-xs font-mono">
                    {new Date(health.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Checking server…</p>
            )}
          </div>

          {/* API Reference */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">API Reference</h2>
            <div className="space-y-3 text-sm">
              {[
                { method: 'POST', path: '/v1/send', desc: 'Send an email using a template' },
                { method: 'GET', path: '/v1/templates', desc: 'List templates (app-scoped)' },
                { method: 'POST', path: '/v1/templates', desc: 'Create a template' },
                { method: 'PUT', path: '/v1/templates/:slug', desc: 'Update a template' },
                { method: 'DELETE', path: '/v1/templates/:slug', desc: 'Delete a template' },
                { method: 'GET', path: '/v1/logs', desc: 'View send logs (app-scoped)' },
                { method: 'POST', path: '/v1/preview', desc: 'Render a saved template' },
                { method: 'POST', path: '/v1/preview/raw', desc: 'Render raw HTML + Handlebars' },
                { method: 'GET', path: '/v1/smtp-providers', desc: 'List SMTP provider presets' },
              ].map(({ method, path, desc }) => (
                <div key={path} className="flex items-center gap-3">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold font-mono ${
                    method === 'GET' ? 'bg-green-100 text-green-700' :
                    method === 'POST' ? 'bg-blue-100 text-blue-700' :
                    method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {method}
                  </span>
                  <code className="text-gray-700 text-xs">{path}</code>
                  <span className="text-gray-500 text-xs">{desc}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
