import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Layers } from 'lucide-react';
import { Header } from '../components/Header';
import { useAppStore } from '../store/appStore';
import client from '../api/client';
import type { EmailApp } from '../types';

export function AppsPage() {
  const { apps, setApps, setSelectedApp, selectedApp } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchApps = async () => {
    try {
      const res = await client.get<EmailApp[]>('/apps');
      setApps(res.data);
      if (!selectedApp && res.data.length > 0) setSelectedApp(res.data[0]);
    } catch {
      setError('Failed to load apps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApps(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const res = await client.post<EmailApp>('/apps', { app_name: newName });
      setApps([...apps, res.data]);
      setSelectedApp(res.data);
      setNewName('');
      setShowForm(false);
      navigate(`/apps/${res.data._id}/settings`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Header
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            New App
          </button>
        }
      />
      <main className="page-content">
        <div className="max-w-2xl">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {showForm && (
            <form onSubmit={handleCreate} className="card p-4 mb-4 flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
                placeholder="App name (e.g. My SaaS)"
                className="input flex-1"
              />
              <button type="submit" disabled={creating} className="btn-primary disabled:opacity-50">
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
            </form>
          )}

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card h-20 animate-pulse bg-[var(--surface-raised)]" />
              ))}
            </div>
          ) : apps.length === 0 ? (
            <div className="empty-state card p-12">
              <div className="w-14 h-14 rounded-2xl bg-[var(--surface-raised)] flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">No apps yet</p>
              <p className="text-xs text-[var(--text-muted)]">Create your first app to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {apps.map((app) => (
                <div key={app._id} className="card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {app.app_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--text-primary)]">{app.app_name}</div>
                    <div className="text-xs text-[var(--text-muted)] font-mono truncate mt-0.5">
                      {app.smtp_host || <span className="text-[var(--text-muted)]">SMTP not configured</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => { setSelectedApp(app); navigate('/templates'); }}
                      className={`btn-ghost text-xs ${selectedApp?._id === app._id ? 'text-brand-600 dark:text-brand-400 font-semibold' : ''}`}
                    >
                      {selectedApp?._id === app._id ? 'Active' : 'Select'}
                    </button>
                    <button
                      onClick={() => navigate(`/apps/${app._id}/settings`)}
                      className="btn-secondary text-xs"
                    >
                      Settings
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
