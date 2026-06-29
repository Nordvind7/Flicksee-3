import { Telegraf } from 'telegraf';
import { config } from '../config';
import { prisma } from '../db';

let _bot: Telegraf | null = null;

// Lazy-init so importing this module never crashes a context that doesn't
// have TELEGRAM_BOT_TOKEN set.
export function getBot(): Telegraf {
  if (!_bot) {
    _bot = new Telegraf(config.TELEGRAM_BOT_TOKEN, {
      telegram: { apiRoot: config.TELEGRAM_API_ROOT },
    });
  }
  return _bot;
}

export async function startBot(): Promise<void> {
  const bot = getBot();
  const { registerHandlers } = await import('./handlers');
  registerHandlers(bot);
  if (config.BOT_MODE === 'polling') {
    // launch() resolves only when polling shuts down; do not await.
    void bot.launch();
    return;
  }
  // Webhook mode: src/routes/bot.ts forwards updates to bot.handleUpdate.
  // We self-register the webhook on every boot so it auto-heals from
  // Telegram's "disable on persistent 5xx" guard (which fired once during
  // the certbot nginx reload).
  const webhookUrl = `${config.WEB_PUBLIC_URL.replace(/\/$/, '')}/api/bot/webhook`;
  try {
    await bot.telegram.setWebhook(webhookUrl, {
      secret_token: config.TELEGRAM_BOT_WEBHOOK_SECRET,
    });
    console.log(`webhook registered: ${webhookUrl}`);
  } catch (err) {
    console.warn('setWebhook failed (will retry on next restart)', err);
  }
}

export async function stopBot(): Promise<void> {
  if (!_bot) return;
  try {
    _bot.stop('app shutdown');
  } catch {
    // Telegraf throws "Bot is not running!" if launch() was never called
    // (webhook mode). Safe to ignore — there's nothing to stop.
  }
}

// Best-effort push of a single match. Skips silently when the recipient has
// not yet pressed /start in the bot (Telegram refuses bots from messaging
// fresh users), and on any Telegram-side failure (rate-limit, blocked). Sets
// Match.notified=true on successful delivery so we never push the same match
// twice.
export async function sendMatchPush(
  recipientUserId: string,
  otherUserId: string,
  match: { id: string; tmdbId: number; contentType: 'MOVIE' | 'TV' },
): Promise<void> {
  const [recipient, other, content] = await Promise.all([
    prisma.user.findUnique({ where: { id: recipientUserId } }),
    prisma.user.findUnique({ where: { id: otherUserId } }),
    prisma.content.findUnique({
      where: { tmdbId_type: { tmdbId: match.tmdbId, type: match.contentType } },
    }),
  ]);
  if (!recipient || !other) return;
  if (!recipient.isBotStarted) return;
  const title = content?.title ?? `tmdb:${match.tmdbId}`;
  const friendName = other.firstName ?? other.username ?? 'Друг';
  try {
    await getBot().telegram.sendMessage(
      Number(recipient.telegramId),
      `🎬 Новый матч с ${friendName}: ${title}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Открыть', url: `${config.WEB_PUBLIC_URL}/matches/${match.id}` }],
          ],
        },
      },
    );
    await prisma.match.update({ where: { id: match.id }, data: { notified: true } }).catch(() => {});
  } catch (err) {
    console.warn('sendMatchPush failed', err);
  }
}
