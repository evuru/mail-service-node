import { Router, Request, Response } from 'express';
import { requireApiKey } from '../middleware/auth';
import { EmailLog } from '../models/EmailLog';
import { Template } from '../models/Template';

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

// GET /logs/stats — app-scoped dashboard stats
logsRouter.get('/stats', async (req: Request, res: Response): Promise<void> => {
  const appId = req.emailApp!._id;
  const now   = new Date();
  const d30   = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d7    = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);
  try {
    const [totalTemplates, emails30d, emails7d, chartRaw, recentLogs, successCount] = await Promise.all([
      Template.countDocuments({ app_id: appId }),
      EmailLog.countDocuments({ app_id: appId, sent_at: { $gte: d30 } }),
      EmailLog.countDocuments({ app_id: appId, sent_at: { $gte: d7 } }),
      EmailLog.aggregate([
        { $match: { app_id: appId, sent_at: { $gte: d30 } } },
        { $group: {
          _id: { y: { $year: '$sent_at' }, m: { $month: '$sent_at' }, d: { $dayOfMonth: '$sent_at' } },
          total:   { $sum: 1 },
          success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failed:  { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        }},
        { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
      ]),
      EmailLog.find({ app_id: appId }).sort({ sent_at: -1 }).limit(8).lean(),
      EmailLog.countDocuments({ app_id: appId, status: 'success', sent_at: { $gte: d30 } }),
    ]);

    const successRate = emails30d > 0 ? Math.round((successCount / emails30d) * 100) : 100;
    const chart = chartRaw.map((r) => ({
      date:    `${r._id.y}-${String(r._id.m).padStart(2, '0')}-${String(r._id.d).padStart(2, '0')}`,
      total:   r.total, success: r.success, failed: r.failed,
    }));

    res.json({ total_templates: totalTemplates, emails_30d: emails30d, emails_7d: emails7d, success_rate: successRate, chart, recent_logs: recentLogs });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
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
