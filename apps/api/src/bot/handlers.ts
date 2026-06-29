import type { Telegraf } from 'telegraf';
import { prisma } from '../db';
import { linkFromInvite } from '../lib/friendship';
import { canonicalPair } from '../lib/canonicalPair';

const LOGIN_TOKEN_TTL_MS = 5 * 60 * 1000;

const WELCOME =
  'Привет! Я бот Flicksee. Я отправлю уведомление, когда у тебя и друга совпадёт фильм 🎬\n\n' +
  'Открой flicksee.ru и пригласи друзей.';

const GENERIC =
  'Я отправляю уведомления о матчах с друзьями. Открой flicksee.ru, чтобы свайпать.';

const LOGIN_REQUIRED =
  'Похоже, ты ещё не во Flicksee. Залогинься на flicksee.ru через Telegram и тапни ссылку друга снова.';

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
    const tgFrom = ctx.from;
    if (!tgFrom?.id) return;

    // --- Branch 1: deep-link login (payload "login_<token>") ---
    // Upsert the User here so first-time visitors don't need to log in
    // through anything but the bot.
    if (payload.startsWith('login_')) {
      const token = payload.slice('login_'.length);
      const row = await prisma.loginToken.findUnique({ where: { token } });
      if (!row) {
        await ctx.reply('Эта ссылка не найдена. Открой сайт и нажми «Войти» заново.');
        return;
      }
      if (row.consumedAt) {
        await ctx.reply('Эта ссылка уже использована. Открой сайт и нажми «Войти» заново.');
        return;
      }
      if (Date.now() - row.createdAt.getTime() > LOGIN_TOKEN_TTL_MS) {
        await ctx.reply('Ссылка истекла (живёт 5 минут). Открой сайт и нажми «Войти» заново.');
        return;
      }

      const profile = {
        username: tgFrom.username ?? null,
        firstName: tgFrom.first_name ?? null,
        lastName: tgFrom.last_name ?? null,
        languageCode: tgFrom.language_code ?? null,
      };
      const user = await prisma.user.upsert({
        where: { telegramId: BigInt(tgFrom.id) },
        create: { telegramId: BigInt(tgFrom.id), ...profile, isBotStarted: true },
        update: { ...profile, isBotStarted: true, lastSeenAt: new Date() },
      });
      await prisma.loginToken.update({
        where: { id: row.id },
        data: { userId: user.id, completedAt: new Date() },
      });

      const name = user.firstName ?? user.username ?? 'друг';
      await ctx.reply(
        `Готово, ${name}! ✅\n\nВозвращайся на вкладку с flicksee.ru — ты уже залогинен.`,
      );
      return;
    }

    // --- Branch 2: personal permanent invite link (payload "add_<code>") ---
    // Любой кто перешёл по чьей-то ссылке: создаём User (если ещё нет),
    // создаём Friendship, считаем retro-matches.
    if (payload.startsWith('add_')) {
      const code = payload.slice('add_'.length);
      const inviter = await prisma.user.findUnique({ where: { inviteCode: code } });
      if (!inviter) {
        await ctx.reply('Ссылка-приглашение не активна. Попроси у друга свежую.');
        return;
      }

      const profile = {
        username: tgFrom.username ?? null,
        firstName: tgFrom.first_name ?? null,
        lastName: tgFrom.last_name ?? null,
        languageCode: tgFrom.language_code ?? null,
      };
      const me = await prisma.user.upsert({
        where: { telegramId: BigInt(tgFrom.id) },
        create: { telegramId: BigInt(tgFrom.id), ...profile, isBotStarted: true },
        update: { ...profile, isBotStarted: true, lastSeenAt: new Date() },
      });

      if (me.id === inviter.id) {
        await ctx.reply('Это твоя собственная ссылка 😄 Перешли её другу.');
        return;
      }

      const [aId, bId] = canonicalPair(me.id, inviter.id);
      try {
        await prisma.friendship.create({
          data: { userAId: aId, userBId: bId, inviteToken: payload },
        });
      } catch (err) {
        if ((err as { code?: string }).code !== 'P2002') throw err;
        await ctx.reply('Вы уже друзья 👍');
        return;
      }

      // Retro-match: пробегаемся по пересечению лайков. На паре из 50+50
      // лайков это <100мс на нашем масштабе.
      const myLikes = await prisma.swipe.findMany({
        where: { userId: me.id, action: { in: ['LIKE', 'RECOMMEND'] } },
        select: { tmdbId: true, contentType: true },
      });
      const myKeys = new Set(myLikes.map((s) => `${s.tmdbId}:${s.contentType}`));
      const theirLikes = await prisma.swipe.findMany({
        where: { userId: inviter.id, action: { in: ['LIKE', 'RECOMMEND'] } },
        select: { tmdbId: true, contentType: true },
      });
      let retroMatchCount = 0;
      for (const t of theirLikes) {
        if (!myKeys.has(`${t.tmdbId}:${t.contentType}`)) continue;
        try {
          await prisma.match.create({
            data: { userAId: aId, userBId: bId, tmdbId: t.tmdbId, contentType: t.contentType },
          });
          retroMatchCount++;
        } catch (e) {
          if ((e as { code?: string }).code !== 'P2002') console.warn('retro match', e);
        }
      }

      const inviterName = inviter.firstName ?? inviter.username ?? 'друг';
      const msg =
        retroMatchCount > 0
          ? `🎉 Теперь вы с ${inviterName} друзья! У вас уже ${retroMatchCount} общих хочу-посмотреть — открой flicksee.ru/friends`
          : `🎉 Теперь вы с ${inviterName} друзья! Свайпайте — я напишу при первом совпадении.`;
      await ctx.reply(msg);

      // Push приглашающему — best-effort.
      try {
        if (inviter.isBotStarted) {
          const myName = me.firstName ?? me.username ?? 'кто-то';
          await ctx.telegram.sendMessage(
            Number(inviter.telegramId),
            retroMatchCount > 0
              ? `🎉 ${myName} перешёл по твоей ссылке! Вы друзья + ${retroMatchCount} общих хочу-посмотреть.`
              : `🎉 ${myName} перешёл по твоей ссылке — теперь вы друзья.`,
          );
        }
      } catch (e) {
        console.warn('inviter push failed', e);
      }
      return;
    }

    // --- Branch 3: legacy one-shot invite token (requires existing Flicksee user) ---
    const user = await markBotStarted(tgFrom.id);
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
