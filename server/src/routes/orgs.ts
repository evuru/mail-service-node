import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { Organization, toSlug } from '../models/Organization';
import { User } from '../models/User';
import { Plan } from '../models/Plan';
import { EmailApp } from '../models/EmailApp';
import { Template } from '../models/Template';
import { EmailLog } from '../models/EmailLog';
import type { LlmProvider } from '../models/PlatformConfig';
import { callLlm } from '../services/llmService';

export const orgsRouter = Router();

// All org routes require JWT
orgsRouter.use(requireAuth);

// Strip llm.api_key before sending org to any client.
// The raw key is server-side only — callers get api_key_set: boolean instead.
function safeOrg(org: InstanceType<typeof Organization>) {
  const { llm, ...rest } = org.toObject() as unknown as { llm: { api_key: string; [k: string]: unknown }; [k: string]: unknown };
  const { api_key, ...llmRest } = llm ?? {};
  return { ...rest, llm: { ...llmRest, api_key_set: !!api_key } };
}

// ─── Create org ───────────────────────────────────────────────────────────────

orgsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const user = req.user!;
  if (user.org_id) {
    res.status(409).json({ error: 'You already belong to an organisation' });
    return;
  }
  try {
    let slug = toSlug(name);
    // ensure unique slug
    const existing = await Organization.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now()}`;

    const org = await Organization.create({ name: name.trim(), slug, created_by: user._id });
    user.org_id = org._id;
    user.is_org_admin = true;
    await user.save();
    res.status(201).json(safeOrg(org));
  } catch {
    res.status(500).json({ error: 'Failed to create organisation' });
  }
});

// ─── Get my org ───────────────────────────────────────────────────────────────

orgsRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  if (!user.org_id) {
    res.status(404).json({ error: 'No organisation' });
    return;
  }
  try {
    const org = await Organization.findById(user.org_id);
    if (!org) { res.status(404).json({ error: 'Organisation not found' }); return; }
    res.json(safeOrg(org));
  } catch {
    res.status(500).json({ error: 'Failed to fetch organisation' });
  }
});

// ─── Update my org ────────────────────────────────────────────────────────────

orgsRouter.put('/me', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  if (!user.org_id || !user.is_org_admin) {
    res.status(403).json({ error: 'Only org admins can update the organisation' });
    return;
  }
  try {
    const org = await Organization.findById(user.org_id);
    if (!org) { res.status(404).json({ error: 'Organisation not found' }); return; }

    const { name, logo_base64 } = req.body;
    if (name?.trim()) org.name = name.trim();
    if (logo_base64 !== undefined) org.logo_base64 = logo_base64;
    await org.save();
    res.json(safeOrg(org));
  } catch {
    res.status(500).json({ error: 'Failed to update organisation' });
  }
});

// ─── List org members ─────────────────────────────────────────────────────────

orgsRouter.get('/me/members', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  if (!user.org_id) {
    res.status(404).json({ error: 'No organisation' });
    return;
  }
  try {
    const members = await User.find({ org_id: user.org_id }).select('-password_hash').lean();
    res.json(members);
  } catch {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// ─── Invite user to org (by email) ───────────────────────────────────────────

orgsRouter.post('/me/members', async (req: Request, res: Response): Promise<void> => {
  const caller = req.user!;
  if (!caller.org_id || !caller.is_org_admin) {
    res.status(403).json({ error: 'Only org admins can invite members' });
    return;
  }
  const { email, is_org_admin } = req.body;
  if (!email) { res.status(400).json({ error: 'email is required' }); return; }
  try {
    const target = await User.findOne({ email: email.toLowerCase() });
    if (!target) { res.status(404).json({ error: 'No user with that email' }); return; }
    if (target.org_id && target.org_id !== caller.org_id) {
      res.status(409).json({ error: 'User already belongs to another organisation' });
      return;
    }
    target.org_id = caller.org_id;
    if (is_org_admin !== undefined) target.is_org_admin = Boolean(is_org_admin);
    await target.save();
    res.json({ _id: target._id, name: target.name, email: target.email, is_org_admin: target.is_org_admin });
  } catch {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// ─── Update org member role ───────────────────────────────────────────────────

orgsRouter.put('/me/members/:userId', async (req: Request, res: Response): Promise<void> => {
  const caller = req.user!;
  if (!caller.org_id || !caller.is_org_admin) {
    res.status(403).json({ error: 'Only org admins can manage members' });
    return;
  }
  try {
    const target = await User.findOne({ _id: req.params.userId, org_id: caller.org_id });
    if (!target) { res.status(404).json({ error: 'Member not found' }); return; }
    if (target._id === caller._id) { res.status(400).json({ error: 'Cannot change your own admin status' }); return; }

    const { is_org_admin } = req.body;
    if (is_org_admin !== undefined) target.is_org_admin = Boolean(is_org_admin);
    await target.save();
    res.json({ _id: target._id, name: target.name, email: target.email, is_org_admin: target.is_org_admin });
  } catch {
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// ─── Remove member from org ───────────────────────────────────────────────────

orgsRouter.delete('/me/members/:userId', async (req: Request, res: Response): Promise<void> => {
  const caller = req.user!;
  if (!caller.org_id || !caller.is_org_admin) {
    res.status(403).json({ error: 'Only org admins can remove members' });
    return;
  }
  try {
    const target = await User.findOne({ _id: req.params.userId, org_id: caller.org_id });
    if (!target) { res.status(404).json({ error: 'Member not found' }); return; }
    if (target._id === caller._id) { res.status(400).json({ error: 'Cannot remove yourself' }); return; }
    target.org_id = undefined;
    target.is_org_admin = false;
    await target.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// ─── Get org LLM config ───────────────────────────────────────────────────────

orgsRouter.get('/me/llm', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  if (!user.org_id || !user.is_org_admin) {
    res.status(403).json({ error: 'Only org admins can view AI configuration' });
    return;
  }
  try {
    const org = await Organization.findById(user.org_id);
    if (!org) { res.status(404).json({ error: 'Organisation not found' }); return; }
    const { provider, base_url, model, enabled, api_key } = org.llm;
    res.json({ provider, base_url, model, enabled, api_key_set: !!api_key });
  } catch {
    res.status(500).json({ error: 'Failed to fetch AI configuration' });
  }
});

// ─── Update org LLM config ────────────────────────────────────────────────────

orgsRouter.put('/me/llm', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  if (!user.org_id || !user.is_org_admin) {
    res.status(403).json({ error: 'Only org admins can update AI configuration' });
    return;
  }
  try {
    const org = await Organization.findById(user.org_id);
    if (!org) { res.status(404).json({ error: 'Organisation not found' }); return; }

    const { provider, api_key, base_url, model, enabled } = req.body as {
      provider?: LlmProvider;
      api_key?: string;
      base_url?: string;
      model?: string;
      enabled?: boolean;
    };

    if (provider !== undefined) org.llm.provider = provider;
    if (api_key !== undefined && api_key !== '') org.llm.api_key = api_key;
    if (base_url !== undefined) org.llm.base_url = base_url;
    if (model !== undefined) org.llm.model = model;
    if (enabled !== undefined) org.llm.enabled = Boolean(enabled);

    await org.save();
    const { provider: p, base_url: bu, model: m, enabled: en, api_key: ak } = org.llm;
    res.json({ provider: p, base_url: bu, model: m, enabled: en, api_key_set: !!ak });
  } catch {
    res.status(500).json({ error: 'Failed to update AI configuration' });
  }
});

// ─── Test org LLM config ──────────────────────────────────────────────────────

orgsRouter.post('/me/llm/test', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  if (!user.org_id || !user.is_org_admin) {
    res.status(403).json({ error: 'Only org admins can test AI configuration' });
    return;
  }
  try {
    const org = await Organization.findById(user.org_id);
    if (!org) { res.status(404).json({ error: 'Organisation not found' }); return; }
    if (!org.llm.enabled || !org.llm.api_key) {
      res.status(400).json({ error: 'Org AI is not configured or not enabled' });
      return;
    }
    const result = await callLlm(org.llm, 'You are a helpful assistant.', 'Reply with exactly: "OK"');
    res.json({ ok: true, response: result.trim() });
  } catch (err) {
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});

// ─── Get org verification config ─────────────────────────────────────────────

orgsRouter.get('/me/verification', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  if (!user.org_id || !user.is_org_admin) {
    res.status(403).json({ error: 'Only org admins can view verification settings' });
    return;
  }
  try {
    const org = await Organization.findById(user.org_id);
    if (!org) { res.status(404).json({ error: 'Organisation not found' }); return; }
    res.json({ require_phone: org.verification?.require_phone ?? false });
  } catch {
    res.status(500).json({ error: 'Failed to fetch verification settings' });
  }
});

// ─── Update org verification config ──────────────────────────────────────────

orgsRouter.put('/me/verification', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  if (!user.org_id || !user.is_org_admin) {
    res.status(403).json({ error: 'Only org admins can update verification settings' });
    return;
  }
  try {
    const org = await Organization.findById(user.org_id);
    if (!org) { res.status(404).json({ error: 'Organisation not found' }); return; }
    const { require_phone } = req.body;
    if (require_phone !== undefined) org.verification.require_phone = Boolean(require_phone);
    await org.save();
    res.json({ require_phone: org.verification.require_phone });
  } catch {
    res.status(500).json({ error: 'Failed to update verification settings' });
  }
});

// ─── Get current plan + org usage stats ──────────────────────────────────────

orgsRouter.get('/me/plan', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  if (!user.org_id) { res.status(404).json({ error: 'No organisation' }); return; }
  try {
    const org = await Organization.findById(user.org_id).lean();
    if (!org) { res.status(404).json({ error: 'Organisation not found' }); return; }

    const plan = org.plan_id ? await Plan.findById(org.plan_id).lean() : null;
    const expired = org.plan_expires_at && org.plan_expires_at < new Date();

    // Aggregate org-level usage
    const orgMembers = await User.find({ org_id: user.org_id }, '_id').lean();
    const orgMemberIds = orgMembers.map((u) => u._id);
    const member_count = orgMembers.length;

    const orgApps = await EmailApp.find({ owner_id: { $in: orgMemberIds } }, '_id').lean();
    const orgAppIds = orgApps.map((a) => a._id);
    const app_count = orgApps.length;

    const template_count = await Template.countDocuments({ app_id: { $in: orgAppIds } });

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const emails_month = await EmailLog.countDocuments({
      app_id: { $in: orgAppIds },
      sent_at: { $gte: monthAgo },
    });

    res.json({
      plan: expired ? null : plan,
      plan_id: expired ? null : (org.plan_id ?? null),
      plan_expires_at: org.plan_expires_at ?? null,
      usage: { member_count, app_count, template_count, emails_month },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// POST /orgs/me/plan — self-serve plan selection (no payment — honour system)
orgsRouter.post('/me/plan', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  if (!user.org_id || !user.is_org_admin) {
    res.status(403).json({ error: 'Only org admins can change the plan' });
    return;
  }
  const { plan_id } = req.body;
  try {
    const org = await Organization.findById(user.org_id);
    if (!org) { res.status(404).json({ error: 'Organisation not found' }); return; }

    if (plan_id) {
      const plan = await Plan.findOne({ _id: plan_id, is_active: true, is_public: true });
      if (!plan) { res.status(404).json({ error: 'Plan not found or unavailable' }); return; }
      org.plan_id = plan._id;
      org.plan_expires_at = undefined;
    } else {
      // Downgrade to no plan
      org.plan_id = undefined;
      org.plan_expires_at = undefined;
    }

    await org.save();
    res.json({ ok: true, plan_id: org.plan_id ?? null });
  } catch {
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// ─── Join org by invite code / slug (self-service) ───────────────────────────
// Superadmin can assign any user to any org

orgsRouter.post('/join', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { org_id } = req.body;
  if (!org_id) { res.status(400).json({ error: 'org_id is required' }); return; }
  try {
    const org = await Organization.findById(org_id);
    if (!org) { res.status(404).json({ error: 'Organisation not found' }); return; }
    if (user.org_id && user.org_id !== org_id) {
      res.status(409).json({ error: 'Already in another organisation' });
      return;
    }
    user.org_id = org._id;
    await user.save();
    res.json(safeOrg(org));
  } catch {
    res.status(500).json({ error: 'Failed to join organisation' });
  }
});
