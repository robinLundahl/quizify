import type { QuestionType } from '../generated/prisma/client.js'

export const FREE_QUIZ_LIMIT = 1

export const FREE_QUESTION_TYPES: QuestionType[] = [
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'OPEN_ENDED',
]
