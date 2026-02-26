-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('NEW', 'EXTRACTED', 'FILTERED_OUT', 'READY_FOR_AI', 'AI_STAGE_A_DONE', 'AI_STAGE_B_DONE', 'USED_IN_POST', 'REJECTED');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('MORNING_1', 'MORNING_2', 'NOON', 'EVENING_1', 'EVENING_2');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'POSTED');

-- AlterTable
ALTER TABLE "sources" ADD COLUMN     "itemsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastFetchStatus" TEXT,
ADD COLUMN     "lastFetchedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "guid" TEXT,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "snippet" TEXT,
    "contentHash" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "status" "ItemStatus" NOT NULL DEFAULT 'NEW',
    "filterReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "fullHtml" TEXT,
    "extractedContent" TEXT NOT NULL,
    "truncatedContent" TEXT,
    "mainImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_results" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "isAllowed" BOOLEAN,
    "topicTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "importanceScore" INTEGER,
    "oneLineSummary" TEXT,
    "summary" TEXT,
    "bullets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whyItMatters" TEXT,
    "riskFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suggestedHashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "model" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "rawResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_posts" (
    "id" SERIAL NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "timeSlot" "TimeSlot" NOT NULL,
    "content" TEXT NOT NULL,
    "hookText" TEXT,
    "bulletsText" TEXT,
    "ocvnTakeText" TEXT,
    "ctaText" TEXT,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "editedContent" TEXT,
    "rejectionReason" TEXT,
    "fbPostId" TEXT,
    "fbPostUrl" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_items" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "items_contentHash_key" ON "items"("contentHash");

-- CreateIndex
CREATE INDEX "items_status_idx" ON "items"("status");

-- CreateIndex
CREATE INDEX "items_sourceId_idx" ON "items"("sourceId");

-- CreateIndex
CREATE INDEX "items_publishedAt_idx" ON "items"("publishedAt");

-- CreateIndex
CREATE INDEX "items_contentHash_idx" ON "items"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "items_sourceId_link_key" ON "items"("sourceId", "link");

-- CreateIndex
CREATE UNIQUE INDEX "articles_itemId_key" ON "articles"("itemId");

-- CreateIndex
CREATE INDEX "ai_results_itemId_idx" ON "ai_results"("itemId");

-- CreateIndex
CREATE INDEX "ai_results_stage_idx" ON "ai_results"("stage");

-- CreateIndex
CREATE INDEX "daily_posts_status_idx" ON "daily_posts"("status");

-- CreateIndex
CREATE INDEX "daily_posts_targetDate_idx" ON "daily_posts"("targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "daily_posts_targetDate_timeSlot_key" ON "daily_posts"("targetDate", "timeSlot");

-- CreateIndex
CREATE UNIQUE INDEX "post_items_postId_itemId_key" ON "post_items"("postId", "itemId");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_results" ADD CONSTRAINT "ai_results_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_items" ADD CONSTRAINT "post_items_postId_fkey" FOREIGN KEY ("postId") REFERENCES "daily_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_items" ADD CONSTRAINT "post_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
