import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { requireAuth } from '../middleware/requireAuth.js'
import { prisma } from '../lib/prisma.js'
import { getSupabase } from '../lib/supabase.js'

const IMAGES_BUCKET = 'question-images'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed.'))
    }
  },
})

const router = Router()
router.use(requireAuth)

router.post('/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded.' })
    return
  }
  const supabase = getSupabase()
  const ext = path.extname(req.file.originalname).toLowerCase()
  const filePath = `${req.userId}/${Date.now()}${ext}`
  const { error: uploadError } = await supabase.storage
    .from(IMAGES_BUCKET)
    .upload(filePath, req.file.buffer, { contentType: req.file.mimetype })
  if (uploadError) {
    res.status(500).json({ error: 'Upload failed. Please try again.' })
    return
  }
  const { data: { publicUrl } } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(filePath)
  res.json({ url: publicUrl })
})

router.get('/', async (req, res) => {
  const quizzes = await prisma.quiz.findMany({
    where: { ownerId: req.userId! },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { questions: true } },
      sessions: {
        where: { status: 'FINISHED' },
        orderBy: { finishedAt: 'desc' },
        take: 3,
        select: { id: true, code: true, finishedAt: true },
      },
    },
  })
  res.json(quizzes)
})

router.post('/', async (req, res) => {
  const { title, description } = req.body as { title?: string; description?: string }
  if (!title?.trim()) {
    res.status(400).json({ error: 'Title is required' })
    return
  }
  const quiz = await prisma.quiz.create({
    data: { title: title.trim(), description: description?.trim(), ownerId: req.userId! },
  })
  res.status(201).json(quiz)
})

router.get('/:id', async (req, res) => {
  const quiz = await prisma.quiz.findFirst({
    where: { id: req.params.id, ownerId: req.userId! },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: {
          answerOptions: true,
          mapQuestion: { include: { rings: { orderBy: { order: 'asc' } } } },
          rankingItems: { orderBy: { correctPosition: 'asc' } },
        },
      },
    },
  })
  if (!quiz) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(quiz)
})

router.put('/:id', async (req, res) => {
  const { title, description } = req.body as { title?: string; description?: string }
  const exists = await prisma.quiz.findFirst({ where: { id: req.params.id, ownerId: req.userId! } })
  if (!exists) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const quiz = await prisma.quiz.update({
    where: { id: req.params.id },
    data: { title: title?.trim(), description: description?.trim() },
  })
  res.json(quiz)
})

router.delete('/:id', async (req, res) => {
  const exists = await prisma.quiz.findFirst({ where: { id: req.params.id, ownerId: req.userId! } })
  if (!exists) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  await prisma.quiz.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

router.post('/:id/questions', async (req, res) => {
  const quiz = await prisma.quiz.findFirst({ where: { id: req.params.id, ownerId: req.userId! } })
  if (!quiz) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const { type, text, imageUrl, order, timeLimit, points, answerOptions, mapQuestion, correctAnswer, rankingItems } = req.body
  const question = await prisma.question.create({
    data: {
      quizId: req.params.id,
      type,
      text,
      imageUrl,
      order: order ?? 0,
      timeLimit: timeLimit ?? 20,
      points: points ?? 1000,
      ...buildRelations(type, answerOptions, correctAnswer, mapQuestion, rankingItems),
    },
    include: {
      answerOptions: true,
      mapQuestion: { include: { rings: { orderBy: { order: 'asc' } } } },
      rankingItems: { orderBy: { correctPosition: 'asc' } },
    },
  })
  res.status(201).json(question)
})

router.patch('/:id/questions/reorder', async (req, res) => {
  const quiz = await prisma.quiz.findFirst({ where: { id: req.params.id, ownerId: req.userId! } })
  if (!quiz) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const { orders } = req.body as { orders: { id: string; order: number }[] }
  if (!Array.isArray(orders)) {
    res.status(400).json({ error: 'orders array required' })
    return
  }
  await prisma.$transaction(
    orders.map(({ id, order }) => prisma.question.update({ where: { id }, data: { order } }))
  )
  res.json({ ok: true })
})

router.put('/:id/questions/:qid', async (req, res) => {
  const question = await prisma.question.findFirst({
    where: { id: req.params.qid, quiz: { id: req.params.id, ownerId: req.userId! } },
  })
  if (!question) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const { type, text, imageUrl, order, timeLimit, points, answerOptions, mapQuestion, correctAnswer, rankingItems } = req.body

  await prisma.answerOption.deleteMany({ where: { questionId: req.params.qid } })
  await prisma.mapQuestion.deleteMany({ where: { questionId: req.params.qid } })
  await prisma.rankingItem.deleteMany({ where: { questionId: req.params.qid } })

  const updated = await prisma.question.update({
    where: { id: req.params.qid },
    data: {
      type,
      text,
      imageUrl,
      order,
      timeLimit,
      points,
      ...buildRelations(type, answerOptions, correctAnswer, mapQuestion, rankingItems),
    },
    include: {
      answerOptions: true,
      mapQuestion: true,
      rankingItems: { orderBy: { correctPosition: 'asc' } },
    },
  })
  res.json(updated)
})

router.delete('/:id/questions/:qid', async (req, res) => {
  const question = await prisma.question.findFirst({
    where: { id: req.params.qid, quiz: { id: req.params.id, ownerId: req.userId! } },
  })
  if (!question) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  await prisma.question.delete({ where: { id: req.params.qid } })
  res.status(204).send()
})

type AnswerOptionInput = { text: string; isCorrect: boolean }
type MapRingInput = { radiusKm: number; points: number; order: number }
type MapQuestionInput = { lat: number; lng: number; rings?: MapRingInput[] }
type RankingItemInput = { label: string; correctPosition: number; order: number }

function buildRelations(
  type: string,
  answerOptions: AnswerOptionInput[] | undefined,
  correctAnswer: string | undefined,
  mapQuestion: MapQuestionInput | undefined,
  rankingItems: RankingItemInput[] | undefined,
) {
  if (type === 'TRUE_FALSE') {
    return {
      answerOptions: {
        create: [
          { text: 'True', isCorrect: correctAnswer === 'true' },
          { text: 'False', isCorrect: correctAnswer === 'false' },
        ],
      },
    }
  }
  if ((type === 'MULTIPLE_CHOICE' || type === 'IMAGE') && answerOptions?.length) {
    return { answerOptions: { create: answerOptions } }
  }
  if (type === 'MAP' && mapQuestion) {
    return {
      mapQuestion: {
        create: {
          lat: mapQuestion.lat,
          lng: mapQuestion.lng,
          rings: mapQuestion.rings?.length
            ? { create: mapQuestion.rings }
            : undefined,
        },
      },
    }
  }
  if (type === 'RANKING' && rankingItems?.length) {
    return { rankingItems: { create: rankingItems } }
  }
  return {}
}

export default router
