import { Router, Request, Response } from 'express';
import { requireApiKey } from '../middleware/auth';
import { sendLimiter } from '../middleware/rateLimit';
import { sendEmail } from '../services/emailService';

export const sendRouter = Router();

sendRouter.post('/', requireApiKey, sendLimiter, async (req: Request, res: Response): Promise<void> => {
  const { template_slug, recipient, data } = req.body;

  if (!template_slug || typeof template_slug !== 'string') {
    res.status(400).json({ error: 'template_slug (string) is required' });
    return;
  }
  if (!recipient || typeof recipient !== 'string') {
    res.status(400).json({ error: 'recipient (string) is required' });
    return;
  }
  if (data !== undefined && (typeof data !== 'object' || data === null || Array.isArray(data))) {
    res.status(400).json({ error: 'data must be a plain object' });
    return;
  }

  try {
    const result = await sendEmail({ template_slug, recipient, data: data ?? {}, app: req.emailApp! });
    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ success: false, error: message });
  }
});
