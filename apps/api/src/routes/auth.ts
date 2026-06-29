import crypto from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { User } from '@prisma/client';
import type { AuthUser } from '@flicksee/shared';
import { prisma } from '../db';
import { config } from '../config';
import { verifyTelegramLogin, verifyTelegramWebAppInitData } from '../auth/telegram';
import { issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../auth/tokens';
import { getBot } from '../bot';
import { isAdminTelegramId } from '../lib/adminAllowlist';

const REFRESH_COOKIE = 'flicksee_rt';
// How long a /auth/login/start handshake is valid. Long enough for the user
// to open Telegram and tap Start, short enough that an idle row is useless.
const LOGIN_TOKEN_TTL_MS = 5 * 60 * 1000;

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    telegramId: Number(user.telegramId),
    username: user.username ?? undefined,
    firstName: user.firstName ?? undefined,
    photoUrl: user.photoUrl ?? undefined,
    isAdmin: isAdminTelegramId(user.telegramId),
  };
}

function setRefreshCookie(reply: FastifyReply, token: string, expiresAt: Date) {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
    expires: expiresAt,
  });
}

export default async function authRoutes(app: FastifyInstance) {
  // Exchange a verified Telegram Login Widget payload for our tokens.
  app.post('/auth/telegram', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
    const data = (req.body ?? {}) as Record<string, unknown>;
    const result = verifyTelegramLogin(data);
    if (!result.ok) {
      // Log the precise reason server-side; tell the client only that it failed.
      req.log.warn({ reason: result.reason }, 'telegram auth rejected');
      return reply.status(401).send({ error: 'telegram auth failed' });
    }

    const idValue = typeof data.id === 'number' ? data.id : Number(data.id);
    if (!Number.isInteger(idValue)) {
      return reply.status(400).send({ error: 'invalid payload' });
    }
    const telegramId = BigInt(idValue);
    const profile = {
      username: str(data.username),
      firstName: str(data.first_name),
      lastName: str(data.last_name),
      photoUrl: str(data.photo_url),
    };
    const user = await prisma.user.upsert({
      where: { telegramId },
      create: { telegramId, ...profile },
      update: { ...profile, lastSeenAt: new Date() },
    });

    const accessToken = await reply.jwtSign({ sub: user.id }, { expiresIn: config.ACCESS_TOKEN_TTL });
    const refresh = await issueRefreshToken(user.id, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    setRefreshCookie(reply, refresh.token, refresh.expiresAt);

    return { accessToken, user: toAuthUser(user) };
  });

  // Telegram Mini-App auto-login. The browser inside Telegram's WebView gets
  // a signed `initData` blob via window.Telegram.WebApp; we verify HMAC and
  // mint a normal session so the user is logged in without tapping anything.
  app.post(
    '/auth/telegram-webapp',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = (req.body ?? {}) as { initData?: string };
      const result = verifyTelegramWebAppInitData(body.initData ?? '');
      if (!result.ok || !result.user) {
        req.log.warn({ reason: result.reason }, 'telegram-webapp auth rejected');
        return reply.status(401).send({ error: 'telegram-webapp auth failed' });
      }
      const tg = result.user;
      const profile = {
        username: tg.username ?? null,
        firstName: tg.first_name ?? null,
        lastName: tg.last_name ?? null,
        languageCode: tg.language_code ?? null,
        photoUrl: tg.photo_url ?? null,
      };
      const user = await prisma.user.upsert({
        where: { telegramId: BigInt(tg.id) },
        create: { telegramId: BigInt(tg.id), ...profile, isBotStarted: true },
        update: { ...profile, isBotStarted: true, lastSeenAt: new Date() },
      });
      const accessToken = await reply.jwtSign({ sub: user.id }, { expiresIn: config.ACCESS_TOKEN_TTL });
      const refresh = await issueRefreshToken(user.id, {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
      setRefreshCookie(reply, refresh.token, refresh.expiresAt);
      return { accessToken, user: toAuthUser(user) };
    },
  );

  // Bot deep-link login flow. The browser asks for a one-shot token, opens
  // t.me/<bot>?start=login_<token>, then polls /auth/login/poll. Inside the
  // bot's /start handler we set LoginToken.userId; here we exchange a
  // completed token for JWT+refresh.
  app.post(
    '/auth/login/start',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async () => {
      const token = crypto.randomUUID();
      await prisma.loginToken.create({ data: { token } });
      const botUrl = `https://t.me/${config.TELEGRAM_BOT_USERNAME}?start=login_${token}`;
      return { token, botUrl, expiresInSeconds: LOGIN_TOKEN_TTL_MS / 1000 };
    },
  );

  // Poll for completion. Returns:
  //   - 200 { status: 'pending' }                          — user hasn't tapped Start yet
  //   - 200 { status: 'ok', accessToken, user }            — login completed (one-shot)
  //   - 410 { status: 'expired' }                          — TTL elapsed or already consumed
  //   - 404 { status: 'not_found' }                        — unknown token
  app.get(
    '/auth/login/poll',
    { config: { rateLimit: { max: 180, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const token = (req.query as Record<string, string | undefined>).token;
      if (!token) return reply.status(400).send({ error: 'token required' });

      const row = await prisma.loginToken.findUnique({ where: { token } });
      if (!row) return reply.status(404).send({ status: 'not_found' });

      const ageMs = Date.now() - row.createdAt.getTime();
      if (row.consumedAt || ageMs > LOGIN_TOKEN_TTL_MS) {
        return reply.status(410).send({ status: 'expired' });
      }
      if (!row.userId) {
        return { status: 'pending' as const };
      }

      const user = await prisma.user.findUnique({ where: { id: row.userId } });
      if (!user) {
        // User row was deleted between bot handler and poll — treat as expired.
        return reply.status(410).send({ status: 'expired' });
      }

      // Single-use: any subsequent poll must fail. Mark consumed before
      // minting tokens so a race can't double-issue.
      await prisma.loginToken.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      });

      const accessToken = await reply.jwtSign({ sub: user.id }, { expiresIn: config.ACCESS_TOKEN_TTL });
      const refresh = await issueRefreshToken(user.id, {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
      setRefreshCookie(reply, refresh.token, refresh.expiresAt);

      return { status: 'ok' as const, accessToken, user: toAuthUser(user) };
    },
  );

  // Rotate the refresh-token cookie and mint a fresh access token.
  app.post('/auth/refresh', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    const token = req.cookies[REFRESH_COOKIE];
    if (!token) return reply.status(401).send({ error: 'no refresh token' });

    const rotated = await rotateRefreshToken(token, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    if (!rotated) {
      reply.clearCookie(REFRESH_COOKIE, { path: '/' });
      return reply.status(401).send({ error: 'invalid refresh token' });
    }

    const accessToken = await reply.jwtSign({ sub: rotated.userId }, {
      expiresIn: config.ACCESS_TOKEN_TTL,
    });
    setRefreshCookie(reply, rotated.token, rotated.expiresAt);
    return { accessToken };
  });

  app.post('/auth/logout', async (req, reply) => {
    const token = req.cookies[REFRESH_COOKIE];
    if (token) await revokeRefreshToken(token);
    reply.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { ok: true };
  });

  // Current user — requires a valid access token.
  app.get('/auth/me', { onRequest: [app.authenticate] }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    return { user: user ? toAuthUser(user) : null };
  });

  // Send the current user a fake match push so they can SEE what real match
  // notifications will look like in their bot. Requires the user has pressed
  // /start in the bot at some point (which the login flow does automatically).
  app.post(
    '/auth/test-push',
    {
      onRequest: [app.authenticate],
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
    async (req, reply) => {
      const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
      if (!user) return reply.status(404).send({ error: 'no user' });
      if (!user.isBotStarted) {
        return reply.status(409).send({ error: 'bot not started — нажми /start в боте' });
      }
      try {
        await getBot().telegram.sendMessage(
          Number(user.telegramId),
          '🎬 Тестовое уведомление от Flicksee.\n\nТак выглядят пуши о совпадениях: ты лайкнул фильм, твой друг тоже — и бот сразу пишет обоим.',
        );
        return { ok: true };
      } catch (err) {
        req.log.warn({ err }, 'test push failed');
        return reply.status(502).send({ error: 'не удалось отправить' });
      }
    },
  );

  // Dev-only shortcut: skip the Telegram widget (which requires a public
  // domain) and mint a session for a throwaway user. Never registered in
  // production, so it cannot be an auth bypass there.
  if (config.NODE_ENV !== 'production' && config.ENABLE_DEV_LOGIN) {
    app.post('/auth/dev', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const id = Number(body.id);
      const telegramId = BigInt(Number.isInteger(id) ? id : 777000777);
      const user = await prisma.user.upsert({
        where: { telegramId },
        create: {
          telegramId,
          username: str(body.username) ?? 'dev_user',
          firstName: str(body.firstName) ?? 'Dev',
        },
        update: { lastSeenAt: new Date() },
      });
      const accessToken = await reply.jwtSign({ sub: user.id }, {
        expiresIn: config.ACCESS_TOKEN_TTL,
      });
      const refresh = await issueRefreshToken(user.id, {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
      setRefreshCookie(reply, refresh.token, refresh.expiresAt);
      req.log.warn('DEV login used (development only)');
      return { accessToken, user: toAuthUser(user) };
    });
  }
}
