import { prisma } from '../db';
import { canonicalPair } from './canonicalPair';

export type LinkResult =
  | { ok: true; inviterId: string; retroMatchCount: number }
  | { ok: false; reason: 'expired' | 'self' | 'already' | 'unknown' };

// Atomic invite-consumption + friendship + retro-match backfill. Returns
// counts so the bot can craft a single aggregated welcome message instead of
// spamming one push per pre-existing intersection.
export async function linkFromInvite(token: string, consumerUserId: string): Promise<LinkResult> {
  const now = new Date();
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return { ok: false, reason: 'unknown' };
  if (invite.consumedBy) return { ok: false, reason: 'expired' };
  if (invite.expiresAt < now) return { ok: false, reason: 'expired' };
  if (invite.creatorId === consumerUserId) return { ok: false, reason: 'self' };

  const [aId, bId] = canonicalPair(invite.creatorId, consumerUserId);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.friendship.findUnique({
      where: { userAId_userBId: { userAId: aId, userBId: bId } },
    });
    if (existing) return { ok: false, reason: 'already' as const };

    // Single-flight invite consumption (CAS).
    const consumed = await tx.invite.updateMany({
      where: { token, consumedBy: null, expiresAt: { gt: now } },
      data: { consumedBy: consumerUserId, consumedAt: now },
    });
    if (consumed.count === 0) return { ok: false, reason: 'expired' as const };

    await tx.friendship.create({
      data: { userAId: aId, userBId: bId, inviteToken: token },
    });

    // Backfill retro-matches: titles BOTH users have LIKEd.
    const aLikes = await tx.swipe.findMany({
      where: { userId: aId, action: 'LIKE' },
      select: { tmdbId: true, contentType: true },
    });
    if (aLikes.length === 0) {
      return { ok: true as const, inviterId: invite.creatorId, retroMatchCount: 0 };
    }
    const bLikes = await tx.swipe.findMany({
      where: {
        userId: bId,
        action: 'LIKE',
        OR: aLikes.map((s) => ({ tmdbId: s.tmdbId, contentType: s.contentType })),
      },
      select: { tmdbId: true, contentType: true },
    });
    if (bLikes.length > 0) {
      await tx.match.createMany({
        data: bLikes.map((s) => ({
          userAId: aId,
          userBId: bId,
          tmdbId: s.tmdbId,
          contentType: s.contentType,
          notified: true, // do not push retro-matches individually
        })),
        skipDuplicates: true,
      });
    }
    return { ok: true as const, inviterId: invite.creatorId, retroMatchCount: bLikes.length };
  });
}
