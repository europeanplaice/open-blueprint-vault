-- AlterTable: remove orderNumber and workOrderNumber columns (replaced by metadata key-value store)
ALTER TABLE "Drawing" DROP COLUMN IF EXISTS "orderNumber";
ALTER TABLE "Drawing" DROP COLUMN IF EXISTS "workOrderNumber";
