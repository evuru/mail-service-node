import { Router, Request, Response } from 'express';
import { requireApiKey } from '../middleware/auth';
import { renderTemplate } from '../services/emailService';
import Handlebars from 'handlebars';
import juice from 'juice';

export const previewRouter = Router();

// Render a saved template with data (no DB log)
previewRouter.post('/', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const { template_slug, data = {} } = req.body;
  if (!template_slug) { res.status(400).json({ error: 'template_slug is required' }); return; }
  try {
    const result = await renderTemplate(template_slug, data, req.emailApp!);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Render raw HTML with Handlebars + juice (live editor preview)
previewRouter.post('/raw', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const { html, data = {} } = req.body;
  if (!html) { res.status(400).json({ error: 'html is required' }); return; }
  try {
    const globalVars = {
      appName: req.emailApp!.app_name || 'Mail Service',
      year: new Date().getFullYear().toString(),
    };
    const mergedData = { ...globalVars, ...data };
    const rendered = Handlebars.compile(html)(mergedData);
    const inlined = juice(rendered);
    res.json({ html: inlined });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});
