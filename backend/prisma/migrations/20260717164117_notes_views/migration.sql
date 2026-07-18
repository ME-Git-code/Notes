-- DropIndex
DROP INDEX "Note_userId_idx";

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTrashed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Note_userId_isPinned_isTrashed_idx" ON "Note"("userId", "isPinned", "isTrashed");
