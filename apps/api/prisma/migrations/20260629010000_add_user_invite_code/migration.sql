-- AlterTable
ALTER TABLE "User" ADD COLUMN "inviteCode" TEXT;

-- Backfill existing users with a random 10-char base36 code.
-- substr(md5(random()::text || id), 1, 10) даёт детерминированный per-row код.
UPDATE "User" SET "inviteCode" = substr(md5(random()::text || id), 1, 10) WHERE "inviteCode" IS NULL;

-- CreateIndex (после backfill чтобы не было дубликатов NULL — NULL не нарушают unique, но всё равно лучше после)
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");
