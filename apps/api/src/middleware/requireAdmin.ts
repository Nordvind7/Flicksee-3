import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { isAdminTelegramId } from '../lib/adminAllowlist';

// preHandler hook. Must run AFTER `app.authenticate` so req.user is populated
// by @fastify/jwt. Loads the user once to read telegramId, then checks the
// allowlist. 403 on miss.
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const jwtPayload = req.user as { sub?: string } | undefined;
  if (!jwtPayload?.sub) {
    return reply.status(401).send({ error: 'unauthorized' });
  }
  const user = await prisma.user.findUnique({
    where: { id: jwtPayload.sub },
    select: { telegramId: true },
  });
  if (!user || !isAdminTelegramId(user.telegramId)) {
    return reply.status(403).send({ error: 'forbidden' });
  }
}
