/*
  Warnings:

  - You are about to drop the column `bullets` on the `ai_results` table. All the data in the column will be lost.
  - You are about to drop the column `riskFlags` on the `ai_results` table. All the data in the column will be lost.
  - You are about to drop the column `suggestedHashtags` on the `ai_results` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `ai_results` table. All the data in the column will be lost.
  - You are about to drop the column `whyItMatters` on the `ai_results` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ai_results" DROP COLUMN "bullets",
DROP COLUMN "riskFlags",
DROP COLUMN "suggestedHashtags",
DROP COLUMN "summary",
DROP COLUMN "whyItMatters";
