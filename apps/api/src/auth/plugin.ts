import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config';

// Registers cookie + JWT support and an `authenticate` guard usable as an
// onRequest hook to protect routes.
export default fp(async (app) => {
  await app.register(cookie);
  await app.register(jwt, { secret: config.JWT_SECRET });

  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'unauthorized' });
    }
  });
});
