import { Router, Request, Response } from 'express';
import { User, IUser, hashPassword } from '../models/User';
import { Organization } from '../models/Organization';
import { requireAuth, signToken } from '../middleware/auth';

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
  };
}

// POST /auth/register
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;
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
    const created = await User.create({ name, email, password_hash, role });
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

    const token = signToken(user._id);
    res.status(201).json({ token, user: userPayload(user) });
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
  const { name, email, password, profile_image_base64 } = req.body;
  const user = req.user!;
  try {
    if (name !== undefined) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (profile_image_base64 !== undefined) {
      // Guard against huge payloads (base64 ~1.37× original — 300KB file ≈ 410KB base64)
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
