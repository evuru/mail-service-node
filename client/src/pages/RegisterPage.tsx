import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Building2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';
import type { User, Organization } from '../types';

type Step = 'account' | 'org';

export function RegisterPage() {
  const [step, setStep] = useState<Step>('account');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post<{ token: string; user: User }>('/auth/register', { name, email, password });
      setAuth(res.data.token, res.data.user);
      // Superadmin gets auto-org, regular users need to create one
      if (res.data.user.org_id) {
        navigate('/apps');
      } else {
        setStep('org');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await client.post<Organization>('/orgs', { name: orgName });
      // Refresh user so org_id is populated
      const meRes = await client.get<User>('/auth/me');
      const currentToken = useAuthStore.getState().token!;
      setAuth(currentToken, meRes.data);
      navigate('/apps');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipOrg = () => {
    navigate('/apps');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {step === 'account' ? (
            <Mail className="w-10 h-10 mx-auto text-blue-600" />
          ) : (
            <Building2 className="w-10 h-10 mx-auto text-blue-600" />
          )}
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Mail Service</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'account' ? 'Create your account' : 'Set up your organisation'}
          </p>
          {step === 'org' && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-medium">1</span>
              <div className="w-8 h-0.5 bg-blue-600" />
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-medium">2</span>
            </div>
          )}
          {step === 'account' && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-medium">1</span>
              <div className="w-8 h-0.5 bg-gray-300" />
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center font-medium">2</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          {step === 'account' ? (
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min 8 characters"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Continue →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOrgSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <p className="text-sm text-gray-500">
                Organisations let you collaborate with teammates. You can always create one later.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisation name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Acme Inc."
                />
              </div>

              <button
                type="submit"
                disabled={loading || !orgName.trim()}
                className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating organisation...' : 'Create organisation'}
              </button>

              <button
                type="button"
                onClick={handleSkipOrg}
                className="w-full py-2 px-4 text-sm text-gray-500 hover:text-gray-700"
              >
                Skip for now
              </button>
            </form>
          )}

          {step === 'account' && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
