/*
  Warnings:

  - You are about to drop the column `author` on the `Manga` table. All the data in the column will be lost.
  - You are about to drop the column `publisher` on the `Manga` table. All the data in the column will be lost.
  - You are about to drop the column `volumeNumber` on the `Manga` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ExternalSource" ADD VALUE 'ANILIST';

-- DropIndex
DROP INDEX "Manga_author_idx";

-- AlterTable
ALTER TABLE "Manga" DROP COLUMN "author",
DROP COLUMN "publisher",
DROP COLUMN "volumeNumber",
ADD COLUMN     "authors" TEXT[],
ADD COLUMN     "chapters" INTEGER,
ADD COLUMN     "score" DOUBLE PRECISION,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "volume" INTEGER;
