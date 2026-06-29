// Parses ADMIN_TG_IDS env var once at import time. Comma-separated list of
// Telegram numeric IDs. Whitespace and trailing commas ignored. An ID is
// admin iff it appears in this set.
const RAW = process.env.ADMIN_TG_IDS ?? '';

const ADMIN_IDS: ReadonlySet<string> = new Set(
  RAW.split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /^\d+$/.test(s)),
);

export function isAdminTelegramId(telegramId: bigint | number | string): boolean {
  return ADMIN_IDS.has(telegramId.toString());
}

export function adminCount(): number {
  return ADMIN_IDS.size;
}
