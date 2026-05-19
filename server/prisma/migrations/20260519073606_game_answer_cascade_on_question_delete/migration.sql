-- DropForeignKey
ALTER TABLE "GameAnswer" DROP CONSTRAINT "GameAnswer_questionId_fkey";

-- AddForeignKey
ALTER TABLE "GameAnswer" ADD CONSTRAINT "GameAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
