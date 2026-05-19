-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'RANKING';

-- CreateTable
CREATE TABLE "RankingItem" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "correctPosition" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "RankingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankingItem_questionId_correctPosition_idx" ON "RankingItem"("questionId", "correctPosition");

-- AddForeignKey
ALTER TABLE "RankingItem" ADD CONSTRAINT "RankingItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
