import { Router, Request, Response } from 'express';
import { requireAuth, requireSuperadmin } from '../middleware/auth';
import { User, hashPassword } from '../models/User';
import { Organization } from '../models/Organization';
export const adminRouter = Router();

adminRouter.use(requireAuth, requireSuperadmin);

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

    // Attach org name inline
    const orgIds = [...new Set(users.map((u) => u.org_id).filter(Boolean) as string[])];
    const orgs = orgIds.length
      ? await Organization.find({ _id: { $in: orgIds } }, 'name slug').lean()
      : [];
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

// GET /admin/orgs — list all organisations
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

