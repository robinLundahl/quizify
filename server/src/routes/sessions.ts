import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { prisma } from '../lib/prisma.js'

const router = Router()

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = Array.from({ length: 6 }, () =>
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    ).join('')
    const existing = await prisma.gameSession.findUnique({ where: { code } })
    if (!existing) return code
  }
  throw new Error('Could not generate unique code')
}

router.post('/', requireAuth, async (req, res) => {
  const { quizId } = req.body as { quizId?: string }
  if (!quizId) return res.status(400).json({ error: 'quizId required' })

  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, ownerId: req.userId } })
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' })

  const code = await generateUniqueCode()
  const session = await prisma.gameSession.create({
    data: { quizId, hostId: req.userId!, code },
  })

  res.json({ code: session.code, sessionId: session.id })
})

router.get('/:code', async (req, res) => {
  const session = await prisma.gameSession.findUnique({
    where: { code: req.params.code.toUpperCase() },
    include: { quiz: { select: { title: true } } },
  })
  if (!session) return res.status(404).json({ error: 'Session not found' })

  res.json({
    sessionId: session.id,
    code: session.code,
    status: session.status,
    quizTitle: session.quiz.title,
  })
})

router.get('/:id/results', requireAuth, async (req, res) => {
  const sessionId = req.params.id as string
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      quiz: { select: { title: true } },
      participants: {
        orderBy: { score: 'desc' },
        include: { gameAnswers: true },
      },
    },
  })

  if (!session) return res.status(404).json({ error: 'Session not found' })
  if (session.hostId !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  const questions = await prisma.question.findMany({
    where: { quizId: session.quizId },
    orderBy: { order: 'asc' },
    include: { answerOptions: true },
  })

  const questionResults = questions.map((q) => {
    const resolvesOptionId = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'IMAGE'].includes(q.type)
    const answers = session.participants.flatMap((p) =>
      p.gameAnswers
        .filter((a) => a.questionId === q.id)
        .map((a) => {
          const displayAnswer = resolvesOptionId
            ? (q.answerOptions.find((o) => o.id === a.answer)?.text ?? a.answer)
            : a.answer
          return {
            nickname: p.nickname,
            answer: displayAnswer,
            pointsEarned: a.pointsEarned,
            responseTimeMs: a.responseTimeMs,
          }
        })
    )
    const correctOption = q.answerOptions.find((o) => o.isCorrect)
    return {
      id: q.id,
      text: q.text,
      type: q.type,
      correctAnswerText: correctOption?.text ?? null,
      totalAnswers: answers.length,
      correctAnswers: answers.filter((a) => a.pointsEarned > 0).length,
      answers,
    }
  })

  res.json({
    sessionId: session.id,
    quizTitle: session.quiz.title,
    status: session.status,
    finishedAt: session.finishedAt,
    leaderboard: session.participants.map((p, i) => ({
      rank: i + 1,
      nickname: p.nickname,
      score: p.score,
    })),
    questions: questionResults,
  })
})

export default router
