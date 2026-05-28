-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "listingId" TEXT;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
