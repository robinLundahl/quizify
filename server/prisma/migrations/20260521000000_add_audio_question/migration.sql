-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'AUDIO';

-- CreateTable
CREATE TABLE "AudioQuestion" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "embedUrl" TEXT NOT NULL,

    CONSTRAINT "AudioQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AudioQuestion_questionId_key" ON "AudioQuestion"("questionId");

-- AddForeignKey
ALTER TABLE "AudioQuestion" ADD CONSTRAINT "AudioQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
