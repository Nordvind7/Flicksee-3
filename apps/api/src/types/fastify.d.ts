import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    // What we sign into the access token.
    payload: { sub: string };
    // What `request.jwtVerify()` populates onto `request.user`.
    user: { sub: string };
  }
}
