import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useOrgStore } from '../store/orgStore';
import client from '../api/client';

export function VerificationBanner() {
  const { user, platformRequirements } = useAuthStore();
  const { orgVerification } = useOrgStore();
  const [dismissed, setDismissed] = useState(false);
  const [resent, setResent]       = useState(false);

  if (!user || dismissed) return null;

  const needsEmailVerif = platformRequirements?.require_email_verification && !user.email_verified;
  const phoneSet = !!user.phone?.trim();
  const needsPhone = !phoneSet && (
    (user.org_id && orgVerification?.require_phone) ||
    (!user.org_id && platformRequirements?.require_phone_for_non_org)
  );

  if (!needsEmailVerif && !needsPhone) return null;

  const handleResend = async () => {
    try {
      await client.post('/auth/resend-verification');
      setResent(true);
    } catch { /* ignore */ }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 text-sm text-amber-800 dark:text-amber-300 space-y-0.5">
        {needsEmailVerif && (
          <p>
            {resent
              ? 'Verification email sent — check your inbox.'
              : <>Please verify your email address.{' '}
                  <button onClick={() => void handleResend()}
                    className="font-medium underline hover:no-underline inline-flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Resend link
                  </button>
                </>
            }
          </p>
        )}
        {needsPhone && (
          <p>
            {user.org_id ? 'Your organisation requires a phone number.' : 'Please add a phone number to your profile.'}
            {' '}<Link to="/profile" className="font-medium underline hover:no-underline">Update profile</Link>
          </p>
        )}
      </div>
      <button onClick={() => setDismissed(true)}
        className="text-amber-500 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 shrink-0 transition-colors"
        aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
