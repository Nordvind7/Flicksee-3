import type { FastifyInstance, FastifyReply } from 'fastify';
import type { User } from '@prisma/client';
import type { AuthUser } from '@flicksee/shared';
import { prisma } from '../db';
import { config } from '../config';
import { verifyTelegramLogin } from '../auth/telegram';
import { issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../auth/tokens';

const REFRESH_COOKIE = 'flicksee_rt';

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
