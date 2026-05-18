/*
  Warnings:

  - You are about to drop the column `radiusKm` on the `MapQuestion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MapQuestion" DROP COLUMN "radiusKm";

-- CreateTable
CREATE TABLE "MapRing" (
    "id" TEXT NOT NULL,
    "mapQuestionId" TEXT NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL,
    "points" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "MapRing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapRing_mapQuestionId_order_idx" ON "MapRing"("mapQuestionId", "order");

-- AddForeignKey
ALTER TABLE "MapRing" ADD CONSTRAINT "MapRing_mapQuestionId_fkey" FOREIGN KEY ("mapQuestionId") REFERENCES "MapQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
