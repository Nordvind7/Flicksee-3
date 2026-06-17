import crypto from 'node:crypto';
import { config } from '../config';

export interface VerifyResult {
  ok: boolean;
  reason?: string;
}

const MAX_AUTH_AGE_SECONDS = 86_400; // reject logins older than 24h (replay guard)

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
  if (Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, reason: 'auth_date expired' };
  }

  return { ok: true };
}
