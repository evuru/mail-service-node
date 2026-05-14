import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';
import type { User, Organization } from '../types';

export function OrgSetupPage() {
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth, token, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await client.post<Organization>('/orgs', { name: orgName });
      const meRes = await client.get<User>('/auth/me');
      setAuth(token!, meRes.data);
      navigate('/apps');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Building2 className="w-10 h-10 mx-auto text-blue-600" />
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Create your organisation</h1>
          <p className="text-sm text-gray-500 mt-1">
            You need an organisation to use Mail Service.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organisation name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                autoFocus
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Acme Inc."
              />
            </div>

            <button
              type="submit"
              disabled={loading || !orgName.trim()}
              className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create organisation'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Wrong account?{' '}
            <button onClick={handleLogout} className="text-blue-600 hover:underline font-medium">
              Sign out
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
