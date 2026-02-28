-- AlterTable
ALTER TABLE "Drawing" ADD COLUMN     "revision" TEXT;

-- CreateTable
CREATE TABLE "DrawingRevision" (
    "id" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DrawingRevision_drawingId_idx" ON "DrawingRevision"("drawingId");

-- CreateIndex
CREATE INDEX "DrawingRevision_drawingId_createdAt_idx" ON "DrawingRevision"("drawingId", "createdAt");

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
