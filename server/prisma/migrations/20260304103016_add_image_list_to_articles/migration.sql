-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "imageList" TEXT[] DEFAULT ARRAY[]::TEXT[];
