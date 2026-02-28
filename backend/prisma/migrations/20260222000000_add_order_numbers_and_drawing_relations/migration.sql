-- CreateEnum
CREATE TYPE "DrawingRelationType" AS ENUM ('RELATED', 'PARENT', 'CHILD', 'SUPERSEDES');

-- AlterTable
ALTER TABLE "Drawing" ADD COLUMN "orderNumber" TEXT,
                      ADD COLUMN "workOrderNumber" TEXT;

-- CreateTable
CREATE TABLE "DrawingRelation" (
    "id" TEXT NOT NULL,
    "fromDrawingId" TEXT NOT NULL,
    "toDrawingId" TEXT NOT NULL,
    "relationType" "DrawingRelationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawingRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DrawingRelation_fromDrawingId_idx" ON "DrawingRelation"("fromDrawingId");

-- CreateIndex
CREATE INDEX "DrawingRelation_toDrawingId_idx" ON "DrawingRelation"("toDrawingId");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingRelation_fromDrawingId_toDrawingId_relationType_key" ON "DrawingRelation"("fromDrawingId", "toDrawingId", "relationType");

-- AddForeignKey
ALTER TABLE "DrawingRelation" ADD CONSTRAINT "DrawingRelation_fromDrawingId_fkey" FOREIGN KEY ("fromDrawingId") REFERENCES "Drawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRelation" ADD CONSTRAINT "DrawingRelation_toDrawingId_fkey" FOREIGN KEY ("toDrawingId") REFERENCES "Drawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
