-- AlterTable
ALTER TABLE "Drawing" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';
