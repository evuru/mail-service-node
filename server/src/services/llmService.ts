import type { IPlatformConfig } from '../models/PlatformConfig';

export type LlmConfig = IPlatformConfig['llm'];

export async function callLlm(cfg: LlmConfig, systemPrompt: string, userPrompt: string): Promise<string> {
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
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api_key}` },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`OpenAI API error ${res.status}: ${errBody?.error?.message ?? 'Unknown error'}`);
    }
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? '';
  }

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': api_key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 4096, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
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
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, stream: false, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }),
    });
    if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);
    const data = await res.json() as { message?: { content?: string } };
    return data.message?.content ?? '';
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
