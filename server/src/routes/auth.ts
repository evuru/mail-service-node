import { Router, Request, Response } from 'express';
import { User, hashPassword } from '../models/User';
import { requireAuth, signToken } from '../middleware/auth';

export const authRouter = Router();

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
    // First user ever becomes superadmin
    const count = await User.countDocuments();
    const role = count === 0 ? 'superadmin' : 'user';
    const password_hash = await hashPassword(password);
    const user = await User.create({ name, email, password_hash, role });
    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
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
      res.status(401).json({ error: 'Invalid email or password inactive' });
      return;
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      res.status(401).json({ error: 'Invalid email or password compare' });
      return;
    }
    const token = signToken(user._id);
    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /auth/me
authRouter.get('/me', requireAuth, (req: Request, res: Response): void => {
  const u = req.user!;
  res.json({ _id: u._id, name: u.name, email: u.email, role: u.role });
});

// PUT /auth/me
authRouter.put('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;
  const user = req.user!;
  try {
    if (name !== undefined) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (password) {
      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }
      user.password_hash = await hashPassword(password);
    }
    await user.save();
    const token = signToken(user._id);
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, is_active: user.is_active } });
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
});
