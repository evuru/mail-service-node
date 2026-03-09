import { Router, Request, Response } from 'express';
import { requireAuth, requireSuperadmin } from '../middleware/auth';
import { PlatformConfig } from '../models/PlatformConfig';
import type { LlmProvider } from '../models/PlatformConfig';

export const platformRouter = Router();

platformRouter.use(requireAuth, requireSuperadmin);

const VALID_PROVIDERS: LlmProvider[] = ['openai', 'anthropic', 'gemini', 'ollama', 'openai-compatible'];

// GET /admin/platform  — return config with api_key masked
platformRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const cfg = await PlatformConfig.findOne();
    if (!cfg) {
      res.json({
        llm: { provider: 'gemini', api_key_set: false, base_url: '', model: 'gemini-2.0-flash', enabled: false },
      });
      return;
    }
    res.json({
      llm: {
        provider:   cfg.llm.provider,
        api_key_set: cfg.llm.api_key.length > 0,
        base_url:   cfg.llm.base_url,
        model:      cfg.llm.model,
        enabled:    cfg.llm.enabled,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch platform config' });
  }
});

// PUT /admin/platform  — upsert config
platformRouter.put('/', async (req: Request, res: Response): Promise<void> => {
  const { provider, api_key, base_url, model, enabled } = req.body.llm ?? {};

  if (provider !== undefined && !VALID_PROVIDERS.includes(provider)) {
    res.status(400).json({ error: 'Invalid LLM provider' });
    return;
  }

  try {
    let cfg = await PlatformConfig.findOne();
    if (!cfg) {
      cfg = new PlatformConfig({
        llm: { provider: 'gemini', api_key: '', base_url: '', model: 'gemini-2.0-flash', enabled: false },
      });
    }

    if (provider  !== undefined) cfg.llm.provider  = provider;
    if (api_key   !== undefined && api_key !== '') cfg.llm.api_key = api_key; // only update if non-empty
    if (base_url  !== undefined) cfg.llm.base_url  = base_url;
    if (model     !== undefined) cfg.llm.model     = model;
    if (enabled   !== undefined) cfg.llm.enabled   = enabled;

    await cfg.save();

    res.json({
      llm: {
        provider:    cfg.llm.provider,
        api_key_set: cfg.llm.api_key.length > 0,
        base_url:    cfg.llm.base_url,
        model:       cfg.llm.model,
        enabled:     cfg.llm.enabled,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to update platform config' });
  }
});
