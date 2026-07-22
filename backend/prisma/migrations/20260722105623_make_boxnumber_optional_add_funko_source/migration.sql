-- AlterEnum
ALTER TYPE "ExternalSource" ADD VALUE 'FUNKO_DATASET';

-- AlterTable
ALTER TABLE "FunkoPop" ALTER COLUMN "boxNumber" DROP NOT NULL;
