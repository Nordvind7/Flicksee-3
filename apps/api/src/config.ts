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

export type Config = typeof config;
