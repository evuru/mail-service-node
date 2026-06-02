import { randomUUID } from 'crypto';
import { Router, Request, Response } from 'express';
import { requireAuth, requireSuperadmin } from '../middleware/auth';
import { PlatformConfig } from '../models/PlatformConfig';
import { PlatformMailer } from '../models/PlatformMailer';
import { User } from '../models/User';
import { sendSystemEmail } from '../services/platformMailerService';
import type { LlmProvider } from '../models/PlatformConfig';

// ─── In-memory test code store (superadmin-only, low-volume) ─────────────────
const pendingTestCodes = new Map<string, { code: string; expiresAt: Date }>();

async function sendVerificationToAll(): Promise<void> {
  const users = await User.find({ email_verified: false, role: 'user' });
  const clientUrl = process.env.CLIENT_URL || process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
  const appName   = process.env.APP_NAME || 'Mail Service';
  for (const u of users) {
    try {
      const token = randomUUID();
      u.email_verify_token = token;
      u.email_verify_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await u.save();
      const verifyUrl = `${clientUrl}/verify-email?token=${token}`;
      await sendSystemEmail({
        to: u.email,
        subject: `Verify your email — ${appName}`,
        html: `<p>Hi ${u.name},</p><p>Please verify your email for <b>${appName}</b>.</p><p><a href="${verifyUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Verify email</a></p><p style="color:#888;font-size:12px">Link expires in 24 hours.</p>`,
        text: `Verify your email: ${verifyUrl}`,
      });
    } catch { /* skip failures */ }
  }
}

export const platformRouter = Router();

platformRouter.use(requireAuth, requireSuperadmin);

const VALID_PROVIDERS: LlmProvider[] = ['openai', 'anthropic', 'gemini', 'ollama', 'openai-compatible'];

function safePlatformResponse(cfg: InstanceType<typeof PlatformConfig>) {
  return {
    llm: {
      provider:    cfg.llm.provider,
      api_key_set: cfg.llm.api_key.length > 0,
      base_url:    cfg.llm.base_url,
      model:       cfg.llm.model,
      enabled:     cfg.llm.enabled,
    },
    verification: {
      require_email_verification:   cfg.verification?.require_email_verification ?? false,
      require_phone_for_non_org:    cfg.verification?.require_phone_for_non_org ?? false,
      reverification_interval_days: cfg.verification?.reverification_interval_days ?? 0,
      last_reverify_at:             cfg.verification?.last_reverify_at ?? null,
    },
  };
}

// GET /admin/platform/mailer-status — check whether a working mail config exists
platformRouter.get('/mailer-status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const dbMailer = await PlatformMailer.findOne({ is_active: true }).lean();
    const hasEnvMailer = !!(
      process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
    );
    const configured = !!dbMailer || hasEnvMailer;
    res.json({
      configured,
      has_db_mailer: !!dbMailer,
      has_env_mailer: hasEnvMailer,
      env_vars_needed: configured ? null : ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_NAME', 'SMTP_FROM_EMAIL'],
    });
  } catch {
    res.status(500).json({ error: 'Failed to check mailer status' });
  }
});

