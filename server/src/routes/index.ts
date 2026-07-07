import { Router, Request, Response } from 'express';
import { sendRouter } from './send';
import { templatesRouter } from './templates';
import { logsRouter } from './logs';
import { previewRouter } from './preview';
import { payloadSchemasRouter } from './payloadSchemas';
import { authRouter } from './auth';
import { appsRouter } from './apps';
import { smtpProvidersRouter } from './smtpProviders';
import { adminRouter } from './admin';
import { unsubscribeRouter } from './unsubscribe';
import { platformRouter } from './platform';
import { aiRouter } from './ai';
import { orgsRouter } from './orgs';
import { plansRouter, planAdminRouter } from './plans';
import { apiLimiter, authLimiter, sendLimiter, aiLimiter } from '../middleware/rateLimit';
import { EmailApp } from '../models/EmailApp';

export const apiRoutes = Router();

// Broad limiter on everything — tighter limiters below override per-route
apiRoutes.use(apiLimiter);

// Auth — strict brute-force protection
apiRoutes.use('/auth', authLimiter, authRouter);

// Unsubscribe (public — embedded in email links)
apiRoutes.use('/unsubscribe', unsubscribeRouter);

// Alias verification (public — linked from verification emails)
apiRoutes.get('/verify-alias', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query as { token?: string };
  const clientUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');

  if (!token) {
    res.status(400).send('Missing token');
    return;
  }

  const app = await EmailApp.findOne({ 'aliases.token': token });
  if (!app) {
    res.status(400).send('Invalid or expired verification link');
    return;
  }

  const alias = app.aliases.find((a) => a.token === token);
  if (!alias) {
    res.status(400).send('Invalid or expired verification link');
    return;
  }

  if (alias.token_expires_at && alias.token_expires_at < new Date()) {
    res.status(400).send('Verification link has expired — please request a new one from App Settings');
    return;
  }

  alias.verified = true;
  alias.token = undefined;
  alias.token_expires_at = undefined;
  await app.save();

  // Redirect to the app settings aliases tab, or return JSON for non-browser callers
  const redirectTo = `${clientUrl}/apps/${app._id}/settings?tab=aliases`;
  if (clientUrl) {
    res.redirect(redirectTo);
  } else {
    res.json({ ok: true, alias: alias.name });
  }
});

// SMTP provider presets (public)
apiRoutes.use('/smtp-providers', smtpProvidersRouter);

// App management (JWT auth)
apiRoutes.use('/apps', appsRouter);

// Organisation management (JWT auth)
apiRoutes.use('/orgs', orgsRouter);

// Public plans list
apiRoutes.use('/plans', plansRouter);

// Admin (JWT + superadmin)
apiRoutes.use('/admin', adminRouter);

// Platform config (JWT + superadmin — nested under admin)
apiRoutes.use('/admin/platform', platformRouter);

// Plan admin (JWT + superadmin — nested under admin)
apiRoutes.use('/admin/plans', planAdminRouter);

// AI generation — expensive LLM calls, tighter limit
apiRoutes.use('/ai', aiLimiter, aiRouter);

// Send routes — per-minute cap to protect SMTP provider quotas
apiRoutes.use('/send', sendLimiter, sendRouter);
apiRoutes.use('/templates', templatesRouter);
apiRoutes.use('/logs', logsRouter);
apiRoutes.use('/preview', previewRouter);
apiRoutes.use('/payload-schemas', payloadSchemasRouter);
