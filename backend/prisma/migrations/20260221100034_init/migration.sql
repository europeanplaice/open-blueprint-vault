-- CreateTable
CREATE TABLE "Drawing" (
    "id" TEXT NOT NULL,
    "drawingNumber" TEXT NOT NULL,
    "name" TEXT,
    "material" TEXT,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drawing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Drawing_drawingNumber_key" ON "Drawing"("drawingNumber");
