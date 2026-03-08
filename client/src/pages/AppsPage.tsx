import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      <Header />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Email Apps</h1>
              <p className="text-sm text-gray-500 mt-0.5">Each app has its own SMTP config and API key.</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              + New App
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          {showForm && (
            <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
                placeholder="App name (e.g. My SaaS)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200"
              >
                Cancel
              </button>
            </form>
          )}

          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : apps.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">No apps yet. Create your first one.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {apps.map((app) => (
                <div
                  key={app._id}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {app.app_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{app.app_name}</div>
                    <div className="text-xs text-gray-400 font-mono truncate mt-0.5">
                      {app.smtp_host || <span className="italic">SMTP not configured</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setSelectedApp(app); navigate('/templates'); }}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      {selectedApp?._id === app._id ? 'Active' : 'Select'}
                    </button>
                    <button
                      onClick={() => navigate(`/apps/${app._id}/settings`)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
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
