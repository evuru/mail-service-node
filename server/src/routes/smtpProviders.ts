import { Router, Request, Response } from 'express';
import { SMTP_PROVIDERS } from '../config/smtpProviders';

export const smtpProvidersRouter = Router();

// Public endpoint — no auth required
smtpProvidersRouter.get('/', (_req: Request, res: Response): void => {
  res.json(SMTP_PROVIDERS);
});
