import { Router, Request, Response } from 'express';
import { requireAuth, requireSuperadmin } from '../middleware/auth';
import { User, hashPassword } from '../models/User';
import { Organization } from '../models/Organization';
import { EmailApp } from '../models/EmailApp';
import { EmailLog } from '../models/EmailLog';
import { PlatformMailer } from '../models/PlatformMailer';
import { testMailerConfig } from '../services/platformMailerService';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireSuperadmin);

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

// GET /admin/dashboard
adminRouter.get('/dashboard', async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d7  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

    const [totalUsers, totalOrgs, totalApps, emails30d, emails7d, chartRaw, recentLogs, topAppsRaw] =
      await Promise.all([
        User.countDocuments(),
        Organization.countDocuments(),
        EmailApp.countDocuments(),
        EmailLog.countDocuments({ sent_at: { $gte: d30 } }),
        EmailLog.countDocuments({ sent_at: { $gte: d7 } }),
        EmailLog.aggregate([
          { $match: { sent_at: { $gte: d30 } } },
          {
            $group: {
              _id: {
                y: { $year: '$sent_at' },
                m: { $month: '$sent_at' },
                d: { $dayOfMonth: '$sent_at' },
              },
              total:   { $sum: 1 },
              success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
              failed:  { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            },
          },
          { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
        ]),
        EmailLog.find().sort({ sent_at: -1 }).limit(10).lean(),
        EmailLog.aggregate([
          { $match: { app_id: { $ne: null }, sent_at: { $gte: d30 } } },
          { $group: { _id: '$app_id', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
      ]);

    // Fill in app names for recent logs
    const appIds = [...new Set(recentLogs.map((l) => l.app_id).filter(Boolean) as string[])];
    const apps   = appIds.length ? await EmailApp.find({ _id: { $in: appIds } }, 'app_name').lean() : [];
    const appMap = Object.fromEntries(apps.map((a) => [a._id, a.app_name]));

    // Fill in app names for top apps
    const topAppIds = topAppsRaw.map((a) => a._id).filter(Boolean) as string[];
    const topAppDocs = topAppIds.length ? await EmailApp.find({ _id: { $in: topAppIds } }, 'app_name').lean() : [];
    const topAppNameMap = Object.fromEntries(topAppDocs.map((a) => [a._id, a.app_name]));

    const chart = chartRaw.map((r) => ({
      date:    `${r._id.y}-${String(r._id.m).padStart(2, '0')}-${String(r._id.d).padStart(2, '0')}`,
      total:   r.total,
      success: r.success,
      failed:  r.failed,
    }));

    res.json({
      stats: { total_users: totalUsers, total_orgs: totalOrgs, total_apps: totalApps, emails_30d: emails30d, emails_7d: emails7d },
      chart,
      recent_logs: recentLogs.map((l) => ({ ...l, app_name: l.app_id ? (appMap[l.app_id] ?? null) : null })),
      top_apps: topAppsRaw.map((a) => ({ app_id: a._id, app_name: topAppNameMap[a._id] ?? a._id, count: a.count })),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

// GET /admin/users?search=&org_id=&role=&page=&limit=
adminRouter.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, org_id, role, page = '1', limit = '50' } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (search?.trim()) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: re }, { email: re }];
    }
    if (org_id) filter.org_id = org_id;
    if (role && ['superadmin', 'user'].includes(role)) filter.role = role;

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter, '-password_hash').sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(filter),
    ]);

    const orgIds = [...new Set(users.map((u) => u.org_id).filter(Boolean) as string[])];
    const orgs   = orgIds.length ? await Organization.find({ _id: { $in: orgIds } }, 'name slug').lean() : [];
    const orgMap = Object.fromEntries(orgs.map((o) => [o._id, { name: o.name, slug: o.slug }]));

    res.json({
      users: users.map((u) => ({ ...u, org: u.org_id ? orgMap[u.org_id] ?? null : null })),
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /admin/users
adminRouter.post('/users', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role = 'user', phone, is_active = true } = req.body;
  if (!name?.trim() || !email?.trim() || !password) {
    res.status(400).json({ error: 'name, email, and password are required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }
  try {
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) { res.status(409).json({ error: 'A user with that email already exists' }); return; }
    const password_hash = await hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash,
      role: ['superadmin', 'user'].includes(role) ? role : 'user',
      phone: phone?.trim() ?? '',
      is_active,
    });
    res.status(201).json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, is_active: user.is_active, created_at: user.created_at,
    });
  } catch {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /admin/users/:id
adminRouter.put('/users/:id', async (req: Request, res: Response): Promise<void> => {
  const { name, email, role, is_active, new_password, org_id, is_org_admin } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    if (name !== undefined)       user.name = name;
    if (email !== undefined)      user.email = email.toLowerCase();
    if (role !== undefined && ['superadmin', 'user'].includes(role)) user.role = role;
    if (is_active !== undefined)  user.is_active = is_active;
    if (org_id !== undefined)     user.org_id = org_id || undefined;
    if (is_org_admin !== undefined) user.is_org_admin = Boolean(is_org_admin);
    if (new_password) {
      if (new_password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }
      user.password_hash = await hashPassword(new_password);
    }
    await user.save();
    res.json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, is_active: user.is_active,
      org_id: user.org_id ?? null, is_org_admin: user.is_org_admin,
    });
  } catch {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /admin/users/:id
adminRouter.delete('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.params.id === req.user!._id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ---------------------------------------------------------------------------
// Organisations
// ---------------------------------------------------------------------------

// GET /admin/orgs
adminRouter.get('/orgs', async (_req: Request, res: Response): Promise<void> => {
  try {
    const orgs = await Organization.find().sort({ created_at: -1 }).lean();
    const memberCounts = await User.aggregate([
      { $match: { org_id: { $exists: true, $ne: null } } },
      { $group: { _id: '$org_id', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(memberCounts.map((m) => [m._id, m.count]));
    res.json(orgs.map(({ llm, ...o }) => ({
      ...o,
      llm: llm ? { provider: llm.provider, model: llm.model, enabled: llm.enabled, api_key_set: !!llm.api_key } : undefined,
      member_count: countMap[o._id] ?? 0,
    })));
  } catch {
    res.status(500).json({ error: 'Failed to fetch organisations' });
  }
});

// ---------------------------------------------------------------------------
// Platform Mailers
// ---------------------------------------------------------------------------

function mailerPublic(m: { _id: string; name: string; host: string; port: number; secure: boolean; user: string; from_name: string; from_email: string; priority: number; is_active: boolean; created_at: Date }) {
  return {
    _id: m._id, name: m.name, host: m.host, port: m.port, secure: m.secure,
    user: m.user, from_name: m.from_name, from_email: m.from_email,
    priority: m.priority, is_active: m.is_active, created_at: m.created_at,
    pass_set: true, // always true once saved
  };
}

// GET /admin/mailers
adminRouter.get('/mailers', async (_req: Request, res: Response): Promise<void> => {
  try {
    const mailers = await PlatformMailer.find().sort({ priority: 1 }).lean();
    res.json(mailers.map(mailerPublic));
  } catch {
    res.status(500).json({ error: 'Failed to fetch mailers' });
  }
});

// POST /admin/mailers
adminRouter.post('/mailers', async (req: Request, res: Response): Promise<void> => {
  const { name, host, port, secure, user, pass, from_name, from_email, priority, is_active } = req.body;
  if (!name?.trim() || !host?.trim() || !user?.trim() || !pass) {
    res.status(400).json({ error: 'name, host, user, and pass are required' });
    return;
  }
  try {
    const mailer = await PlatformMailer.create({
      name: name.trim(), host: host.trim(), port: Number(port) || 587,
      secure: Boolean(secure), user: user.trim(), pass,
      from_name: from_name?.trim() ?? '', from_email: from_email?.trim() ?? '',
      priority: Number(priority) || 1, is_active: is_active !== false,
    });
    res.status(201).json(mailerPublic(mailer.toObject()));
  } catch {
    res.status(500).json({ error: 'Failed to create mailer' });
  }
});

// PUT /admin/mailers/:id
adminRouter.put('/mailers/:id', async (req: Request, res: Response): Promise<void> => {
  const { name, host, port, secure, user, pass, from_name, from_email, priority, is_active } = req.body;
  try {
    const mailer = await PlatformMailer.findById(req.params.id);
    if (!mailer) { res.status(404).json({ error: 'Mailer not found' }); return; }

    if (name       !== undefined) mailer.name       = name.trim();
    if (host       !== undefined) mailer.host       = host.trim();
    if (port       !== undefined) mailer.port       = Number(port);
    if (secure     !== undefined) mailer.secure     = Boolean(secure);
    if (user       !== undefined) mailer.user       = user.trim();
    if (pass                    ) mailer.pass       = pass;  // only update if non-empty
    if (from_name  !== undefined) mailer.from_name  = from_name.trim();
    if (from_email !== undefined) mailer.from_email = from_email.trim();
    if (priority   !== undefined) mailer.priority   = Number(priority);
    if (is_active  !== undefined) mailer.is_active  = Boolean(is_active);

    await mailer.save();
    res.json(mailerPublic(mailer.toObject()));
  } catch {
    res.status(500).json({ error: 'Failed to update mailer' });
  }
});

// DELETE /admin/mailers/:id
adminRouter.delete('/mailers/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await PlatformMailer.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete mailer' });
  }
});

// ---------------------------------------------------------------------------
// Reverification
// ---------------------------------------------------------------------------

// POST /admin/reverify/all — reset email_verified for all non-superadmin users and send new tokens
adminRouter.post('/reverify/all', async (req: Request, res: Response): Promise<void> => {
  try {
    const { include_superadmin = false } = req.body;
    const filter: Record<string, unknown> = { email_verified: true };
    if (!include_superadmin) filter.role = 'user';

    const users = await User.find(filter).select('_id name email role email_verified');
    // Reset verified status in bulk
    await User.updateMany(filter, {
      $set: { email_verified: false, email_verified_at: undefined, email_verify_token: '' },
    });

    // Update PlatformConfig last_reverify_at
    await import('../models/PlatformConfig').then(({ PlatformConfig }) =>
      PlatformConfig.findOneAndUpdate(
        {},
        { $set: { 'verification.last_reverify_at': new Date() } },
        { upsert: true },
      )
    );

    // Send verification emails — fire-and-forget in background, don't block response
    const { sendSystemEmail } = await import('../services/platformMailerService');
    const { randomUUID } = await import('crypto');
    const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
    const clientUrl = process.env.CLIENT_URL || serverUrl;
    const appName   = process.env.APP_NAME || 'Mail Service';

    void (async () => {
      for (const u of users) {
        try {
          const token = randomUUID();
          const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await User.findByIdAndUpdate(u._id, { email_verify_token: token, email_verify_token_expires: expires });
          const verifyUrl = `${clientUrl}/verify-email?token=${token}`;
          await sendSystemEmail({
            to: u.email,
            subject: `Please re-verify your email — ${appName}`,
            html: `<p>Hi ${u.name},</p><p>Your administrator has requested you re-verify your email address.</p><p><a href="${verifyUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Verify email</a></p><p style="color:#888;font-size:12px">Link expires in 24 hours.</p>`,
            text: `Please re-verify your email: ${verifyUrl}`,
          });
        } catch { /* skip individual failures */ }
      }
    })();

    res.json({ ok: true, queued: users.length });
  } catch {
    res.status(500).json({ error: 'Failed to trigger reverification' });
  }
});

// POST /admin/reverify/:userId — reset a single user's email verification
adminRouter.post('/reverify/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    user.email_verified = false;
    user.email_verified_at = undefined;

    const { randomUUID } = await import('crypto');
    const token = randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.email_verify_token = token;
    user.email_verify_token_expires = expires;
    await user.save();

    const clientUrl = process.env.CLIENT_URL || process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
    const appName   = process.env.APP_NAME || 'Mail Service';
    const verifyUrl = `${clientUrl}/verify-email?token=${token}`;

    try {
      const { sendSystemEmail } = await import('../services/platformMailerService');
      await sendSystemEmail({
        to: user.email,
        subject: `Please verify your email — ${appName}`,
        html: `<p>Hi ${user.name},</p><p>Please verify your email address for <b>${appName}</b>.</p><p><a href="${verifyUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Verify email</a></p><p style="color:#888;font-size:12px">Link expires in 24 hours.</p>`,
        text: `Verify your email: ${verifyUrl}`,
      });
    } catch { /* email failed — verification still reset */ }

    res.json({ ok: true, email: user.email });
  } catch {
    res.status(500).json({ error: 'Failed to reset verification' });
  }
});

// POST /admin/mailers/test — test a config (body has full creds + test_to address)
adminRouter.post('/mailers/test', async (req: Request, res: Response): Promise<void> => {
  const { host, port, secure, user, pass, from_name, from_email, test_to } = req.body;
  if (!host || !user || !pass || !test_to) {
    res.status(400).json({ error: 'host, user, pass, and test_to are required' });
    return;
  }
  try {
    await testMailerConfig(
      { host, port: Number(port) || 587, secure: Boolean(secure), user, pass, from_name: from_name ?? '', from_email: from_email ?? '' },
      test_to,
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});
