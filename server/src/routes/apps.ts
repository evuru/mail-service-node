import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { EmailApp } from '../models/EmailApp';
import { AppMember } from '../models/AppMember';
import { User } from '../models/User';
import { clearAppTransporter } from '../config/smtp';
import { v4 as uuidv4 } from 'uuid';

export const appsRouter = Router();

// All app routes require a logged-in user
appsRouter.use(requireAuth);

// ─── List apps the current user belongs to ──────────────────────────────────

appsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const memberships = await AppMember.find({ user_id: req.user!._id });
    const appIds = memberships.map((m) => m.app_id);
    const apps = await EmailApp.find({ _id: { $in: appIds } }).sort({ created_at: -1 });
    const roleMap = Object.fromEntries(memberships.map((m) => [m.app_id, m.role]));
    res.json(apps.map((a) => ({ ...a.toObject(), my_role: roleMap[a._id] })));
  } catch {
    res.status(500).json({ error: 'Failed to fetch apps' });
  }
});

// ─── Create app ──────────────────────────────────────────────────────────────

appsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const { app_name, app_url, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from_name } = req.body;
  if (!app_name) {
    res.status(400).json({ error: 'app_name is required' });
    return;
  }
  try {
    const app = await EmailApp.create({
      app_name,
      owner_id: req.user!._id,
      app_url: app_url || '',
      smtp_host: smtp_host || '',
      smtp_port: smtp_port || 587,
      smtp_secure: smtp_secure ?? false,
      smtp_user: smtp_user || '',
      smtp_pass: smtp_pass || '',
      smtp_from_name: smtp_from_name || app_name,
    });
    // Auto-add creator as owner member
    await AppMember.create({ app_id: app._id, user_id: req.user!._id, role: 'owner' });
    res.status(201).json({ ...app.toObject(), my_role: 'owner' });
  } catch {
    res.status(500).json({ error: 'Failed to create app' });
  }
});

// ─── Get single app ──────────────────────────────────────────────────────────

appsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const membership = await AppMember.findOne({ app_id: req.params.id, user_id: req.user!._id });
    if (!membership) { res.status(404).json({ error: 'App not found' }); return; }
    const app = await EmailApp.findById(req.params.id);
    if (!app) { res.status(404).json({ error: 'App not found' }); return; }
    res.json({ ...app.toObject(), my_role: membership.role });
  } catch {
    res.status(500).json({ error: 'Failed to fetch app' });
  }
});

// ─── Update app (owner or editor for name/app_name; owner only for SMTP) ────

appsRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const membership = await AppMember.findOne({ app_id: req.params.id, user_id: req.user!._id });
    if (!membership) { res.status(404).json({ error: 'App not found' }); return; }
    if (!['owner', 'editor'].includes(membership.role)) {
      res.status(403).json({ error: 'Editor or owner role required' });
      return;
    }
    const { app_name, app_url, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from_name } = req.body;

    // SMTP changes are owner-only
    const smtpFields = { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from_name };
    const hasSmtpChange = Object.values(smtpFields).some((v) => v !== undefined);
    if (hasSmtpChange && membership.role !== 'owner') {
      res.status(403).json({ error: 'Only the app owner can update SMTP settings' });
      return;
    }

    const update: Record<string, unknown> = {};
    if (app_name !== undefined) update.app_name = app_name;
    if (app_url !== undefined) update.app_url = app_url;
    if (hasSmtpChange && membership.role === 'owner') {
      if (smtp_host !== undefined) update.smtp_host = smtp_host;
      if (smtp_port !== undefined) update.smtp_port = smtp_port;
      if (smtp_secure !== undefined) update.smtp_secure = smtp_secure;
      if (smtp_user !== undefined) update.smtp_user = smtp_user;
      if (smtp_pass !== undefined) update.smtp_pass = smtp_pass;
      if (smtp_from_name !== undefined) update.smtp_from_name = smtp_from_name;
      clearAppTransporter(req.params.id);
    }

    const app = await EmailApp.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ ...app!.toObject(), my_role: membership.role });
  } catch {
    res.status(500).json({ error: 'Failed to update app' });
  }
});

// ─── Delete app (owner only) ─────────────────────────────────────────────────

appsRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const membership = await AppMember.findOne({ app_id: req.params.id, user_id: req.user!._id });
    if (!membership || membership.role !== 'owner') {
      res.status(403).json({ error: 'Only the app owner can delete this app' });
      return;
    }
    await EmailApp.findByIdAndDelete(req.params.id);
    await AppMember.deleteMany({ app_id: req.params.id });
    clearAppTransporter(req.params.id);
    res.json({ message: 'App deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete app' });
  }
});

// ─── Regenerate API key (owner only) ────────────────────────────────────────

appsRouter.post('/:id/regenerate-key', async (req: Request, res: Response): Promise<void> => {
  try {
    const membership = await AppMember.findOne({ app_id: req.params.id, user_id: req.user!._id });
    if (!membership || membership.role !== 'owner') {
      res.status(403).json({ error: 'Only the app owner can regenerate the API key' });
      return;
    }
    const app = await EmailApp.findByIdAndUpdate(
      req.params.id,
      { api_key: uuidv4() },
      { new: true }
    );
    res.json({ api_key: app!.api_key });
  } catch {
    res.status(500).json({ error: 'Failed to regenerate key' });
  }
});

// ─── Members ─────────────────────────────────────────────────────────────────

appsRouter.get('/:id/members', async (req: Request, res: Response): Promise<void> => {
  try {
    const membership = await AppMember.findOne({ app_id: req.params.id, user_id: req.user!._id });
    if (!membership) { res.status(404).json({ error: 'App not found' }); return; }
    const members = await AppMember.find({ app_id: req.params.id });
    const userIds = members.map((m) => m.user_id);
    const users = await User.find({ _id: { $in: userIds } }, 'name email');
    const userMap = Object.fromEntries(users.map((u) => [u._id, u]));
    res.json(members.map((m) => ({
      _id: m._id,
      role: m.role,
      created_at: m.created_at,
      user: userMap[m.user_id] ? { _id: userMap[m.user_id]._id, name: userMap[m.user_id].name, email: userMap[m.user_id].email } : null,
    })));
  } catch {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

appsRouter.post('/:id/members', async (req: Request, res: Response): Promise<void> => {
  try {
    const membership = await AppMember.findOne({ app_id: req.params.id, user_id: req.user!._id });
    if (!membership || membership.role !== 'owner') {
      res.status(403).json({ error: 'Only the app owner can manage members' });
      return;
    }
    const { email, role } = req.body;
    if (!email || !role) { res.status(400).json({ error: 'email and role are required' }); return; }
    if (!['editor', 'viewer'].includes(role)) {
      res.status(400).json({ error: 'role must be editor or viewer' });
      return;
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const existing = await AppMember.findOne({ app_id: req.params.id, user_id: user._id });
    if (existing) { res.status(409).json({ error: 'User is already a member' }); return; }
    const member = await AppMember.create({ app_id: req.params.id, user_id: user._id, role });
    res.status(201).json({ ...member.toObject(), user: { _id: user._id, name: user.name, email: user.email } });
  } catch {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

appsRouter.put('/:id/members/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const membership = await AppMember.findOne({ app_id: req.params.id, user_id: req.user!._id });
    if (!membership || membership.role !== 'owner') {
      res.status(403).json({ error: 'Only the app owner can manage members' });
      return;
    }
    const { role } = req.body;
    if (!['editor', 'viewer'].includes(role)) {
      res.status(400).json({ error: 'role must be editor or viewer' });
      return;
    }
    const target = await AppMember.findOneAndUpdate(
      { app_id: req.params.id, user_id: req.params.userId },
      { role },
      { new: true }
    );
    if (!target) { res.status(404).json({ error: 'Member not found' }); return; }
    res.json(target);
  } catch {
    res.status(500).json({ error: 'Failed to update member' });
  }
});

appsRouter.delete('/:id/members/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const membership = await AppMember.findOne({ app_id: req.params.id, user_id: req.user!._id });
    if (!membership || membership.role !== 'owner') {
      res.status(403).json({ error: 'Only the app owner can manage members' });
      return;
    }
    // Can't remove yourself if you're the only owner
    if (req.params.userId === req.user!._id) {
      res.status(400).json({ error: 'Cannot remove yourself from the app' });
      return;
    }
    await AppMember.findOneAndDelete({ app_id: req.params.id, user_id: req.params.userId });
    res.json({ message: 'Member removed' });
  } catch {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});
