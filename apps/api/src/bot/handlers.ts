import type { Telegraf } from 'telegraf';
import { prisma } from '../db';
import { linkFromInvite } from '../lib/friendship';

const WELCOME =
  'Привет! Я бот Flicksee. Я отправлю уведомление, когда у тебя и друга совпадёт фильм 🎬\n\n' +
  'Открой flicksee.app и пригласи друзей.';

const GENERIC =
  'Я отправляю уведомления о матчах с друзьями. Открой flicksee.app, чтобы свайпать.';

const LOGIN_REQUIRED =
  'Похоже, ты ещё не во Flicksee. Залогинься на flicksee.app через Telegram и тапни ссылку друга снова.';

// Mark the user as bot-started and return their id, or null if they aren't a
// Flicksee user yet (must log in via Login Widget first).
async function markBotStarted(telegramId: number): Promise<{ id: string } | null> {
  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });
  if (!user) return null;
  await prisma.user.update({ where: { id: user.id }, data: { isBotStarted: true } });
  return { id: user.id };
}

export function registerHandlers(bot: Telegraf) {
  bot.start(async (ctx) => {
    const payload = ctx.startPayload; // empty string when no token
    const tgId = ctx.from?.id;
    if (!tgId) return;

    const user = await markBotStarted(tgId);
    if (!user) {
      await ctx.reply(LOGIN_REQUIRED);
      return;
    }

    if (!payload) {
      await ctx.reply(WELCOME);
      return;
    }

    const result = await linkFromInvite(payload, user.id);
    if (!result.ok) {
      const msg = {
        expired: 'Ссылка устарела или уже использована, попроси новую.',
        self: 'Нельзя дружить с собой 😄 Отправь ссылку другу.',
        already: 'Вы уже друзья.',
        unknown: 'Не нашёл такой инвайт. Возможно, ссылка некорректна.',
      }[result.reason];
      await ctx.reply(msg);
      return;
    }
    const aggMsg =
      result.retroMatchCount > 0
        ? `🎉 Вы теперь друзья! У вас уже ${result.retroMatchCount} общих хочу-посмотреть. Открой flicksee.app/friends`
        : `🎉 Вы теперь друзья! Свайпайте и я напишу при первом совпадении.`;
    await ctx.reply(aggMsg);

    // Notify the inviter too — best-effort.
    try {
      const inviter = await prisma.user.findUnique({ where: { id: result.inviterId } });
      if (inviter?.isBotStarted) {
        await ctx.telegram.sendMessage(Number(inviter.telegramId), aggMsg);
      }
    } catch (e) {
      console.warn('inviter push failed', e);
    }
  });

  bot.on('text', async (ctx) => {
    await ctx.reply(GENERIC);
  });
}
