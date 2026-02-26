-- CreateEnum
CREATE TYPE "SourceLang" AS ENUM ('VI', 'EN', 'MIXED');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('OK', 'FAILED');

-- CreateTable
CREATE TABLE "sources" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rssUrl" TEXT NOT NULL,
    "siteUrl" TEXT,
    "lang" "SourceLang" NOT NULL DEFAULT 'MIXED',
    "topicTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trustScore" INTEGER NOT NULL DEFAULT 70,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "fetchIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "denyKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "lastValidatedAt" TIMESTAMP(3),
    "lastValidationStatus" "ValidationStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_rssUrl_key" ON "sources"("rssUrl");

-- CreateIndex
CREATE INDEX "sources_enabled_idx" ON "sources"("enabled");

-- CreateIndex
CREATE INDEX "sources_trustScore_idx" ON "sources"("trustScore");
