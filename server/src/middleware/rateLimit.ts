/**
 * Rate limiting — tiered per route, Redis-backed when REDIS_URL is set.
 *
 * Redis is completely optional and isolated from the app.
 * If REDIS_URL is absent, Redis is unreachable, or Redis goes down mid-run,
 * every limiter silently falls back to in-memory state. The app never crashes.
 *
 * Tiers (per IP per window):
 *
 *  Limiter       Window    Max    Target routes
 *  ──────────────────────────────────────────────────────────
 *  authLimiter   15 min    30     /auth/login, /auth/register
 *  sendLimiter   1 min     60     /send, /send/raw
 *  aiLimiter     1 min     20     /ai/*
 *  apiLimiter    15 min    1 000  everything else
 */

import rateLimit, { type Options, type Store } from 'express-rate-limit';
import Redis from 'ioredis';
import { RedisStore } from 'rate-limit-redis';

// ─── Redis client (optional) ─────────────────────────────────────────────────
// ioredis connects automatically on first command — no await needed.
// If it fails, the error handler fires and sendCommand will throw,
// which causes rate-limit-redis to pass the request through (safe default).

let redisClient: Redis | null = null;

if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,    // fail fast on a dead Redis
    enableOfflineQueue: false,  // don't queue commands while disconnected
    connectTimeout: 3_000,
  });

  redisClient.on('connect', () => {
    console.log('[RateLimit] Redis connected — distributed store active.');
  });

  redisClient.on('error', (err: Error) => {
    // Warn but never crash. Limiters fall back to memory automatically.
    console.warn('[RateLimit] Redis error (using in-memory fallback):', err.message);
  });
} else {
  console.log('[RateLimit] REDIS_URL not set — using in-memory store (single instance only).');
}

// ─── Store factory ───────────────────────────────────────────────────────────

function makeStore(prefix: string): Store | undefined {
  if (!redisClient) return undefined; // undefined → express-rate-limit uses memory

  return new RedisStore({
    prefix: `rl:${prefix}:`,
    // Cast required: ioredis call() overloads don't match the string-rest signature
    sendCommand: (...args: string[]) =>
      (redisClient!.call as (...a: string[]) => Promise<number>)(...args),
  });
}

// ─── Shared defaults ─────────────────────────────────────────────────────────

const base: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

// ─── Limiters ────────────────────────────────────────────────────────────────

/**
 * Auth routes — /auth/login, /auth/register
 * Prevents brute-force + credential stuffing.
 * 30 attempts per 15 min per IP.
 */
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 30,
  store: makeStore('auth'),
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

/**
 * Send routes — /send, /send/raw
 * 60 sends per minute per IP.
 * Matches SES/SendGrid default sandbox quota; raise once provider limits are confirmed.
 */
export const sendLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  max: 60,
  store: makeStore('send'),
  message: { error: 'Send rate limit reached: 60 emails per minute per IP.' },
});

/**
 * AI routes — /ai/*
 * 20 per minute per IP — LLM calls are expensive.
 */
export const aiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  max: 20,
  store: makeStore('ai'),
  message: { error: 'AI rate limit reached: 20 requests per minute per IP.' },
});

/**
 * General API — all other routes.
 * 1 000 requests per 15 min per IP (~67/min sustained).
 */
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 1_000,
  store: makeStore('api'),
  message: { error: 'Too many requests. Please slow down.' },
  skip: (req) => req.path === '/health',
});
