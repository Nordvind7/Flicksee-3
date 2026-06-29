import 'dotenv/config';
import { z } from 'zod';

// Validated environment. Importing this module fails fast (throws) if anything
// required is missing or malformed, so the server never boots half-configured.
const schema = z.object({
  // Defaults to production so a forgotten env var fails SAFE (dev login off,
  // cookies Secure).
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  TMDB_API_KEY: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_BOT_USERNAME: z.string().min(1),
  // Trusted browser origin for credentialed CORS in production.
  WEB_ORIGIN: z.string().url().optional(),
  // Access token lifetime (any vercel/ms duration string).
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  // Explicit opt-in for the dev login route. Only "true" enables it; any other
  // value (including unset) is false. Must never be enabled in production.
  ENABLE_DEV_LOGIN: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  // Phase 7 — friends & matches
  TELEGRAM_BOT_WEBHOOK_SECRET: z.string().min(16).optional(),
  WEB_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  BOT_MODE: z.enum(['polling', 'webhook']).default('polling'),
  // Optional egress proxies (Cloudflare Workers) for hosts blocked from the
  // origin server (RU VPS cannot reach TMDB or Telegram directly).
  //   TMDB_API_BASE: full base ending in /3, e.g. https://x.workers.dev/tmdb-api/3
  //   TELEGRAM_API_ROOT: root WITHOUT /bot<token>, e.g. https://x.workers.dev/tg
  // When unset we fall back to talking to the real hosts directly.
  TMDB_API_BASE: z.string().url().default('https://api.themoviedb.org/3'),
  TELEGRAM_API_ROOT: z.string().url().default('https://api.telegram.org'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    'Invalid environment configuration:',
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  throw new Error('Invalid environment configuration');
}

export const config = parsed.data;

// Belt-and-braces: the dev auth bypass can never be active in production.
if (config.NODE_ENV === 'production' && config.ENABLE_DEV_LOGIN) {
  throw new Error('ENABLE_DEV_LOGIN must not be enabled when NODE_ENV=production');
}
if (
  config.NODE_ENV === 'production' &&
  config.BOT_MODE === 'webhook' &&
  !config.TELEGRAM_BOT_WEBHOOK_SECRET
) {
  throw new Error('TELEGRAM_BOT_WEBHOOK_SECRET is required when BOT_MODE=webhook in production');
}

export type Config = typeof config;
