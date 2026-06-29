import crypto from 'node:crypto';
import { config } from '../config';

export interface VerifyResult {
  ok: boolean;
  reason?: string;
}

const MAX_AUTH_AGE_SECONDS = 86_400; // reject logins older than 24h (replay guard)
const CLOCK_SKEW_SECONDS = 60; // tolerance for future-dated auth_date

// Verifies a Telegram Login Widget payload.
// https://core.telegram.org/widgets/login#checking-authorization
//
// secret_key = SHA256(bot_token)
// hash       = HMAC_SHA256(data_check_string, secret_key)
// where data_check_string is "key=value" for every field except `hash`,
// sorted by key and joined with "\n".
export function verifyTelegramLogin(
  data: Record<string, unknown>,
  botToken: string = config.TELEGRAM_BOT_TOKEN,
): VerifyResult {
  const hash = data.hash;
  if (typeof hash !== 'string' || hash.length === 0) {
    return { ok: false, reason: 'missing hash' };
  }

  const dataCheckString = Object.keys(data)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${String(data[key])}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const computedBuf = Buffer.from(computed, 'hex');
  const providedBuf = Buffer.from(hash, 'hex');
  if (
    computedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(computedBuf, providedBuf)
  ) {
    return { ok: false, reason: 'bad signature' };
  }

  const authDate = Number(data.auth_date);
  if (!Number.isFinite(authDate)) {
    return { ok: false, reason: 'missing auth_date' };
  }
  const ageSeconds = Date.now() / 1000 - authDate;
  if (ageSeconds < -CLOCK_SKEW_SECONDS) {
    return { ok: false, reason: 'auth_date in future' };
  }
  if (ageSeconds > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, reason: 'auth_date expired' };
  }

  return { ok: true };
}

// Verifies a Telegram Mini-App `initData` payload.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
//
// initData is the URL-encoded query string Telegram puts on
// window.Telegram.WebApp.initData. The signing scheme differs from the
// Login Widget: the secret key is HMAC-SHA256("WebAppData", bot_token)
// (not SHA256(bot_token)), and the user blob is itself JSON inside one
// "user" field.
export interface WebAppVerifyResult {
  ok: boolean;
  reason?: string;
  user?: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    photo_url?: string;
    language_code?: string;
  };
}

export function verifyTelegramWebAppInitData(
  initData: string,
  botToken: string = config.TELEGRAM_BOT_TOKEN,
): WebAppVerifyResult {
  if (!initData) return { ok: false, reason: 'empty initData' };

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false, reason: 'missing hash' };
  params.delete('hash');

  // data_check_string = sorted "key=value" joined by \n.
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const computedBuf = Buffer.from(computed, 'hex');
  const providedBuf = Buffer.from(hash, 'hex');
  if (
    computedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(computedBuf, providedBuf)
  ) {
    return { ok: false, reason: 'bad signature' };
  }

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate)) return { ok: false, reason: 'missing auth_date' };
  const ageSeconds = Date.now() / 1000 - authDate;
  if (ageSeconds < -CLOCK_SKEW_SECONDS) return { ok: false, reason: 'auth_date in future' };
  if (ageSeconds > MAX_AUTH_AGE_SECONDS) return { ok: false, reason: 'auth_date expired' };

  let user: WebAppVerifyResult['user'];
  const userRaw = params.get('user');
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      return { ok: false, reason: 'bad user json' };
    }
  }

  return { ok: true, user };
}
