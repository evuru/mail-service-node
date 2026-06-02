import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlatformStore } from '../store/platformStore';
import type { MailerStatus } from '../store/platformStore';
import type { LlmProvider, PlatformMailer } from '../types';
import {
  Bot, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ShieldCheck,
  Mail, Plus, Pencil, Trash2, Play, X, ChevronUp, ChevronDown,
  Server, ArrowRight, RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const PROVIDERS: { id: LlmProvider; label: string; needsKey: boolean; needsBase: boolean; defaultModel: string }[] = [
  { id: 'gemini',            label: 'Google Gemini',      needsKey: true,  needsBase: false, defaultModel: 'gemini-2.0-flash' },
  { id: 'openai',            label: 'OpenAI',             needsKey: true,  needsBase: false, defaultModel: 'gpt-4o' },
  { id: 'anthropic',         label: 'Anthropic (Claude)', needsKey: true,  needsBase: false, defaultModel: 'claude-sonnet-4-6' },
  { id: 'ollama',            label: 'Ollama (local)',      needsKey: false, needsBase: true,  defaultModel: 'llama3.2' },
  { id: 'openai-compatible', label: 'OpenAI-compatible',  needsKey: true,  needsBase: true,  defaultModel: 'gpt-4o' },
];

type Tab = 'llm' | 'mailers' | 'verification';

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-[var(--border)]'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

// ─── Email Verification Preflight Modal ───────────────────────────────────────

type PreflightStep = 'checking' | 'no-mailer' | 'send-code' | 'verify-code' | 'done';

const STEP_LABELS: Record<number, string> = { 1: '1. Mailer check', 2: '2. Test send', 3: '3. Confirm' };

function stepNum(s: PreflightStep): number {
  if (s === 'checking' || s === 'no-mailer') return 1;
  if (s === 'send-code') return 2;
  return 3;
}

function EmailVerificationPreflightModal({
  onConfirmed,
  onClose,
}: {
  onConfirmed: () => void;
  onClose: () => void;
}) {
  const { checkMailerStatus, sendTestCode, verifyTestCode } = usePlatformStore();
  const { user } = useAuthStore();

  const [step, setStep]                   = useState<PreflightStep>('checking');
  const [mailerStatus, setMailerStatus]   = useState<MailerStatus | null>(null);
  const [testEmail, setTestEmail]         = useState(user?.email ?? '');
  const [testId, setTestId]               = useState('');
  const [code, setCode]                   = useState('');
  const [busy, setBusy]                   = useState(false);
  const [error, setError]                 = useState('');

  const runCheck = async () => {
    setStep('checking'); setMailerStatus(null); setError('');
    try {
      const status = await checkMailerStatus();
      setMailerStatus(status);
      setStep(status.configured ? 'send-code' : 'no-mailer');
    } catch {
      setStep('no-mailer');
    }
  };

  useEffect(() => { void runCheck(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendCode = async () => {
    setError(''); setBusy(true);
    try {
      const id = await sendTestCode(testEmail);
      setTestId(id);
      setStep('verify-code');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const handleVerifyCode = async () => {
    setError(''); setBusy(true);
    try {
      await verifyTestCode(testId, code);
      setStep('done');
      setTimeout(() => { onConfirmed(); onClose(); }, 1200);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const current = stepNum(step);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Enable email verification</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
        </div>

        {/* Step bar */}
        <div className="flex items-center gap-0 px-5 pt-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-1 flex-1 last:flex-none">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                n < current  ? 'bg-emerald-500 text-white' :
                n === current ? 'bg-brand-600 text-white' :
                                'bg-[var(--border)] text-[var(--text-muted)]'
              }`}>
                {n < current ? <CheckCircle className="w-3.5 h-3.5" /> : n}
              </div>
              <span className={`text-xs hidden sm:block ${n === current ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>
                {STEP_LABELS[n]}
              </span>
              {n < 3 && <div className="flex-1 h-px bg-[var(--border)] mx-2" />}
            </div>
          ))}
        </div>

        <div className="p-5 space-y-4">

          {/* Step 1: checking */}
          {step === 'checking' && (
            <div className="flex items-center gap-3 py-4 text-sm text-[var(--text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-brand-500" />
              Checking mail configuration…
            </div>
          )}

          {/* Step 1: no mailer found */}
          {step === 'no-mailer' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-medium">No SMTP config found</p>
                  <p className="mt-0.5 text-xs">We check for an active DB mailer first, then fall back to <code className="font-mono">SMTP_HOST</code>, <code className="font-mono">SMTP_USER</code>, and <code className="font-mono">SMTP_PASS</code> env vars. Neither is set.</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                  <Server className="w-3 h-3" /> Recommended — add to your <code className="font-mono">.env</code> file:
                </p>
                <pre className="text-xs font-mono bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-3 overflow-x-auto leading-relaxed text-[var(--text-primary)]">{`SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@example.com
SMTP_PASS=yourpassword
SMTP_FROM_NAME=Mail Service
SMTP_FROM_EMAIL=noreply@example.com`}</pre>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                Or add a mailer via the UI:{' '}
                <Link to="/platform-settings" onClick={onClose}
                  className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
                  Platform Settings → Mailers tab
                </Link>
              </p>

              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => void runCheck()} className="btn-secondary gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Re-check
                </button>
                <button onClick={onClose} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {/* Step 2: send test code */}
          {step === 'send-code' && (
            <div className="space-y-4">
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                mailerStatus?.has_db_mailer
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
              }`}>
                <CheckCircle className="w-4 h-4 shrink-0" />
                {mailerStatus?.has_db_mailer
                  ? 'Platform DB mailer found'
                  : 'SMTP env vars found'}
                <span className="text-xs opacity-75 ml-1">— now confirm delivery works</span>
              </div>

              <div>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Send a test email to confirm your mailer can actually deliver. Enter the 6-digit code you receive to proceed.
                </p>
                <label className="input-label">Send test code to</label>
                <input className="input" type="email" value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex items-center gap-3">
                <button onClick={() => void handleSendCode()} disabled={busy || !testEmail.trim()}
                  className="btn-primary gap-1.5 disabled:opacity-50">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  {busy ? 'Sending…' : 'Send test code'}
                </button>
                <button onClick={onClose} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {/* Step 3: verify code */}
          {step === 'verify-code' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Check <span className="font-medium text-[var(--text-primary)]">{testEmail}</span> for a 6-digit code and enter it below.
              </p>
              <div>
                <label className="input-label">6-digit code</label>
                <input
                  className="input font-mono text-center text-xl tracking-[0.4em]"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="· · · · · ·"
                  autoFocus
                />
                <p className="text-xs text-[var(--text-muted)] mt-1.5">Code expires in 10 minutes.</p>
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex items-center gap-3">
                <button onClick={() => void handleVerifyCode()} disabled={busy || code.length !== 6}
                  className="btn-primary gap-1.5 disabled:opacity-50">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  {busy ? 'Verifying…' : 'Confirm & enable'}
                </button>
                <button onClick={() => { setStep('send-code'); setCode(''); setError(''); setTestId(''); }}
                  className="btn-ghost gap-1 text-xs">
                  <RefreshCw className="w-3 h-3" /> Resend
                </button>
                <button onClick={onClose} className="btn-ghost ml-auto">Cancel</button>
              </div>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="flex items-center gap-3 py-4 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5 shrink-0" />
              Mailer verified — enabling email verification…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mailer Form ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', host: '', port: 587, secure: false, user: '', pass: '',
  from_name: '', from_email: '', priority: 1, is_active: true,
};

function MailerFormModal({
  editing, onClose, onSaved,
}: {
  editing: PlatformMailer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { createMailer, updateMailer, testMailer } = usePlatformStore();
  const { user } = useAuthStore();

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPass, setShowPass] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [testing, setTesting] = useState(false);
  const [testRes, setTestRes] = useState<{ ok: boolean; msg: string } | null>(null);
  const [err, setErr] = useState('');
  const [testTo, setTestTo] = useState(user?.email ?? '');

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name, host: editing.host, port: editing.port,
        secure: editing.secure, user: editing.user, pass: '',
        from_name: editing.from_name, from_email: editing.from_email,
        priority: editing.priority, is_active: editing.is_active,
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [editing]);

  const set = (k: keyof typeof EMPTY_FORM, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setErr(''); setSaving(true);
    try {
      if (editing) {
        const payload: Parameters<typeof updateMailer>[1] = { ...form };
        if (!payload.pass) delete payload.pass;
        await updateMailer(editing._id, payload);
      } else {
        await createMailer(form);
      }
      onSaved(); onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTestRes(null); setTesting(true);
    try {
      await testMailer({ ...form, test_to: testTo });
      setTestRes({ ok: true, msg: `Test email sent to ${testTo}` });
    } catch (e) {
      setTestRes({ ok: false, msg: (e as Error).message });
    } finally { setTesting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="card shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)] z-10">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {editing ? 'Edit mailer' : 'Add mailer'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="input-label">Name</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Primary / Backup 1" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="input-label">SMTP Host</label>
              <input className="input font-mono" value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="smtp.mailgun.org" />
            </div>
            <div>
              <label className="input-label">Port</label>
              <input className="input font-mono" type="number" value={form.port} onChange={(e) => set('port', Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Username</label>
              <input className="input" value={form.user} onChange={(e) => set('user', e.target.value)} autoComplete="off" />
            </div>
            <div>
              <label className="input-label">Password {editing && <span className="font-normal text-[var(--text-muted)]">(leave blank to keep)</span>}</label>
              <div className="relative">
                <input className="input font-mono pr-9" type={showPass ? 'text' : 'password'}
                  value={form.pass} onChange={(e) => set('pass', e.target.value)}
                  placeholder={editing ? '••••••••' : ''} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">From name</label>
              <input className="input" value={form.from_name} onChange={(e) => set('from_name', e.target.value)} placeholder="Mail Service" />
            </div>
            <div>
              <label className="input-label">From email</label>
              <input className="input" value={form.from_email} onChange={(e) => set('from_email', e.target.value)} placeholder="noreply@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Priority <span className="font-normal text-[var(--text-muted)]">(lower = tried first)</span></label>
              <input className="input" type="number" min={1} value={form.priority} onChange={(e) => set('priority', Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Toggle on={form.secure} onChange={() => set('secure', !form.secure)} />
              <span className="text-sm text-[var(--text-secondary)]">SSL/TLS (port 465)</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[var(--surface-raised)] rounded-xl">
            <span className="text-sm text-[var(--text-primary)]">Active</span>
            <Toggle on={form.is_active} onChange={() => set('is_active', !form.is_active)} />
          </div>

          {/* Test */}
          <div className="space-y-2 pt-1 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              <input className="input flex-1" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="test@example.com" />
              <button onClick={handleTest} disabled={testing || !form.host || !form.user || (!editing && !form.pass)}
                className="btn-secondary shrink-0 disabled:opacity-50 gap-1.5">
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Test
              </button>
            </div>
            {testRes && (
              <div className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                testRes.ok
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>
                {testRes.ok ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                {testRes.msg}
              </div>
            )}
          </div>

          {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--border)]">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add mailer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mailers Tab ──────────────────────────────────────────────────────────────

function MailersTab() {
  const { mailers, mailersLoading, fetchMailers, deleteMailer, updateMailer, testActiveMailer } = usePlatformStore();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<PlatformMailer | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const confirmRef = useRef<string | null>(null);

  const [testTo, setTestTo]     = useState(user?.email ?? '');
  const [testing, setTesting]   = useState(false);
  const [testRes, setTestRes]   = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => { void fetchMailers(); }, [fetchMailers]);

  const openEdit = (m: PlatformMailer) => { setEditTarget(m); setShowModal(true); };
  const openNew  = ()                   => { setEditTarget(null); setShowModal(true); };

  const handleDelete = async (id: string) => {
    if (confirmRef.current !== id) { confirmRef.current = id; setDeleting(id); return; }
    await deleteMailer(id);
    setDeleting(null); confirmRef.current = null;
  };

  const movePriority = async (m: PlatformMailer, dir: 'up' | 'down') => {
    await updateMailer(m._id, { priority: m.priority + (dir === 'up' ? -1 : 1) });
    void fetchMailers();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-primary)] font-medium">Platform Mailers</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            System emails (verification, notifications) are sent via these SMTP configs in priority order.
            Falls back to env SMTP if none are configured.
          </p>
        </div>
        <button onClick={openNew} className="btn-primary gap-1.5 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add mailer
        </button>
      </div>

      {mailersLoading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : mailers.length === 0 ? (
        <div className="empty-state py-10">
          <Mail className="w-8 h-8 mx-auto text-[var(--text-muted)] mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">No mailers configured</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">System emails fall back to env SMTP settings</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mailers.map((m, idx) => (
            <div key={m._id} className={`flex items-center gap-3 p-4 rounded-xl border transition-colors
              ${m.is_active
                ? 'bg-[var(--surface-raised)] border-[var(--border)]'
                : 'bg-[var(--surface)] border-dashed border-[var(--border)] opacity-60'}`}>
              {/* Priority controls */}
              <div className="flex flex-col gap-0.5">
                <button onClick={() => void movePriority(m, 'up')} disabled={idx === 0}
                  className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-30">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => void movePriority(m, 'down')} disabled={idx === mailers.length - 1}
                  className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-30">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">{m.name}</span>
                  {!m.is_active && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--border)] text-[var(--text-muted)]">Disabled</span>
                  )}
                  {idx === 0 && m.is_active && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400">Primary</span>
                  )}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5 font-mono truncate">
                  {m.user}@{m.host}:{m.port}
                  {m.from_email && ` · from: ${m.from_email}`}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(m)} className="btn-ghost p-1.5" title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { void handleDelete(m._id); }}
                  className={`btn-ghost p-1.5 ${deleting === m._id ? 'text-red-500' : ''}`}
                  title={deleting === m._id ? 'Click again to confirm' : 'Delete'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Test active mailer */}
      <div className="border-t border-[var(--border)] pt-5 space-y-3">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Test active mailer</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Sends a real email through the same path system emails use — DB mailers in priority order, falling back to env SMTP.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="input flex-1"
            type="email"
            value={testTo}
            onChange={(e) => { setTestTo(e.target.value); setTestRes(null); }}
            placeholder="you@example.com"
          />
          <button
            onClick={async () => {
              setTesting(true); setTestRes(null);
              try {
                await testActiveMailer(testTo);
                setTestRes({ ok: true, msg: `Test email sent to ${testTo}` });
              } catch (e) {
                setTestRes({ ok: false, msg: (e as Error).message });
              } finally { setTesting(false); }
            }}
            disabled={testing || !testTo.trim()}
            className="btn-secondary shrink-0 gap-1.5 disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {testing ? 'Sending…' : 'Send test'}
          </button>
        </div>
        {testRes && (
          <div className={`flex items-start gap-2 p-2.5 rounded-xl text-xs ${
            testRes.ok
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}>
            {testRes.ok
              ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
            {testRes.msg}
          </div>
        )}
      </div>

      {showModal && (
        <MailerFormModal
          editing={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); setDeleting(null); confirmRef.current = null; }}
          onSaved={() => void fetchMailers()}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PlatformSettingsPage() {
  const { llm, verification, isLoading, fetchPlatform, saveLlm, saveVerification, testLlm } = usePlatformStore();

  const [activeTab, setActiveTab] = useState<Tab>('llm');

  const [provider, setProvider] = useState<LlmProvider>('gemini');
  const [apiKey, setApiKey]     = useState('');
  const [baseUrl, setBaseUrl]   = useState('');
  const [model, setModel]       = useState('gemini-2.0-flash');
  const [enabled, setEnabled]   = useState(false);
  const [showKey, setShowKey]   = useState(false);

  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved]     = useState('');
  const [error, setError]     = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [requireEmail, setRequireEmail]               = useState(false);
  const [requirePhoneNonOrg, setRequirePhoneNonOrg]   = useState(false);
  const [verifySaving, setVerifySaving]               = useState(false);
  const [verifySaved, setVerifySaved]                 = useState('');
  const [verifyError, setVerifyError]                 = useState('');
  const [showPreflight, setShowPreflight]             = useState(false);

  useEffect(() => { fetchPlatform(); }, [fetchPlatform]);

  useEffect(() => {
    if (!llm) return;
    setProvider(llm.provider); setBaseUrl(llm.base_url);
    setModel(llm.model); setEnabled(llm.enabled);
  }, [llm]);

  useEffect(() => {
    if (!verification) return;
    setRequireEmail(verification.require_email_verification);
    setRequirePhoneNonOrg(verification.require_phone_for_non_org);
  }, [verification]);

  const selectedProvider = PROVIDERS.find((p) => p.id === provider)!;

  const handleProviderChange = (p: LlmProvider) => {
    setProvider(p);
    const preset = PROVIDERS.find((x) => x.id === p)!;
    setModel(preset.defaultModel);
    if (!preset.needsBase) setBaseUrl('');
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved('');
    try {
      await saveLlm({ provider, api_key: apiKey, base_url: baseUrl, model, enabled });
      setApiKey('');
      setSaved('Saved successfully');
      setTimeout(() => setSaved(''), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally { setSaving(false); }
  };

  const handleSaveVerification = async () => {
    setVerifySaving(true); setVerifyError(''); setVerifySaved('');
    try {
      await saveVerification({ require_email_verification: requireEmail, require_phone_for_non_org: requirePhoneNonOrg });
      setVerifySaved('Saved successfully');
      setTimeout(() => setVerifySaved(''), 3000);
    } catch (err) {
      setVerifyError((err as Error).message);
    } finally { setVerifySaving(false); }
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const msg = await testLlm();
      setTestResult({ ok: true, msg });
    } catch (err) {
      setTestResult({ ok: false, msg: (err as Error).message });
    } finally { setTesting(false); }
  };

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'llm',          icon: <Bot       className="w-4 h-4" />, label: 'AI / LLM'     },
    { id: 'mailers',      icon: <Mail      className="w-4 h-4" />, label: 'Mailers'      },
    { id: 'verification', icon: <ShieldCheck className="w-4 h-4" />, label: 'Verification' },
  ];

  return (
    <>
    <div className="flex-1 flex flex-col min-h-0 overflow-auto">
      <div className="px-6 py-4 border-b border-[var(--border)] shrink-0">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">Platform Settings</h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Configure platform-wide AI, mailers, and verification settings</p>
      </div>

      <div className="flex-1 p-6 max-w-2xl">
        {isLoading ? (
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="card overflow-hidden">
            {/* Tab header */}
            <div className="flex border-b border-[var(--border)]">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === t.id
                      ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Mailers */}
            {activeTab === 'mailers' && <MailersTab />}

            {/* Verification */}
            {activeTab === 'verification' && (
              <div className="p-6 space-y-6">
                <p className="text-xs text-[var(--text-muted)]">
                  Platform-wide verification requirements. Enabling email verification requires a working mailer — you'll be guided through a quick test.
                </p>

                <div className="space-y-3">
                  {/* Email verification — intercepts toggle-on with preflight */}
                  <div className="flex items-center justify-between p-4 bg-[var(--surface-raised)] rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">Require email verification</div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">New users receive a verification link after registering</div>
                    </div>
                    <Toggle
                      on={requireEmail}
                      onChange={() => {
                        if (!requireEmail) {
                          setShowPreflight(true);
                        } else {
                          setRequireEmail(false);
                        }
                      }}
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex items-center justify-between p-4 bg-[var(--surface-raised)] rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">Require phone for non-org users</div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">Users not in any organisation must add a phone number</div>
                    </div>
                    <Toggle on={requirePhoneNonOrg} onChange={() => setRequirePhoneNonOrg((v) => !v)} />
                  </div>
                </div>

                {verifyError && <p className="text-sm text-red-600 dark:text-red-400">{verifyError}</p>}
                {verifySaved && <p className="text-sm text-emerald-600 dark:text-emerald-400">{verifySaved}</p>}

                <button onClick={handleSaveVerification} disabled={verifySaving} className="btn-primary disabled:opacity-50">
                  {verifySaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {verifySaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}

            {/* AI / LLM */}
            {activeTab === 'llm' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-[var(--surface-raised)] rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">Enable AI features platform-wide</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">Master switch — off disables AI everywhere</div>
                  </div>
                  <Toggle on={enabled} onChange={() => setEnabled((v) => !v)} />
                </div>

                <div>
                  <label className="input-label">LLM Provider</label>
                  <select value={provider} onChange={(e) => handleProviderChange(e.target.value as LlmProvider)} className="input">
                    {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="input-label">Model</label>
                  <input type="text" value={model} onChange={(e) => setModel(e.target.value)}
                    placeholder={selectedProvider.defaultModel} className="input font-mono" />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Enter the exact model name as the provider expects it.</p>
                </div>

                {selectedProvider.needsKey && (
                  <div>
                    <label className="input-label">API Key</label>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={llm?.api_key_set ? '••••••••  (stored — leave blank to keep)' : 'Paste your API key'}
                        className="input font-mono pr-10"
                      />
                      <button type="button" onClick={() => setShowKey((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Stored server-side only — never exposed to the browser after saving.</p>
                  </div>
                )}

                {selectedProvider.needsBase && (
                  <div>
                    <label className="input-label">Base URL</label>
                    <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder={provider === 'ollama' ? 'http://localhost:11434' : 'https://api.example.com/v1'}
                      className="input font-mono" />
                  </div>
                )}

                {testResult && (
                  <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
                    testResult.ok
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                  }`}>
                    {testResult.ok
                      ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                    {testResult.ok ? `Connection successful — model responded: "${testResult.msg}"` : testResult.msg}
                  </div>
                )}

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                {saved  && <p className="text-sm text-emerald-600 dark:text-emerald-400">{saved}</p>}

                <div className="flex items-center gap-3 pt-2">
                  <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  <button
                    onClick={handleTest}
                    disabled={testing || (!llm?.api_key_set && !apiKey)}
                    className="btn-secondary disabled:opacity-50"
                  >
                    {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {testing ? 'Testing…' : 'Test connection'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {showPreflight && (
      <EmailVerificationPreflightModal
        onConfirmed={() => setRequireEmail(true)}
        onClose={() => setShowPreflight(false)}
      />
    )}
    </>
  );
}
