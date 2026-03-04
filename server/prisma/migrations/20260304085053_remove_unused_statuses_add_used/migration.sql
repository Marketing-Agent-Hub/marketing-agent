/*
  Warnings:

  - The values [USED_IN_POST,REJECTED] on the enum `ItemStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ItemStatus_new" AS ENUM ('NEW', 'EXTRACTED', 'FILTERED_OUT', 'READY_FOR_AI', 'AI_STAGE_A_DONE', 'AI_STAGE_B_DONE', 'USED');
ALTER TABLE "items" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "items" ALTER COLUMN "status" TYPE "ItemStatus_new" USING ("status"::text::"ItemStatus_new");
ALTER TYPE "ItemStatus" RENAME TO "ItemStatus_old";
ALTER TYPE "ItemStatus_new" RENAME TO "ItemStatus";
DROP TYPE "ItemStatus_old";
ALTER TABLE "items" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;
