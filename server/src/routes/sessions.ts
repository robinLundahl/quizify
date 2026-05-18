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

export default router
