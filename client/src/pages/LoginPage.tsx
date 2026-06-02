import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle2, ArrowLeft, Zap, Shield, BarChart2 } from 'lucide-react';
import { PasswordInput } from '../components/PasswordInput';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import client from '../api/client';
import type { User, EmailApp } from '../types';

const features = [
  { Icon: Zap,        text: 'Multi-app email template management'  },
  { Icon: Shield,     text: 'Per-app SMTP with API key auth'        },
  { Icon: BarChart2,  text: 'Full delivery logs and analytics'      },
  { Icon: CheckCircle2, text: 'Handlebars + schema-driven payloads' },
];

export function LoginPage() {
  const [email, setEmail]       = useState('admin@example.com');
  const [password, setPassword] = useState('changeme123');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { setAuth }             = useAuthStore();
  const { setApps, setSelectedApp } = useAppStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post<{ token: string; user: User }>('/auth/login', { email, password });
      setAuth(res.data.token, res.data.user);
      try {
        const appsRes = await client.get<EmailApp[]>('/apps');
        setApps(appsRes.data);
        if (appsRes.data.length > 0) setSelectedApp(appsRes.data[0]);
      } catch { /* non-blocker */ }
      navigate('/templates');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Mobile brand header (hidden on desktop) ── */}
      <div className="lg:hidden bg-gradient-to-br from-brand-700 via-brand-600 to-blue-500 px-6 pt-8 pb-7 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/5" />
        <Link to="/" className="relative flex items-center gap-3 w-fit">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Mail Service</span>
        </Link>
        <p className="relative mt-3 text-blue-100 text-sm leading-relaxed">
          Transactional email, done right.
        </p>
        <Link to="/" className="relative mt-4 inline-flex items-center gap-1.5 text-xs text-blue-200 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to homepage
        </Link>
      </div>

      {/* ── Desktop brand panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col bg-gradient-to-br from-brand-700 via-brand-600 to-blue-500 p-10 relative overflow-hidden">
        {/* background texture rings */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full bg-white/5" />

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 z-10 group w-fit">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Mail Service</span>
        </Link>

        {/* Hero copy */}
        <div className="flex-1 flex flex-col justify-center z-10 mt-8">
          <h2 className="text-3xl font-bold text-white leading-snug">
            Transactional email,<br />done right.
          </h2>
          <p className="mt-3 text-blue-100 text-sm leading-relaxed max-w-xs">
            Template-driven email infrastructure for your apps. Manage, preview, and send from one place.
          </p>

          <ul className="mt-8 space-y-3">
            {features.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm text-blue-100">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Back to site */}
        <Link
          to="/"
          className="z-10 flex items-center gap-1.5 text-xs text-blue-200 hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to homepage
        </Link>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 py-10 bg-[var(--bg)]">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Sign in to your account to continue</p>
          </div>

          <div className="card p-6 shadow-modal">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20
                                border border-red-200 dark:border-red-800
                                text-sm text-red-600 dark:text-red-400 animate-fade-in">
                  {error}
                </div>
              )}

              <div>
                <label className="input-label">Email address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoFocus placeholder={import.meta.env.DEV ? 'you@example.com' : undefined} className="input"
                />
              </div>

              <div>
                <label className="input-label">Password</label>
                <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)}
                  required placeholder={import.meta.env.DEV ? '••••••••' : undefined} />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                {loading ? 'Signing in…' : (
                  <>Sign in <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-[var(--text-muted)] mt-5">
              Don't have an account?{' '}
              <Link to="/register" className="text-brand-600 dark:text-brand-400 hover:underline font-medium">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
