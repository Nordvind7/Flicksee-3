-- Phase 7: friends & matches
-- Renames the room-scoped Match to RoomMatch (preserving its existing rows,
-- though in practice rooms have never been used) and adds three new tables:
-- Friendship, Match (friends-scoped), Invite.

-- 1. Rename existing room-scoped Match → RoomMatch
ALTER TABLE "Match" RENAME TO "RoomMatch";
ALTER TABLE "RoomMatch" RENAME CONSTRAINT "Match_pkey" TO "RoomMatch_pkey";
ALTER TABLE "RoomMatch" RENAME CONSTRAINT "Match_roomId_fkey" TO "RoomMatch_roomId_fkey";
ALTER INDEX "Match_roomId_tmdbId_key" RENAME TO "RoomMatch_roomId_tmdbId_key";
ALTER INDEX "Match_roomId_idx" RENAME TO "RoomMatch_roomId_idx";

-- 2. Friends-scoped Match
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "seenByA" BOOLEAN NOT NULL DEFAULT false,
    "seenByB" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Match_userAId_userBId_tmdbId_contentType_key" ON "Match"("userAId", "userBId", "tmdbId", "contentType");
CREATE INDEX "Match_userAId_matchedAt_idx" ON "Match"("userAId", "matchedAt");
CREATE INDEX "Match_userBId_matchedAt_idx" ON "Match"("userBId", "matchedAt");

ALTER TABLE "Match" ADD CONSTRAINT "Match_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Friendship
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviteToken" TEXT,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Friendship_userAId_userBId_key" ON "Friendship"("userAId", "userBId");
CREATE INDEX "Friendship_userAId_idx" ON "Friendship"("userAId");
CREATE INDEX "Friendship_userBId_idx" ON "Friendship"("userBId");

ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Invite
CREATE TABLE "Invite" (
    "token" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedBy" TEXT,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("token")
);

CREATE INDEX "Invite_creatorId_idx" ON "Invite"("creatorId");
CREATE INDEX "Invite_expiresAt_idx" ON "Invite"("expiresAt");

ALTER TABLE "Invite" ADD CONSTRAINT "Invite_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
