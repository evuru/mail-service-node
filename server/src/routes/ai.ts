import { Router, Request, Response } from 'express';
import { requireAuth, requireApiKey } from '../middleware/auth';
import { PlatformConfig } from '../models/PlatformConfig';
import { Organization } from '../models/Organization';
import { AppMember } from '../models/AppMember';
import { callLlm, type LlmConfig } from '../services/llmService';

export const aiRouter = Router();

// ─── Role rank helper ────────────────────────────────────────────────────────

const roleRank: Record<string, number> = { owner: 3, editor: 2, viewer: 1 };

function hasRole(userRole: string, minRole: string): boolean {
  return (roleRank[userRole] ?? 0) >= (roleRank[minRole] ?? 0);
}

// ─── Active LLM config resolver ──────────────────────────────────────────────
// Priority: org config (if enabled + key set) → platform config (if enabled)

async function getActiveLlmConfig(req: Request): Promise<LlmConfig | null> {
  const user = req.user!;

  // 1. Org-level config
  if (user.org_id) {
    const org = await Organization.findById(user.org_id);
    if (org?.llm?.enabled && org.llm.api_key) {
      return org.llm as LlmConfig;
    }
  }

  // 2. Platform fallback
  const platform = await PlatformConfig.findOne();
  if (platform?.llm?.enabled) {
    return platform.llm;
  }

  return null;
}

// ─── Shared access guard (JWT + API key, checks llm_enabled + role) ──────────
// Returns the active LLM config on success, null on failure (response already sent).

async function checkLlmAccess(req: Request, res: Response): Promise<LlmConfig | null> {
  const cfg = await getActiveLlmConfig(req);
  if (!cfg) {
    res.status(403).json({ error: 'AI features are not enabled (configure at platform or org level)' });
    return null;
  }

  const app = req.emailApp!;
  if (!app.llm_enabled) {
    res.status(403).json({ error: 'AI features are not enabled for this app' });
    return null;
  }

  const membership = await AppMember.findOne({ app_id: app._id, user_id: req.user!._id });
  const userRole = membership?.role ?? 'viewer';
  if (!hasRole(userRole, app.llm_min_role)) {
    res.status(403).json({ error: `Your role (${userRole}) does not have access to AI features in this app` });
    return null;
  }

  return cfg;
}

// ─── POST /ai/generate ───────────────────────────────────────────────────────

aiRouter.post('/generate', requireAuth, requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const cfg = await checkLlmAccess(req, res);
  if (!cfg) return;

  const { prompt, type = 'template' } = req.body as { prompt: string; type?: 'template' | 'subject' };
  if (!prompt) { res.status(400).json({ error: 'prompt is required' }); return; }

  try {
    const systemPrompt = type === 'subject'
      ? 'You are an email copywriter. Return ONLY a concise email subject line — no explanation, no quotes, no extra text.'
      : `You are an expert HTML email developer. Write clean, production-ready HTML email templates using Handlebars syntax for dynamic data ({{variableName}}, {{#if condition}}, {{#each list}}).
Rules:
- Return ONLY the HTML body content — no <html>, <head>, or <body> tags (those are added by the layout wrapper)
- Use inline-friendly CSS (no external stylesheets)
- Use {{unsubscribeUrl}} in a footer if appropriate, wrapped in {{#if unsubscribeUrl}}...{{/if}}
- Return ONLY the HTML — no explanation, no markdown code fences`;

    const result = await callLlm(cfg, systemPrompt, prompt);
    res.json(type === 'subject' ? { subject: result.trim() } : { html: result.trim() });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message ?? 'LLM call failed' });
  }
});

// ─── POST /ai/improve ────────────────────────────────────────────────────────

aiRouter.post('/improve', requireAuth, requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const cfg = await checkLlmAccess(req, res);
  if (!cfg) return;

  const { html, instruction } = req.body as { html: string; instruction: string };
  if (!html || !instruction) { res.status(400).json({ error: 'html and instruction are required' }); return; }

  try {
    const result = await callLlm(
      cfg,
      'You are an expert HTML email developer. You will receive an HTML email snippet and an instruction. Apply the instruction and return ONLY the improved HTML — no explanation, no markdown code fences, no surrounding text.',
      `Instruction: ${instruction}\n\nHTML:\n${html}`,
    );
    res.json({ html: result.trim() });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message ?? 'LLM call failed' });
  }
});

// ─── POST /ai/schema ─────────────────────────────────────────────────────────
// Requires JWT only (schemas are not app-scoped).
// Uses org config if available, otherwise platform config.

aiRouter.post('/schema', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const cfg = await getActiveLlmConfig(req);
  if (!cfg) {
    res.status(403).json({ error: 'AI features are not enabled (configure at platform or org level)' });
    return;
  }

  const { description } = req.body as { description: string };
  if (!description) { res.status(400).json({ error: 'description is required' }); return; }

  try {
    const systemPrompt = `You are a data modelling assistant. Given a description of an email's content, return a JSON payload schema.

Return ONLY a valid JSON object with this exact shape — no explanation, no markdown:
{
  "name": "kebab-case-schema-name",
  "description": "one sentence describing the schema",
  "fields": [
    {
      "key": "camelCaseKey",
      "type": "string|number|boolean|array|object",
      "required": true,
      "example": "example value as string",
      "description": "what this field is"
    }
  ]
}`;

    const result = await callLlm(cfg, systemPrompt, description);
    const cleaned = result.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    res.json(JSON.parse(cleaned));
  } catch (err) {
    res.status(502).json({ error: (err as Error).message ?? 'LLM call failed' });
  }
});

// ─── POST /ai/test ───────────────────────────────────────────────────────────
// Superadmin: tests platform config.

aiRouter.post('/test', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({ error: 'Superadmin only' });
    return;
  }
  const cfg = await PlatformConfig.findOne();
  if (!cfg) { res.status(400).json({ error: 'No platform config found' }); return; }

  try {
    const result = await callLlm(cfg.llm, 'You are a helpful assistant.', 'Reply with exactly: "OK"');
    res.json({ ok: true, response: result.trim() });
  } catch (err) {
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});
