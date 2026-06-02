import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';

export function VerifyEmailPage() {
  const [params]  = useSearchParams();
  const token     = params.get('token');
  const { user, token: authToken, setAuth } = useAuthStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the URL.');
      return;
    }

    client.get<{ ok: boolean; message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully.');
        // Update local user state if they're logged in
        if (user && authToken) setAuth(authToken, { ...user, email_verified: true });
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err?.response?.data?.error || 'Verification failed. The link may have expired.');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 text-center space-y-5">
        <div className="flex justify-center">
          {status === 'loading' && (
            <div className="w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-brand-600 dark:text-brand-400 animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-7 h-7 text-red-500" />
            </div>
          )}
        </div>

        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            {status === 'loading' ? 'Verifying your email…'
              : status === 'success' ? 'Email verified!'
              : 'Verification failed'}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">{message}</p>
        </div>

        {status === 'success' && (
          <Link to="/templates" className="btn-primary w-full justify-center">
            Continue to dashboard
          </Link>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            {user && !user.email_verified && (
              <button
                className="btn-secondary w-full justify-center gap-2"
                onClick={async () => {
                  try {
                    await client.post('/auth/resend-verification');
                    setStatus('success');
                    setMessage('A new verification link has been sent to your email.');
                  } catch {
                    setMessage('Failed to resend — please try again later.');
                  }
                }}
              >
                <Mail className="w-4 h-4" /> Resend verification email
              </button>
            )}
            <Link to={user ? '/templates' : '/login'}
              className="block text-sm text-brand-600 dark:text-brand-400 hover:underline">
              {user ? 'Back to dashboard' : 'Go to login'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
