-- AlterTable
ALTER TABLE "LegoSet" ADD COLUMN     "themeParent" TEXT;

-- CreateTable
CREATE TABLE "LegoMinifig" (
    "id" SERIAL NOT NULL,
    "legoSetId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "LegoMinifig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegoMinifig_legoSetId_idx" ON "LegoMinifig"("legoSetId");

-- AddForeignKey
ALTER TABLE "LegoMinifig" ADD CONSTRAINT "LegoMinifig_legoSetId_fkey" FOREIGN KEY ("legoSetId") REFERENCES "LegoSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