// POST /admin/platform/send-test-code — send a 6-digit verification code to an email address
platformRouter.post('/send-test-code', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email?.trim()) { res.status(400).json({ error: 'email is required' }); return; }

  // Prune expired entries
  const now = new Date();
  for (const [key, val] of pendingTestCodes) {
    if (val.expiresAt < now) pendingTestCodes.delete(key);
  }

  const code    = String(Math.floor(100000 + Math.random() * 900000));
  const testId  = randomUUID();
  const expires = new Date(Date.now() + 10 * 60 * 1000);
  pendingTestCodes.set(testId, { code, expiresAt: expires });

  const appName = process.env.APP_NAME || 'Mail Service';
  try {
    await sendSystemEmail({
      to: email.trim(),
      subject: `Mail config test — ${appName}`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a2e">
        <h2 style="margin:0 0 12px">Mailer test</h2>
        <p style="color:#555;margin:0 0 24px">Your platform mailer is working. Your test code is:</p>
        <p style="text-align:center;margin:0 0 24px">
          <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#4f46e5;background:#f0f0ff;padding:16px 28px;border-radius:8px;display:inline-block">${code}</span>
        </p>
        <p style="color:#888;font-size:12px">This code expires in 10 minutes.</p>
      </div>`,
      text: `Your mail config test code: ${code}  (expires in 10 minutes)`,
    });
    res.json({ test_id: testId });
  } catch (err) {
    pendingTestCodes.delete(testId);
    res.status(502).json({ error: (err as Error).message || 'Failed to send test email' });
  }
});

// POST /admin/platform/verify-test-code — confirm the code the admin received
platformRouter.post('/verify-test-code', (req: Request, res: Response): void => {
  const { test_id, code } = req.body;
  if (!test_id || !code) { res.status(400).json({ error: 'test_id and code are required' }); return; }

  const entry = pendingTestCodes.get(test_id);
  if (!entry) { res.status(400).json({ error: 'Invalid or expired test — request a new code' }); return; }
  if (entry.expiresAt < new Date()) {
    pendingTestCodes.delete(test_id);
    res.status(400).json({ error: 'Code has expired — send a new one' });
    return;
  }
  if (entry.code !== String(code).trim()) {
    res.status(400).json({ error: 'Incorrect code — check your email and try again' });
    return;
  }
  pendingTestCodes.delete(test_id);
  res.json({ ok: true });
});

// POST /admin/platform/test-active-mailer — fire a real email through the live cascade (DB mailers → env fallback)
platformRouter.post('/test-active-mailer', async (req: Request, res: Response): Promise<void> => {
  const { to } = req.body;
  if (!to?.trim()) { res.status(400).json({ error: 'to is required' }); return; }
  const appName = process.env.APP_NAME || 'Mail Service';
  try {
    await sendSystemEmail({
      to: to.trim(),
      subject: `Mail config test — ${appName}`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a2e">
        <h2 style="margin:0 0 12px">✓ Mail config is working</h2>
        <p style="color:#555;margin:0 0 16px">This test email was sent by <b>${appName}</b> using the active mailer configuration.</p>
        <p style="color:#888;font-size:12px">If you received this, your platform can send system emails (verification links, notifications, etc.).</p>
      </div>`,
      text: `Mail config test — ${appName}\n\nYour mail config is working. This was sent via the active mailer.`,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});

// GET /admin/platform  — return config with api_key masked
platformRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const cfg = await PlatformConfig.findOne();
    if (!cfg) {
      res.json({
        llm: { provider: 'gemini', api_key_set: false, base_url: '', model: 'gemini-2.0-flash', enabled: false },
        verification: { require_email_verification: false, require_phone_for_non_org: false },
      });
      return;
    }
    res.json(safePlatformResponse(cfg));
  } catch {
    res.status(500).json({ error: 'Failed to fetch platform config' });
  }
});

// PUT /admin/platform  — upsert config
platformRouter.put('/', async (req: Request, res: Response): Promise<void> => {
  const { provider, api_key, base_url, model, enabled } = req.body.llm ?? {};
  const { require_email_verification, require_phone_for_non_org } = req.body.verification ?? {};

  if (provider !== undefined && !VALID_PROVIDERS.includes(provider)) {
    res.status(400).json({ error: 'Invalid LLM provider' });
    return;
  }

  try {
    let cfg = await PlatformConfig.findOne();
    if (!cfg) {
      cfg = new PlatformConfig({
        llm: { provider: 'gemini', api_key: '', base_url: '', model: 'gemini-2.0-flash', enabled: false },
        verification: { require_email_verification: false, require_phone_for_non_org: false },
      });
    }

    if (provider  !== undefined) cfg.llm.provider  = provider;
    if (api_key   !== undefined && api_key !== '') cfg.llm.api_key = api_key;
    if (base_url  !== undefined) cfg.llm.base_url  = base_url;
    if (model     !== undefined) cfg.llm.model     = model;
    if (enabled   !== undefined) cfg.llm.enabled   = enabled;

    const wasEmailVerifOff = !cfg.verification.require_email_verification;
    if (require_email_verification !== undefined) cfg.verification.require_email_verification = Boolean(require_email_verification);
    if (require_phone_for_non_org  !== undefined) cfg.verification.require_phone_for_non_org  = Boolean(require_phone_for_non_org);

    const { reverification_interval_days } = req.body.verification ?? {};
    if (reverification_interval_days !== undefined) {
      cfg.verification.reverification_interval_days = Number(reverification_interval_days);
    }

    await cfg.save();

    // When email verification is toggled on, fire-and-forget to all unverified users
    if (wasEmailVerifOff && cfg.verification.require_email_verification) {
      void sendVerificationToAll();
    }

    res.json(safePlatformResponse(cfg));
  } catch {
    res.status(500).json({ error: 'Failed to update platform config' });
  }
});
