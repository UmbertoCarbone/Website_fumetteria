/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `Manga` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `externalId` to the `Manga` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Manga" ADD COLUMN     "externalId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Manga_externalId_key" ON "Manga"("externalId");
