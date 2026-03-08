import { Router, Request, Response } from 'express';
import { requireApiKey } from '../middleware/auth';
import { EmailLog } from '../models/EmailLog';

export const logsRouter = Router();

logsRouter.use(requireApiKey);

logsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const { status, template_slug } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = { app_id: req.emailApp!._id };
  if (status && ['success', 'failed'].includes(status)) filter.status = status;
  if (template_slug) filter.template_slug = template_slug;

  try {
    const [logs, total] = await Promise.all([
      EmailLog.find(filter).sort({ sent_at: -1 }).skip((page - 1) * limit).limit(limit),
      EmailLog.countDocuments(filter),
    ]);
    res.json({ logs, total, page, limit, pages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

logsRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const log = await EmailLog.findOneAndDelete({ _id: req.params.id, app_id: req.emailApp!._id });
    if (!log) { res.status(404).json({ error: 'Log not found' }); return; }
    res.json({ message: 'Log deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete log' });
  }
});
