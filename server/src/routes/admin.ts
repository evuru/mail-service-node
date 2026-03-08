import { Router, Request, Response } from 'express';
import { requireAuth, requireSuperadmin } from '../middleware/auth';
import { User, hashPassword } from '../models/User';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireSuperadmin);

// GET /admin/users
adminRouter.get('/users', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({}, '-password_hash').sort({ created_at: -1 });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /admin/users/:id
adminRouter.put('/users/:id', async (req: Request, res: Response): Promise<void> => {
  const { name, email, role, is_active, new_password } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email.toLowerCase();
    if (role !== undefined && ['superadmin', 'user'].includes(role)) user.role = role;
    if (is_active !== undefined) user.is_active = is_active;
    if (new_password) {
      if (new_password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }
      user.password_hash = await hashPassword(new_password);
    }
    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, is_active: user.is_active });
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
    res.json({ message: 'User deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});
