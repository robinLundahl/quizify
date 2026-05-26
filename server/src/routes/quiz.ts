import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { requireAuth } from '../middleware/requireAuth.js'
import { prisma } from '../lib/prisma.js'
import { anthropic } from '../lib/anthropic.js'
import { getSupabase } from '../lib/supabase.js'
import { parseAudioUrl } from '../lib/audioUrl.js'
import { FREE_QUIZ_LIMIT, FREE_QUESTION_TYPES } from '../lib/planLimits.js'

const IMAGES_BUCKET = 'question-images'

function shuffled<T>(arr: T[]): T[] {
  const result = arr.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

async function fetchPexelsImage(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: key } },
    )
    if (!res.ok) return null
    const data = (await res.json()) as { photos: { src: { large: string } }[] }
    return data.photos[0]?.src.large ?? null
  } catch {
    return null
  }
}

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
        where: { status: 'FINISHED', hostId: req.userId! },
        orderBy: { finishedAt: 'desc' },
        take: 3,
        select: { id: true, code: true, finishedAt: true },
      },
      listings: {
        where: { creatorId: req.userId! },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, status: true, price: true, currency: true, rentalPrice: true, versionAtPublish: true },
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
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { plan: true } })
  if (user?.plan === 'FREE') {
    const count = await prisma.quiz.count({ where: { ownerId: req.userId! } })
    if (count >= FREE_QUIZ_LIMIT) {
      res.status(403).json({ error: 'Free plan is limited to 1 quiz. Upgrade to Pro to create more.' })
      return
    }
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
          audioQuestion: true,
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
  const { title, description, category, language, difficulty } = req.body as {
    title?: string; description?: string
    category?: string; language?: string; difficulty?: string
  }
  const exists = await prisma.quiz.findFirst({ where: { id: req.params.id, ownerId: req.userId! } })
  if (!exists) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const quiz = await prisma.quiz.update({
    where: { id: req.params.id },
    data: {
      title: title?.trim(),
      description: description?.trim(),
      ...(category !== undefined ? { category: category.trim() || null } : {}),
      ...(language !== undefined ? { language: language.trim() || null } : {}),
      ...(difficulty !== undefined ? { difficulty: difficulty.trim() || null } : {}),
    },
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
  const { type, text, imageUrl, order, timeLimit, useTimer, points, answerOptions, mapQuestion, correctAnswer, rankingItems, correctAnswers, audioUrl } = req.body
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { plan: true } })
  if (user?.plan === 'FREE' && !FREE_QUESTION_TYPES.includes(type)) {
    res.status(403).json({ error: 'This question type requires a Pro plan.' })
    return
  }
  const question = await prisma.question.create({
    data: {
      quizId: req.params.id,
      type,
      text,
      imageUrl,
      order: order ?? 0,
      timeLimit: timeLimit ?? 20,
      useTimer: useTimer ?? true,
      points: points ?? 1000,
      correctAnswers: (type === 'OPEN_ENDED' || type === 'AUDIO') ? (correctAnswers ?? []) : [],
      ...buildRelations(type, answerOptions, correctAnswer, mapQuestion, rankingItems, audioUrl),
    },
    include: {
      answerOptions: true,
      mapQuestion: { include: { rings: { orderBy: { order: 'asc' } } } },
      audioQuestion: true,
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
  const { type, text, imageUrl, order, timeLimit, useTimer, points, answerOptions, mapQuestion, correctAnswer, rankingItems, correctAnswers, audioUrl } = req.body
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { plan: true } })
  if (user?.plan === 'FREE' && !FREE_QUESTION_TYPES.includes(type)) {
    res.status(403).json({ error: 'This question type requires a Pro plan.' })
    return
  }

  await prisma.answerOption.deleteMany({ where: { questionId: req.params.qid } })
  await prisma.mapQuestion.deleteMany({ where: { questionId: req.params.qid } })
  await prisma.audioQuestion.deleteMany({ where: { questionId: req.params.qid } })
  await prisma.rankingItem.deleteMany({ where: { questionId: req.params.qid } })

  const updated = await prisma.question.update({
    where: { id: req.params.qid },
    data: {
      type,
      text,
      imageUrl,
      order,
      timeLimit,
      useTimer: useTimer ?? true,
      points,
      correctAnswers: (type === 'OPEN_ENDED' || type === 'AUDIO') ? (correctAnswers ?? []) : [],
      ...buildRelations(type, answerOptions, correctAnswer, mapQuestion, rankingItems, audioUrl),
    },
    include: {
      answerOptions: true,
      mapQuestion: true,
      audioQuestion: true,
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

router.post('/:id/generate', async (req, res) => {
  const quiz = await prisma.quiz.findFirst({ where: { id: req.params.id, ownerId: req.userId! } })
  if (!quiz) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  let user = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!user || user.plan !== 'PRO') {
    res.status(403).json({ error: 'AI generation requires a PRO plan.' })
    return
  }

  const now = new Date()
  if (
    now.getMonth() !== user.aiGenerationsResetAt.getMonth() ||
    now.getFullYear() !== user.aiGenerationsResetAt.getFullYear()
  ) {
    user = await prisma.user.update({
      where: { id: req.userId! },
      data: { aiGenerationsUsedThisMonth: 0, aiGenerationsResetAt: now },
    })
  }

  if (user.aiGenerationsUsedThisMonth >= 20) {
    res.status(429).json({ error: 'Monthly AI generation quota exhausted.' })
    return
  }

  const { topic, category, language, difficulty, count, withImage } = req.body as {
    topic: string
    category: string
    language: string
    difficulty: string
    count: number
    withImage: boolean
  }

  const questionType = withImage ? 'IMAGE' : 'MULTIPLE_CHOICE'

  let message: Awaited<ReturnType<typeof anthropic.messages.create>>
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: 'You are a quiz question generator. Respond with valid JSON only — an array of objects, no markdown, no explanation.',
      messages: [
        {
          role: 'user',
          content: `Generate ${count} multiple-choice quiz questions about "${topic}".
Category: ${category}. Language: ${language}. Difficulty: ${difficulty}.
Each object must follow this schema:
{
  "text": "question text",${withImage ? '\n  "imageSearchQuery": "2-5 word English phrase for a relevant stock photo",' : ''}
  "answerOptions": [
    { "text": "option", "isCorrect": true },
    { "text": "option", "isCorrect": false },
    { "text": "option", "isCorrect": false },
    { "text": "option", "isCorrect": false }
  ]
}
Exactly 4 answer options per question, exactly 1 correct.${withImage ? ' The imageSearchQuery must be a concise English phrase that describes a clear, visually distinct image relevant to the question.' : ''} Return a JSON array of ${count} objects.`,
        },
      ],
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: `AI service error: ${msg.split('\n')[0]}` })
    return
  }

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    res.status(502).json({ error: 'AI returned unexpected response format.' })
    return
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(textBlock.text)
  } catch {
    res.status(502).json({ error: 'AI returned invalid JSON.' })
    return
  }

  type RawQuestion = { text: string; imageSearchQuery?: string; answerOptions: { text: string; isCorrect: boolean }[] }
  const isValid =
    Array.isArray(parsed) &&
    (parsed as unknown[]).every((q) => {
      const item = q as RawQuestion
      if (typeof item?.text !== 'string') return false
      if (!Array.isArray(item.answerOptions) || item.answerOptions.length !== 4) return false
      const correctCount = item.answerOptions.filter((a) => a.isCorrect === true).length
      return correctCount === 1
    })

  if (!isValid) {
    res.status(502).json({ error: 'AI returned malformed question data.' })
    return
  }

  const rawQuestions = (parsed as RawQuestion[]).map((q) => ({
    ...q,
    answerOptions: shuffled(q.answerOptions),
  }))

  const imageUrls: (string | null)[] = withImage
    ? await Promise.all(rawQuestions.map((q) => fetchPexelsImage(q.imageSearchQuery ?? q.text)))
    : rawQuestions.map(() => null)

  const existingCount = await prisma.question.count({ where: { quizId: req.params.id } })

  const created = await prisma.$transaction(
    rawQuestions.map((q, i) =>
      prisma.question.create({
        data: {
          quizId: req.params.id,
          type: questionType,
          text: q.text,
          imageUrl: imageUrls[i] ?? undefined,
          order: existingCount + i,
          timeLimit: 20,
          useTimer: true,
          points: 1000,
          correctAnswers: [],
          ...buildRelations(questionType, q.answerOptions, undefined, undefined, undefined, undefined),
        },
        include: {
          answerOptions: true,
          mapQuestion: { include: { rings: { orderBy: { order: 'asc' } } } },
          audioQuestion: true,
          rankingItems: { orderBy: { correctPosition: 'asc' } },
        },
      })
    )
  )

  await prisma.user.update({
    where: { id: req.userId! },
    data: { aiGenerationsUsedThisMonth: { increment: 1 } },
  })

  res.status(201).json(created)
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
  audioUrl: string | undefined,
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
  if (type === 'AUDIO') {
    const parsed = audioUrl ? parseAudioUrl(audioUrl) : null
    return parsed
      ? { audioQuestion: { create: { url: audioUrl!, platform: parsed.platform, embedUrl: parsed.embedUrl } } }
      : {}
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
