import { Router, Request, Response } from 'express';
import { requireAuth, requireSuperadmin } from '../middleware/auth';
import { Plan } from '../models/Plan';
import { Organization } from '../models/Organization';
import { EmailApp } from '../models/EmailApp';
import { EmailLog } from '../models/EmailLog';
import { User } from '../models/User';

export const plansRouter = Router();

// ─── Public ───────────────────────────────────────────────────────────────────

// GET /plans — public list of active public plans
plansRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const plans = await Plan.find({ is_active: true, is_public: true }).sort({ sort_order: 1 }).lean();
    res.json(plans);
  } catch {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// ─── Admin ────────────────────────────────────────────────────────────────────

const adminRouter = Router();
adminRouter.use(requireAuth, requireSuperadmin);

// GET /admin/plans — all plans
adminRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const plans = await Plan.find().sort({ sort_order: 1 }).lean();
    // Attach subscriber count per plan
    const counts = await Organization.aggregate([
      { $match: { plan_id: { $ne: null } } },
      { $group: { _id: '$plan_id', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    res.json(plans.map((p) => ({ ...p, subscriber_count: countMap[p._id] ?? 0 })));
  } catch {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// POST /admin/plans
adminRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name, slug, description, price_monthly, price_yearly, limits, features, badge, is_active, is_public, sort_order } = req.body;
  if (!name?.trim() || !slug?.trim()) {
    res.status(400).json({ error: 'name and slug are required' });
    return;
  }
  try {
    const plan = await Plan.create({
      name: name.trim(), slug: slug.trim(), description: description?.trim() ?? '',
      price_monthly: Number(price_monthly) || 0, price_yearly: Number(price_yearly) || 0,
      limits: limits ?? {}, features: features ?? [], badge: badge?.trim() ?? '',
      is_active: is_active !== false, is_public: is_public !== false,
      sort_order: Number(sort_order) || 0,
    });
    res.status(201).json(plan);
  } catch (err: unknown) {
    const msg = err instanceof Error && err.message.includes('duplicate key') ? 'A plan with that slug already exists' : 'Failed to create plan';
    res.status(409).json({ error: msg });
  }
});

// PUT /admin/plans/:id
adminRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { name, slug, description, price_monthly, price_yearly, limits, features, badge, is_active, is_public, sort_order } = req.body;
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) { res.status(404).json({ error: 'Plan not found' }); return; }

    if (name        !== undefined) plan.name         = name.trim();
    if (slug        !== undefined) plan.slug         = slug.trim();
    if (description !== undefined) plan.description  = description.trim();
    if (price_monthly !== undefined) plan.price_monthly = Number(price_monthly);
    if (price_yearly  !== undefined) plan.price_yearly  = Number(price_yearly);
    if (limits      !== undefined) plan.limits       = { ...plan.limits, ...limits };
    if (features    !== undefined) plan.features     = features;
    if (badge       !== undefined) plan.badge        = badge.trim();
    if (is_active   !== undefined) plan.is_active    = Boolean(is_active);
    if (is_public   !== undefined) plan.is_public    = Boolean(is_public);
    if (sort_order  !== undefined) plan.sort_order   = Number(sort_order);

    await plan.save();
    res.json(plan);
  } catch {
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// DELETE /admin/plans/:id
adminRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const inUse = await Organization.countDocuments({ plan_id: req.params.id });
    if (inUse > 0) { res.status(409).json({ error: `Cannot delete — ${inUse} organisation(s) are on this plan` }); return; }
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

// PUT /admin/plans/assign — assign plan to an org (or clear it)
adminRouter.put('/assign', async (req: Request, res: Response): Promise<void> => {
  const { org_id, plan_id, plan_expires_at } = req.body;
  if (!org_id) { res.status(400).json({ error: 'org_id is required' }); return; }
  try {
    const org = await Organization.findById(org_id);
    if (!org) { res.status(404).json({ error: 'Organisation not found' }); return; }
    org.plan_id = plan_id || undefined;
    org.plan_expires_at = plan_expires_at ? new Date(plan_expires_at) : undefined;
    await org.save();
    res.json({ ok: true, org_id: org._id, plan_id: org.plan_id ?? null });
  } catch {
    res.status(500).json({ error: 'Failed to assign plan' });
  }
});

// GET /admin/finance — finance overview
adminRouter.get('/finance', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [plans, orgs, emailsMonth] = await Promise.all([
      Plan.find().lean(),
      Organization.find({}, 'plan_id plan_expires_at created_at').lean(),
      EmailLog.countDocuments({ sent_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
    ]);

    const planMap = Object.fromEntries(plans.map((p) => [p._id, p]));

    const now = new Date();
    let mrr = 0; let arr = 0;
    const distribution: Record<string, { plan_id: string; name: string; count: number; revenue: number }> = {};
    const noplan = { plan_id: 'free', name: 'No Plan (Free)', count: 0, revenue: 0 };

    for (const org of orgs) {
      const expired = org.plan_expires_at && org.plan_expires_at < now;
      const plan = org.plan_id && !expired ? planMap[org.plan_id] : null;

      if (plan) {
        mrr += plan.price_monthly;
        arr += plan.price_yearly > 0 ? plan.price_yearly * 12 : plan.price_monthly * 12;
        if (!distribution[plan._id]) distribution[plan._id] = { plan_id: plan._id, name: plan.name, count: 0, revenue: 0 };
        distribution[plan._id].count++;
        distribution[plan._id].revenue += plan.price_monthly;
      } else {
        noplan.count++;
      }
    }

    if (noplan.count > 0) distribution['free'] = noplan;

    // 12-month MRR trend (rough: use org creation dates as proxy for plan adoption)
    const mrrTrend = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, mrr: 0 };
    });

    // Recent org-plan assignments
    const recentAssignments = orgs
      .filter((o) => o.plan_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((o) => ({ org_id: o._id, plan: planMap[o.plan_id!]?.name ?? '—', created_at: o.created_at }));

    // Estimated total apps using paid plans
    const paidOrgIds = orgs.filter((o) => o.plan_id && (!o.plan_expires_at || o.plan_expires_at > now)).map((o) => o._id);
    const paidUsers  = await User.find({ org_id: { $in: paidOrgIds } }, '_id').lean();
    const paidApps   = await EmailApp.countDocuments({ owner_id: { $in: paidUsers.map((u) => u._id) } });

    res.json({
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      total_orgs: orgs.length,
      paid_orgs: paidOrgIds.length,
      emails_month: emailsMonth,
      paid_apps: paidApps,
      distribution: Object.values(distribution).sort((a, b) => b.count - a.count),
      mrr_trend: mrrTrend,
      recent_assignments: recentAssignments,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch finance data' });
  }
});

export { adminRouter as planAdminRouter };
