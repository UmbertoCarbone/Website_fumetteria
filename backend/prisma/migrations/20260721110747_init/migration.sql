-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "ExternalSource" AS ENUM ('TCG_PRICE_LOOKUP', 'JIKAN', 'BGG', 'MANUAL');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Franchise" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Franchise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FranchiseAlias" (
    "id" SERIAL NOT NULL,
    "alias" TEXT NOT NULL,
    "source" "ExternalSource" NOT NULL,
    "franchiseId" INTEGER NOT NULL,

    CONSTRAINT "FranchiseAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[],
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" INTEGER NOT NULL,
    "franchiseId" INTEGER,
    "externalId" TEXT,
    "externalSource" "ExternalSource",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "set" TEXT NOT NULL,
    "variant" TEXT NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunkoPop" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "boxNumber" INTEGER NOT NULL,
    "isChase" BOOLEAN NOT NULL DEFAULT false,
    "stickerExclusive" TEXT,

    CONSTRAINT "FunkoPop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manga" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "volumeNumber" INTEGER NOT NULL,
    "author" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "synopsis" TEXT,

    CONSTRAINT "Manga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardGame" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "description" TEXT,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "playingTime" INTEGER,
    "minPlayTime" INTEGER,
    "maxPlayTime" INTEGER,
    "minAge" INTEGER,
    "yearPublished" INTEGER,

    CONSTRAINT "BoardGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Franchise_name_key" ON "Franchise"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Franchise_slug_key" ON "Franchise"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FranchiseAlias_alias_source_key" ON "FranchiseAlias"("alias", "source");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_categoryId_franchiseId_idx" ON "Product"("categoryId", "franchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_externalId_externalSource_key" ON "Product"("externalId", "externalSource");

-- CreateIndex
CREATE UNIQUE INDEX "Card_productId_key" ON "Card"("productId");

-- CreateIndex
CREATE INDEX "Card_set_idx" ON "Card"("set");

-- CreateIndex
CREATE UNIQUE INDEX "FunkoPop_productId_key" ON "FunkoPop"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Manga_productId_key" ON "Manga"("productId");

-- CreateIndex
CREATE INDEX "Manga_author_idx" ON "Manga"("author");

-- CreateIndex
CREATE UNIQUE INDEX "BoardGame_productId_key" ON "BoardGame"("productId");

-- AddForeignKey
ALTER TABLE "FranchiseAlias" ADD CONSTRAINT "FranchiseAlias_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunkoPop" ADD CONSTRAINT "FunkoPop_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manga" ADD CONSTRAINT "Manga_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardGame" ADD CONSTRAINT "BoardGame_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
