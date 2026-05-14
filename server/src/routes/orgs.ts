import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { Organization, toSlug } from '../models/Organization';
import { User } from '../models/User';

export const orgsRouter = Router();

// All org routes require JWT
orgsRouter.use(requireAuth);

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
    res.status(201).json(org);
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
    res.json(org);
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
    res.json(org);
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
    res.json(org);
  } catch {
    res.status(500).json({ error: 'Failed to join organisation' });
  }
});
