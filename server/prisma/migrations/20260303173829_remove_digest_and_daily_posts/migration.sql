/*
  Warnings:

  - You are about to drop the `daily_posts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `post_items` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "post_items" DROP CONSTRAINT "post_items_itemId_fkey";

-- DropForeignKey
ALTER TABLE "post_items" DROP CONSTRAINT "post_items_postId_fkey";

-- DropTable
DROP TABLE "daily_posts";

-- DropTable
DROP TABLE "post_items";

-- DropEnum
DROP TYPE "PostStatus";

-- DropEnum
DROP TYPE "TimeSlot";
