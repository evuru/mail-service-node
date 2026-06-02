import { useEffect, useRef, useState } from 'react';
import {
  Camera, Phone, CheckCircle, XCircle,
  Building2, Pencil, X, Shield, Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import { Header } from '../components/Header';
import { PasswordInput } from '../components/PasswordInput';
import client from '../api/client';
import type { User } from '../types';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user, setAuth } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Avatar
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarMsg,    setAvatarMsg]    = useState<Msg>(null);

  // Personal info edit
  const [editingInfo, setEditingInfo] = useState(false);
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg,    setInfoMsg]    = useState<Msg>(null);

  // Password change
  const [editingPw,  setEditingPw]  = useState(false);
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [savingPw,   setSavingPw]   = useState(false);
  const [pwMsg,      setPwMsg]      = useState<Msg>(null);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setEmail(user.email ?? '');
      setPhone(user.phone ?? '');
    }
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300_000) { setAvatarMsg({ ok: false, text: 'Image must be under 300 KB' }); return; }
    const base64 = await fileToBase64(file);
    setSavingAvatar(true); setAvatarMsg(null);
    try {
      const res = await client.put<{ token: string; user: User }>('/auth/me', { profile_image_base64: base64 });
      setAuth(res.data.token, res.data.user);
      flash(setAvatarMsg, { ok: true, text: 'Photo updated' });
    } catch (err) {
      setAvatarMsg({ ok: false, text: (err as Error).message });
    } finally { setSavingAvatar(false); }
  };

  const saveInfo = async () => {
    setSavingInfo(true); setInfoMsg(null);
    try {
      const res = await client.put<{ token: string; user: User }>('/auth/me', { name, email, phone });
      setAuth(res.data.token, res.data.user);
      setEditingInfo(false);
      flash(setInfoMsg, { ok: true, text: 'Profile updated' });
    } catch (err) {
      setInfoMsg({ ok: false, text: (err as Error).message });
    } finally { setSavingInfo(false); }
  };

  const savePassword = async () => {
    if (newPw.length < 8) { setPwMsg({ ok: false, text: 'Password must be at least 8 characters' }); return; }
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'Passwords do not match' }); return; }
    setSavingPw(true); setPwMsg(null);
    try {
      const res = await client.put<{ token: string; user: User }>('/auth/me', { password: newPw });
      setAuth(res.data.token, res.data.user);
      setEditingPw(false); setNewPw(''); setConfirmPw('');
      flash(setPwMsg, { ok: true, text: 'Password changed' });
    } catch (err) {
      setPwMsg({ ok: false, text: (err as Error).message });
    } finally { setSavingPw(false); }
  };

  const cancelPw = () => { setEditingPw(false); setNewPw(''); setConfirmPw(''); setPwMsg(null); };

  if (!user) return null;

  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

  const completionItems = [
    { label: 'Name set',       done: !!user.name?.trim() },
    { label: 'Profile photo',  done: !!user.profile_image_base64 },
    { label: 'Phone number',   done: !!user.phone?.trim() },
    { label: 'Email verified', done: user.email_verified ?? false },
    { label: 'Org member',     done: !!user.org_id },
  ];
  const doneCt  = completionItems.filter((i) => i.done).length;
  const pct     = Math.round((doneCt / completionItems.length) * 100);
  const missing = completionItems.filter((i) => !i.done);

  return (
    <>
      <Header />
      <main className="page-content">
        <div className="max-w-2xl space-y-4">

          {/* ── Hero ──────────────────────────────────────────────────── */}
          <div className="card p-6">
            <div className="flex items-start gap-5">

              {/* Avatar */}
              <div className="relative group shrink-0">
                {user.profile_image_base64 ? (
                  <img
                    src={user.profile_image_base64}
                    alt="Profile"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-[var(--border)]"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-2xl font-bold text-brand-600 dark:text-brand-400 border-2 border-[var(--border)]">
                    {initial}
                  </div>
                )}
                {savingAvatar ? (
                  <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity"
                  >
                    <Camera className="w-5 h-5 text-white" />
                    <span className="text-[10px] text-white font-medium">Change</span>
                  </button>
                )}
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] leading-tight truncate">
                      {user.name || <span className="font-normal italic text-base text-[var(--text-muted)]">No name set</span>}
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] truncate">{user.email}</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end shrink-0">
                    {user.role === 'superadmin' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        Superadmin
                      </span>
                    )}
                    {user.org_id && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)]">
                        <Building2 className="w-3 h-3" /> Org member
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] mb-4">
                  {user.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {user.phone}
                    </span>
                  )}
                  {user.created_at && !isNaN(new Date(user.created_at).getTime()) && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Joined {format(new Date(user.created_at), 'MMM yyyy')}
                    </span>
                  )}
                </div>

                {/* Completion */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[var(--text-muted)]">Profile completion</span>
                    <span className={`text-xs font-bold ${pct === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-600 dark:text-brand-400'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--surface-raised)] rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : 'bg-brand-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {missing.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {missing.map((i) => (
                        <span key={i.label} className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                          <XCircle className="w-3 h-3 opacity-40" /> {i.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {avatarMsg && <FeedbackBanner msg={avatarMsg} className="mt-4" />}
          </div>

          {/* ── Personal Information ───────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Personal Information</h3>
              {!editingInfo ? (
                <button
                  onClick={() => { setName(user.name ?? ''); setEmail(user.email); setPhone(user.phone ?? ''); setEditingInfo(true); }}
                  className="btn-secondary text-xs py-1 px-2.5"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              ) : (
                <button onClick={() => setEditingInfo(false)} className="btn-ghost text-xs py-1 px-2.5">
                  <X className="w-3 h-3" /> Cancel
                </button>
              )}
            </div>

            {infoMsg && <FeedbackBanner msg={infoMsg} className="mx-5 mt-4" />}

            {!editingInfo ? (
              /* Read view — grid with dividers */
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
                <InfoCell
                  label="Full Name"
                  value={user.name || '—'}
                />
                <InfoCell
                  label="Email Address"
                  value={user.email}
                  sub={
                    user.email_verified
                      ? <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3 h-3" /> Verified</span>
                      : <span className="text-amber-600 dark:text-amber-400">Unverified</span>
                  }
                />
                <InfoCell
                  label="Phone Number"
                  value={user.phone || '—'}
                  sub={
                    user.phone_verified
                      ? <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3 h-3" /> Verified</span>
                      : undefined
                  }
                />
              </div>
            ) : (
              /* Edit form */
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Full Name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="input-label">
                      Phone Number
                      <span className="ml-1 font-normal text-[var(--text-muted)]">(optional)</span>
                    </label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+1 555 000 0000" />
                  </div>
                </div>
                <div>
                  <label className="input-label flex items-center gap-1.5">
                    Email Address
                    {user.email_verified && (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-normal">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setEditingInfo(false)} className="btn-secondary">Cancel</button>
                  <button onClick={saveInfo} disabled={savingInfo} className="btn-primary disabled:opacity-50">
                    {savingInfo ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Security ──────────────────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Security</h3>
              </div>
              {!editingPw ? (
                <button onClick={() => setEditingPw(true)} className="btn-secondary text-xs py-1 px-2.5">
                  <Pencil className="w-3 h-3" /> Change password
                </button>
              ) : (
                <button onClick={cancelPw} className="btn-ghost text-xs py-1 px-2.5">
                  <X className="w-3 h-3" /> Cancel
                </button>
              )}
            </div>

            {pwMsg && <FeedbackBanner msg={pwMsg} className="mx-5 mt-4" />}

            {!editingPw ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
                <InfoCell label="Password" value="••••••••••••" />
                <InfoCell label="Account status" value={user.is_active ? 'Active' : 'Inactive'}
                  sub={
                    user.is_active
                      ? <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Active account</span>
                      : undefined
                  }
                />
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">New password</label>
                    <PasswordInput value={newPw} onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Min. 8 characters" autoComplete="new-password" />
                  </div>
                  <div>
                    <label className="input-label">Confirm new password</label>
                    <PasswordInput value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Re-enter password" autoComplete="new-password" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={cancelPw} className="btn-secondary">Cancel</button>
                  <button
                    onClick={savePassword}
                    disabled={savingPw || !newPw || !confirmPw}
                    className="btn-primary disabled:opacity-50"
                  >
                    {savingPw ? 'Saving…' : 'Update password'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Msg = { ok: boolean; text: string } | null;

function flash(set: React.Dispatch<React.SetStateAction<Msg>>, msg: Msg) {
  set(msg);
  setTimeout(() => set(null), 3000);
}

function FeedbackBanner({ msg, className = '' }: { msg: NonNullable<Msg>; className?: string }) {
  return (
    <div className={`px-3 py-2 rounded-lg text-xs ${className} ${
      msg.ok
        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
    }`}>
      {msg.text}
    </div>
  );
}

function InfoCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-medium text-[var(--text-primary)]">{value}</p>
      {sub && <div className="text-xs mt-0.5 text-[var(--text-muted)]">{sub}</div>}
    </div>
  );
}
