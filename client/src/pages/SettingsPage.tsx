import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
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

interface ProfileForm {
  name: string;
  email: string;
  password: string;
}

export function SettingsPage() {
  const { user, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthError, setHealthError] = useState('');
  const [form, setForm] = useState<ProfileForm>({ name: user?.name ?? '', email: user?.email ?? '', password: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealthError('Could not reach server'));
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload: Record<string, string> = { name: form.name, email: form.email };
      if (form.password) payload.password = form.password;
      const res = await client.put<{ token: string; user: User }>('/auth/me', payload);
      setAuth(res.data.token, res.data.user);
      setForm((f) => ({ ...f, password: '' }));
      setSaved('Profile saved!');
      setTimeout(() => setSaved(''), 2500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
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
            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600 mb-3">{error}</div>}
            {saved && <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 mb-3">{saved}</div>}
            <form onSubmit={saveProfile} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save profile'}
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
              <p className="text-sm text-gray-400">Checking server...</p>
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
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold font-mono ${
                      method === 'GET' ? 'bg-green-100 text-green-700' :
                      method === 'POST' ? 'bg-blue-100 text-blue-700' :
                      method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}
                  >
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
