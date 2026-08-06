-- AlterEnum
ALTER TYPE "ExternalSource" ADD VALUE 'REBRICKABLE';

-- CreateTable
CREATE TABLE "LegoSet" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "theme" TEXT,
    "pieceCount" INTEGER,
    "minifigCount" INTEGER,
    "yearReleased" INTEGER,

    CONSTRAINT "LegoSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegoSet_productId_key" ON "LegoSet"("productId");

-- AddForeignKey
ALTER TABLE "LegoSet" ADD CONSTRAINT "LegoSet_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
