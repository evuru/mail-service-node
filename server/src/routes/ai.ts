import { Router, Request, Response } from 'express';
import { requireAuth, requireApiKey } from '../middleware/auth';
import { PlatformConfig } from '../models/PlatformConfig';
import { AppMember } from '../models/AppMember';
import type { IPlatformConfig } from '../models/PlatformConfig';

export const aiRouter = Router();

// ─── Role rank helper ────────────────────────────────────────────────────────

const roleRank: Record<string, number> = { owner: 3, editor: 2, viewer: 1 };

function hasRole(userRole: string, minRole: string): boolean {
  return (roleRank[userRole] ?? 0) >= (roleRank[minRole] ?? 0);
}

// ─── LLM caller ──────────────────────────────────────────────────────────────

async function callLlm(cfg: IPlatformConfig['llm'], systemPrompt: string, userPrompt: string): Promise<string> {
  const { provider, api_key, base_url, model } = cfg;

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${api_key}`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
    };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string; status?: string } };
      const msg = errBody?.error?.message ?? `HTTP ${res.status}`;
      const status = errBody?.error?.status ?? '';
      if (res.status === 429) throw new Error(`Gemini rate limit / quota exceeded (${status || 'RESOURCE_EXHAUSTED'}): ${msg}. Check your quota at https://aistudio.google.com or switch to a model with a higher free limit (e.g. gemini-2.0-flash-lite).`);
      throw new Error(`Gemini API error ${res.status} (${status}): ${msg}`);
    }
    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  if (provider === 'openai' || provider === 'openai-compatible') {
    const endpoint = base_url ? `${base_url.replace(/\/$/, '')}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api_key}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`OpenAI API error ${res.status}: ${errBody?.error?.message ?? 'Unknown error'}`);
    }
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? '';
  }

  if (provider === 'anthropic') {
    const body = {
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    };
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': api_key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`Anthropic API error ${res.status}: ${errBody?.error?.message ?? 'Unknown error'}`);
    }
    const data = await res.json() as { content?: { type: string; text?: string }[] };
    return data.content?.find((b) => b.type === 'text')?.text ?? '';
  }

  if (provider === 'ollama') {
    const endpoint = `${(base_url || 'http://localhost:11434').replace(/\/$/, '')}/api/chat`;
    const body = {
      model,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    };
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);
    const data = await res.json() as { message?: { content?: string } };
    return data.message?.content ?? '';
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

// ─── Shared access guard (JWT + API key required, checks llm_enabled + role) ─

async function checkLlmAccess(req: Request, res: Response): Promise<boolean> {
  const cfg = await PlatformConfig.findOne();
  if (!cfg?.llm?.enabled) {
    res.status(403).json({ error: 'AI features are not enabled on this platform' });
    return false;
  }

  const app = req.emailApp!;
  if (!app.llm_enabled) {
    res.status(403).json({ error: 'AI features are not enabled for this app' });
    return false;
  }

  const membership = await AppMember.findOne({ app_id: app._id, user_id: req.user!._id });
  const userRole = membership?.role ?? 'viewer';
  if (!hasRole(userRole, app.llm_min_role)) {
    res.status(403).json({ error: `Your role (${userRole}) does not have access to AI features in this app` });
    return false;
  }

  return true;
}

// ─── POST /ai/generate ───────────────────────────────────────────────────────
// Requires: JWT + X-API-KEY

aiRouter.post('/generate', requireAuth, requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const allowed = await checkLlmAccess(req, res);
  if (!allowed) return;

  const { prompt, type = 'template' } = req.body as { prompt: string; type?: 'template' | 'subject' };
  if (!prompt) { res.status(400).json({ error: 'prompt is required' }); return; }

  const cfg = await PlatformConfig.findOne();

  try {
    const systemPrompt = type === 'subject'
      ? 'You are an email copywriter. Return ONLY a concise email subject line — no explanation, no quotes, no extra text.'
      : `You are an expert HTML email developer. Write clean, production-ready HTML email templates using Handlebars syntax for dynamic data ({{variableName}}, {{#if condition}}, {{#each list}}).
Rules:
- Return ONLY the HTML body content — no <html>, <head>, or <body> tags (those are added by the layout wrapper)
- Use inline-friendly CSS (no external stylesheets)
- Use {{unsubscribeUrl}} in a footer if appropriate, wrapped in {{#if unsubscribeUrl}}...{{/if}}
- Return ONLY the HTML — no explanation, no markdown code fences`;

    const result = await callLlm(cfg!.llm, systemPrompt, prompt);

    if (type === 'subject') {
      res.json({ subject: result.trim() });
    } else {
      res.json({ html: result.trim() });
    }
  } catch (err) {
    res.status(502).json({ error: (err as Error).message ?? 'LLM call failed' });
  }
});

// ─── POST /ai/improve ────────────────────────────────────────────────────────
// Requires: JWT + X-API-KEY

aiRouter.post('/improve', requireAuth, requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const allowed = await checkLlmAccess(req, res);
  if (!allowed) return;

  const { html, instruction } = req.body as { html: string; instruction: string };
  if (!html || !instruction) { res.status(400).json({ error: 'html and instruction are required' }); return; }

  const cfg = await PlatformConfig.findOne();

  try {
    const systemPrompt = `You are an expert HTML email developer. You will receive an HTML email snippet and an instruction. Apply the instruction and return ONLY the improved HTML — no explanation, no markdown code fences, no surrounding text.`;
    const userPrompt = `Instruction: ${instruction}\n\nHTML:\n${html}`;

    const result = await callLlm(cfg!.llm, systemPrompt, userPrompt);
    res.json({ html: result.trim() });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message ?? 'LLM call failed' });
  }
});

// ─── POST /ai/schema ─────────────────────────────────────────────────────────
// Requires: JWT only (schemas are not app-scoped)

aiRouter.post('/schema', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const cfg = await PlatformConfig.findOne();
  if (!cfg?.llm?.enabled) {
    res.status(403).json({ error: 'AI features are not enabled on this platform' });
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

    const result = await callLlm(cfg.llm, systemPrompt, description);

    // Strip markdown fences if the model wraps in ```json ... ```
    const cleaned = result.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message ?? 'LLM call failed' });
  }
});

// ─── POST /ai/test ───────────────────────────────────────────────────────────
// Superadmin: test the configured LLM connection

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
