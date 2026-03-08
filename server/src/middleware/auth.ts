import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { EmailApp } from '../models/EmailApp';
import { User } from '../models/User';

// ─── API Key — resolves to an EmailApp ──────────────────────────────────────

export const requireApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const key = req.headers['x-api-key'] as string | undefined;
  if (!key) {
    res.status(401).json({ error: 'Missing X-API-KEY header' });
    return;
  }
  try {
    const app = await EmailApp.findOne({ api_key: key });
    if (!app) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
    req.emailApp = app;
    next();
  } catch {
    res.status(500).json({ error: 'Auth check failed' });
  }
};

// ─── JWT — resolves to a User ────────────────────────────────────────────────

const getSecret = (): string => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET env var is not set');
  return s;
};

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: '7d' });
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getSecret()) as { sub: string };
    const user = await User.findById(payload.sub);
    if (!user || !user.is_active) {
      res.status(401).json({ error: 'User not found or deactivated' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireSuperadmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({ error: 'Superadmin access required' });
    return;
  }
  next();
};
