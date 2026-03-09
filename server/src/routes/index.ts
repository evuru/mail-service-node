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
import { apiLimiter } from '../middleware/rateLimit';

export const apiRoutes = Router();

apiRoutes.use(apiLimiter);

// Auth (no API key required)
apiRoutes.use('/auth', authRouter);

// Unsubscribe (public — embedded in email links)
apiRoutes.use('/unsubscribe', unsubscribeRouter);

// SMTP provider presets (public)
apiRoutes.use('/smtp-providers', smtpProvidersRouter);

// App management (JWT auth)
apiRoutes.use('/apps', appsRouter);

// Admin (JWT + superadmin)
apiRoutes.use('/admin', adminRouter);

// Platform config (JWT + superadmin — nested under admin)
apiRoutes.use('/admin/platform', platformRouter);

// AI generation (JWT + API key — role-checked per request)
apiRoutes.use('/ai', aiRouter);

// App-scoped routes (API key auth via requireApiKey inside each router)
apiRoutes.use('/send', sendRouter);
apiRoutes.use('/templates', templatesRouter);
apiRoutes.use('/logs', logsRouter);
apiRoutes.use('/preview', previewRouter);
apiRoutes.use('/payload-schemas', payloadSchemasRouter);
