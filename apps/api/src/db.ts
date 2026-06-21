import { PrismaClient } from '@prisma/client';

// One shared Prisma client for the whole API process. A long-running Fastify
// server keeps a single connection pool; tune its size with the
// `connection_limit` query param in DATABASE_URL when deploying.
export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
