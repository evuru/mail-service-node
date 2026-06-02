import { Router } from 'express';
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

export const apiRoutes = Router();

// Broad limiter on everything — tighter limiters below override per-route
apiRoutes.use(apiLimiter);

// Auth — strict brute-force protection
apiRoutes.use('/auth', authLimiter, authRouter);

// Unsubscribe (public — embedded in email links)
apiRoutes.use('/unsubscribe', unsubscribeRouter);

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
