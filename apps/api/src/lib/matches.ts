import { prisma } from '../db';
import { canonicalPair } from './canonicalPair';
import { sendMatchPush } from '../bot';

// Called from POST /swipes via setImmediate. NEVER throws. Skips when the
// swipe isn't a LIKE. For each friend of the swiper, checks whether they
// already LIKEd the same title; if so, idempotently creates a Match row and
// pushes both sides.
export async function detectMatches(
  userId: string,
  swipe: { tmdbId: number; contentType: 'MOVIE' | 'TV'; action: 'LIKE' | 'DISLIKE' | 'SEEN' },
): Promise<void> {
  if (swipe.action !== 'LIKE') return;

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true },
  });
  if (friendships.length === 0) return;

  for (const f of friendships) {
    const friendId = f.userAId === userId ? f.userBId : f.userAId;
    const friendLike = await prisma.swipe.findUnique({
      where: {
        userId_tmdbId_contentType: {
          userId: friendId,
          tmdbId: swipe.tmdbId,
          contentType: swipe.contentType,
        },
      },
    });
    if (!friendLike || friendLike.action !== 'LIKE') continue;

    const [aId, bId] = canonicalPair(userId, friendId);
    try {
      const match = await prisma.match.create({
        data: { userAId: aId, userBId: bId, tmdbId: swipe.tmdbId, contentType: swipe.contentType },
      });
      void sendMatchPush(userId, friendId, match);
      void sendMatchPush(friendId, userId, match);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002') continue; // unique violation = already matched
      console.warn('detectMatches insert failed', err);
    }
  }
}
