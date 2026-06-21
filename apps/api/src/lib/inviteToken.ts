import crypto from 'node:crypto';

// 7 days — short enough to bound the consume window, long enough that
// "tomorrow" still works.
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// 128 bits, url-safe; usable verbatim in t.me/<bot>?start=<token>.
// Telegram's start parameter accepts [A-Za-z0-9_-]{1,64} — base64url fits.
export function newInviteToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}
