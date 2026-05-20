-- AlterTable
ALTER TABLE "AnswerOption" ADD COLUMN     "translations" JSONB;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "translations" JSONB;

-- AlterTable
ALTER TABLE "RankingItem" ADD COLUMN     "translations" JSONB;
