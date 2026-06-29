import { prisma } from '../db';
import { canonicalPair } from './canonicalPair';
import { sendMatchPush } from '../bot';

// Called from POST /swipes. Returns array of new matches that were created
// during this call — used by the client to immediately show an overlay.
// NEVER throws. Skips swipes that aren't positive (LIKE or RECOMMEND).
//
// RECOMMEND is treated as LIKE for matching — the recommendation flag is
// surfaced separately in the friend's watchlist UI.
const POSITIVE = new Set(['LIKE', 'RECOMMEND']);

export interface NewMatch {
  id: string;
  tmdbId: number;
  contentType: 'MOVIE' | 'TV';
  friend: { id: string; firstName: string | null; username: string | null; photoUrl: string | null };
  content: { title: string; posterPath: string | null } | null;
}

export async function detectMatches(
  userId: string,
  swipe: { tmdbId: number; contentType: 'MOVIE' | 'TV'; action: 'LIKE' | 'DISLIKE' | 'SEEN' | 'RECOMMEND' },
): Promise<NewMatch[]> {
  if (!POSITIVE.has(swipe.action)) return [];

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true },
  });
  if (friendships.length === 0) return [];

  const created: NewMatch[] = [];

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
    if (!friendLike || !POSITIVE.has(friendLike.action)) continue;

    const [aId, bId] = canonicalPair(userId, friendId);
    try {
      const match = await prisma.match.create({
        data: { userAId: aId, userBId: bId, tmdbId: swipe.tmdbId, contentType: swipe.contentType },
      });
      // Push в Telegram — fire-and-forget (не блокируем UI).
      void sendMatchPush(userId, friendId, match);
      void sendMatchPush(friendId, userId, match);

      const [friend, content] = await Promise.all([
        prisma.user.findUnique({
          where: { id: friendId },
          select: { id: true, firstName: true, username: true, photoUrl: true },
        }),
        prisma.content.findUnique({
          where: { tmdbId_type: { tmdbId: swipe.tmdbId, type: swipe.contentType } },
          select: { title: true, posterPath: true },
        }),
      ]);
      if (friend) {
        created.push({
          id: match.id,
          tmdbId: match.tmdbId,
          contentType: match.contentType,
          friend,
          content,
        });
      }
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002') continue; // unique violation = already matched
      console.warn('detectMatches insert failed', err);
    }
  }

  return created;
}
