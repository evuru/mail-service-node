import { randomUUID } from 'crypto';
import Handlebars from 'handlebars';
import { Router, Request, Response } from 'express';
import { User, IUser, hashPassword } from '../models/User';
import { Organization } from '../models/Organization';
import { PlatformConfig } from '../models/PlatformConfig';
import { Template } from '../models/Template';
import { requireAuth, signToken } from '../middleware/auth';
import { sendSystemEmail } from '../services/platformMailerService';

export const authRouter = Router();

function userPayload(u: IUser) {
  return {
    _id:                  u._id,
    name:                 u.name,
    email:                u.email,
    role:                 u.role,
    is_active:            u.is_active,
    org_id:               u.org_id ?? null,
    is_org_admin:         u.is_org_admin ?? false,
    profile_image_base64: u.profile_image_base64 ?? '',
    phone:                u.phone ?? '',
    phone_verified:       u.phone_verified ?? false,
    email_verified:       u.email_verified ?? false,
  };
}

function verificationEmailHtml(name: string, verifyUrl: string, appName: string): string {
  return `<!DOCTYPE html>
<html><body style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a2e">
<h2 style="margin:0 0 8px">Verify your email</h2>
<p style="color:#555;margin:0 0 24px">Hi ${name}, click the button below to verify your email address for <b>${appName}</b>.</p>
<a href="${verifyUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Verify email address</a>
<p style="color:#888;font-size:12px;margin-top:24px">Link expires in 24 hours. If you did not create an account you can ignore this email.</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
<p style="color:#aaa;font-size:11px;margin:0">${appName}</p>
</body></html>`;
}

async function sendVerificationEmail(user: IUser): Promise<void> {
  const token = randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  user.email_verify_token = token;
  user.email_verify_token_expires = expires;
  await user.save();

  const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
  const clientUrl = process.env.CLIENT_URL || serverUrl;
  const appName = process.env.APP_NAME || 'Mail Service';
  const verifyUrl = `${clientUrl}/verify-email?token=${token}`;

  // Try to render the system verification template; fall back to inline HTML
  let html = verificationEmailHtml(user.name, verifyUrl, appName);
  let subject = `Verify your email — ${appName}`;
  try {
    const sysTpl = await Template.findOne({ slug: '_system_verify_email', is_system: true }).lean();
    if (sysTpl) {
      const data = { user_name: user.name, verify_url: verifyUrl, app_name: appName };
      html = Handlebars.compile(sysTpl.body_html)(data);
      subject = Handlebars.compile(sysTpl.subject)(data);
    }
  } catch { /* use inline fallback */ }

  await sendSystemEmail({
    to: user.email,
    subject,
    html,
    text: `Verify your email: ${verifyUrl}`,
  });
}

// POST /auth/register
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }
  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }
    const count = await User.countDocuments();
    const isSuperadmin = count === 0;
    const role = isSuperadmin ? 'superadmin' : 'user';
    const password_hash = await hashPassword(password);
    const created = await User.create({ name, email, password_hash, role, phone: phone?.trim() ?? '' });
    const user = await User.findById(created._id) as IUser;

    // Auto-create "Mail Service" org for the first superadmin
    if (isSuperadmin) {
      const org = await Organization.create({
        name:       'Mail Service',
        slug:       'mail-service',
        created_by: user._id,
      });
      user.org_id = org._id;
      user.is_org_admin = true;
      await user.save();
    }

    // Email verification — skip for superadmin and when no mailer is configured
    let needs_verification = false;
    if (!isSuperadmin) {
      const platform = await PlatformConfig.findOne().lean();
      if (platform?.verification?.require_email_verification) {
        try {
          await sendVerificationEmail(user);
          needs_verification = true;
        } catch {
          // Verification email failed — don't block registration, just skip
        }
      }
    }

    const token = signToken(user._id);
    res.status(201).json({ token, user: userPayload(user), needs_verification });
  } catch {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.is_active) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const token = signToken(user._id);
    res.json({ token, user: userPayload(user) });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /auth/me
authRouter.get('/me', requireAuth, (req: Request, res: Response): void => {
  res.json(userPayload(req.user!));
});

// PUT /auth/me — update profile
authRouter.put('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, profile_image_base64, phone } = req.body;
  const user = req.user!;
  try {
    if (name !== undefined) user.name = name;
    if (email) {
      const lc = email.toLowerCase();
      if (lc !== user.email) {
        // Email changed — reset verification
        user.email = lc;
        user.email_verified = false;
        user.email_verify_token = '';
      }
    }
    if (phone !== undefined) user.phone = phone.trim();
    if (profile_image_base64 !== undefined) {
      if (profile_image_base64.length > 450_000) {
        res.status(413).json({ error: 'Image too large — keep it under 300 KB' });
        return;
      }
      user.profile_image_base64 = profile_image_base64;
    }
    if (password) {
      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }
      user.password_hash = await hashPassword(password);
    }
    await user.save();
    const token = signToken(user._id);
    res.json({ token, user: userPayload(user) });
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
});

// GET /auth/verify-email?token=xxx (public)
authRouter.get('/verify-email', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query as { token?: string };
  if (!token) { res.status(400).json({ error: 'token is required' }); return; }
  try {
    const user = await User.findOne({ email_verify_token: token });
    if (!user) { res.status(400).json({ error: 'Invalid or expired verification link' }); return; }
    if (user.email_verify_token_expires && user.email_verify_token_expires < new Date()) {
      res.status(400).json({ error: 'Verification link has expired — request a new one' });
      return;
    }
    user.email_verified = true;
    user.email_verified_at = new Date();
    user.email_verify_token = '';
    await user.save();
    res.json({ ok: true, message: 'Email verified successfully' });
  } catch {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// GET /auth/platform-requirements (JWT) — lightweight; used by VerificationBanner for all roles
authRouter.get('/platform-requirements', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const cfg = await PlatformConfig.findOne({}, 'verification').lean();
    res.json({
      require_email_verification: cfg?.verification?.require_email_verification ?? false,
      require_phone_for_non_org:  cfg?.verification?.require_phone_for_non_org  ?? false,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
});

// POST /auth/resend-verification (JWT)
authRouter.post('/resend-verification', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  if (user.email_verified) { res.status(400).json({ error: 'Email is already verified' }); return; }
  try {
    await sendVerificationEmail(user);
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ error: (err as Error).message });
  }
});
