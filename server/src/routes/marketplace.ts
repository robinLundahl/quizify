import { Router } from 'express'
import { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'
import { verifyToken } from '../lib/jwt.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { parseSnapshots, getVersionedSnapshot, parseCustomSnapshot, type SnapshotQuestion, type QuizMeta } from '../lib/snapshotUtils.js'

const router = Router()

// ─── Snapshot helpers ─────────────────────────────────────────────────────────

type QuestionRow = {
  id: string; quizId: string; type: string; text: string; imageUrl: string | null
  correctAnswers: string[]; translations: unknown; order: number; timeLimit: number
  useTimer: boolean; points: number
  answerOptions: { id: string; questionId: string; text: string; isCorrect: boolean; translations: unknown }[]
  mapQuestion: {
    id: string; questionId: string; lat: number; lng: number
    rings: { id: string; mapQuestionId: string; radiusKm: number; points: number; order: number }[]
  } | null
  audioQuestion: { id: string; questionId: string; url: string; platform: string; embedUrl: string } | null
  rankingItems: { id: string; questionId: string; label: string; correctPosition: number; order: number; translations: unknown }[]
}

function buildQuestionSnapshots(questions: QuestionRow[]) {
  return questions.map((q) => ({
    id: q.id, quizId: q.quizId, type: q.type, text: q.text,
    imageUrl: q.imageUrl, correctAnswers: q.correctAnswers, translations: q.translations,
    order: q.order, timeLimit: q.timeLimit, useTimer: q.useTimer, points: q.points,
    answerOptions: q.answerOptions,
    mapQuestion: q.mapQuestion ?? null,
    audioQuestion: q.audioQuestion ?? null,
    rankingItems: q.rankingItems,
  }))
}

function buildVersionedSnapshot(
  meta: { title: string; description: string | null; category: string | null; language: string | null; difficulty: string | null },
  questions: QuestionRow[],
) {
  return { meta, questions: buildQuestionSnapshots(questions) }
}

const QUESTION_INCLUDE = {
  answerOptions: true,
  mapQuestion: { include: { rings: { orderBy: { order: 'asc' } as const } } },
  audioQuestion: true,
  rankingItems: { orderBy: { correctPosition: 'asc' } as const },
} as const

// ─────────────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const {
    search,
    category,
    language,
    difficulty,
    sort = 'score',
    page = '1',
    limit = '24',
  } = req.query as Record<string, string>

  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const pageSize = Math.min(48, Math.max(1, parseInt(limit, 10) || 24))

  const where: Prisma.MarketplaceListingWhereInput = {
    status: 'PUBLISHED',
    quiz: {
      ...(category ? { category } : {}),
      ...(language ? { language } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
  }

  const orderBy: Prisma.MarketplaceListingOrderByWithRelationInput =
    sort === 'newest'
      ? { createdAt: 'desc' }
      : sort === 'price_asc'
      ? { price: 'asc' }
      : sort === 'price_desc'
      ? { price: 'desc' }
      : { listingScore: 'desc' }

  const [rows, total] = await Promise.all([
    prisma.marketplaceListing.findMany({
      where,
      orderBy,
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            language: true,
            difficulty: true,
            _count: { select: { questions: true } },
          },
        },
        creator: { select: { id: true, name: true, avatar: true } },
        purchases: {
          select: { review: { select: { rating: true } } },
        },
        _count: { select: { purchases: true } },
      },
    }),
    prisma.marketplaceListing.count({ where }),
  ])

  const listings = rows.map((row) => {
    const ratings = row.purchases
      .map((p) => p.review?.rating)
      .filter((r): r is number => r !== undefined && r !== null)
    const avgRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null
    return {
      id: row.id,
      price: row.price,
      currency: row.currency,
      rentalPrice: row.rentalPrice,
      listingScore: row.listingScore,
      versionAtPublish: row.versionAtPublish,
      themeColor: row.themeColor,
      createdAt: row.createdAt,
      quiz: {
        id: row.quiz.id,
        title: row.quiz.title,
        description: row.quiz.description,
        category: row.quiz.category,
        language: row.quiz.language,
        difficulty: row.quiz.difficulty,
        questionCount: row.quiz._count.questions,
      },
      creator: row.creator,
      avgRating,
      reviewCount: ratings.length,
      purchaseCount: row._count.purchases,
    }
  })

  res.json({ listings, total, page: pageNum, pageSize })
})

// ─── Auth-protected buyer routes ─────────────────────────────────────────────
// Must be registered before GET /:id to avoid Express matching 'purchases'/'rentals' as an id.

// DELETE /purchases/:id — remove a purchase record for the current user
router.delete('/purchases/:id', requireAuth, async (req, res) => {
  const id = req.params.id as string
  const purchase = await prisma.quizPurchase.findUnique({ where: { id }, select: { buyerId: true } })
  if (!purchase) { res.status(404).json({ error: 'Not found' }); return }
  if (purchase.buyerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }
  await prisma.quizPurchase.delete({ where: { id } })
  res.status(204).send()
})

// DELETE /rentals/:id — remove a rental record for the current user
router.delete('/rentals/:id', requireAuth, async (req, res) => {
  const id = req.params.id as string
  const rental = await prisma.quizRental.findUnique({ where: { id }, select: { userId: true } })
  if (!rental) { res.status(404).json({ error: 'Not found' }); return }
  if (rental.userId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }
  await prisma.quizRental.delete({ where: { id } })
  res.status(204).send()
})

// GET /purchases — quizzes the current user has purchased
router.get('/purchases', requireAuth, async (req, res) => {
  const purchases = await prisma.quizPurchase.findMany({
    where: { buyerId: req.userId! },
    orderBy: { purchaseDate: 'desc' },
    include: {
      listing: {
        include: {
          quiz: {
            select: {
              id: true, title: true, description: true, category: true, language: true, difficulty: true,
              sessions: {
                where: { status: 'FINISHED', hostId: req.userId! },
                orderBy: { finishedAt: 'desc' },
                take: 3,
                select: { id: true, code: true, finishedAt: true },
              },
            },
          },
          creator: { select: { id: true, name: true, avatar: true } },
        },
      },
    },
  })

  res.json(
    purchases.map((p) => {
      // Use the snapshot at the buyer's purchased version so they see the content they own,
      // not the creator's latest. Fall back to the newest published version, then live quiz fields.
      const snapshotMeta =
        getVersionedSnapshot(p.listing.contentSnapshot, p.versionAtPurchase)?.meta ??
        getVersionedSnapshot(p.listing.contentSnapshot, p.listing.versionAtPublish)?.meta
      return {
        purchaseId: p.id,
        purchaseDate: p.purchaseDate,
        versionAtPurchase: p.versionAtPurchase,
        listing: {
          id: p.listing.id,
          status: p.listing.status,
          versionAtPublish: p.listing.versionAtPublish,
          themeColor: p.listing.themeColor,
          quiz: {
            id: p.listing.quiz.id,
            title: snapshotMeta?.title ?? p.listing.quiz.title,
            description: snapshotMeta?.description ?? p.listing.quiz.description,
            category: snapshotMeta?.category ?? p.listing.quiz.category,
            language: snapshotMeta?.language ?? p.listing.quiz.language,
            difficulty: snapshotMeta?.difficulty ?? p.listing.quiz.difficulty,
            sessions: p.listing.quiz.sessions,
          },
          creator: p.listing.creator,
        },
      }
    })
  )
})

// GET /rentals — current user's rentals (active and expired)
router.get('/rentals', requireAuth, async (req, res) => {
  const rentals = await prisma.quizRental.findMany({
    where: { userId: req.userId! },
    orderBy: { rentedAt: 'desc' },
    include: {
      listing: {
        include: {
          quiz: {
            select: {
              id: true, title: true, description: true, category: true, language: true, difficulty: true,
              sessions: {
                where: { status: 'FINISHED', hostId: req.userId! },
                orderBy: { finishedAt: 'desc' },
                take: 3,
                select: { id: true, code: true, finishedAt: true },
              },
            },
          },
          creator: { select: { id: true, name: true, avatar: true } },
        },
      },
    },
  })

  const now = new Date()
  res.json(
    rentals.map((r) => {
      const snapshotMeta = getVersionedSnapshot(r.listing.contentSnapshot, r.listing.versionAtPublish)?.meta
      return {
        rentalId: r.id,
        rentedAt: r.rentedAt,
        expiresAt: r.expiresAt,
        isExpired: r.expiresAt < now,
        listing: {
          id: r.listing.id,
          status: r.listing.status,
          themeColor: r.listing.themeColor,
          quiz: {
            id: r.listing.quiz.id,
            title: snapshotMeta?.title ?? r.listing.quiz.title,
            description: snapshotMeta?.description ?? r.listing.quiz.description,
            category: snapshotMeta?.category ?? r.listing.quiz.category,
            language: snapshotMeta?.language ?? r.listing.quiz.language,
            difficulty: snapshotMeta?.difficulty ?? r.listing.quiz.difficulty,
            sessions: r.listing.quiz.sessions,
          },
          creator: r.listing.creator,
        },
      }
    })
  )
})

// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  const { id } = req.params

  // Optional auth — needed to determine owned/rental status
  let userId: string | null = null
  try {
    const token = req.cookies?.token as string | undefined
    if (token) userId = verifyToken(token).userId
  } catch {}

  const listing = await prisma.marketplaceListing.findUnique({
    where: { id, status: 'PUBLISHED' },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { order: 'asc' },
            take: 2,
            include: {
              answerOptions: { select: { id: true, text: true } },
            },
          },
          _count: { select: { questions: true } },
        },
      },
      creator: { select: { id: true, name: true, avatar: true, bio: true } },
      purchases: {
        include: {
          buyer: { select: { name: true, avatar: true } },
          review: true,
        },
      },
    },
  })

  if (!listing) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const ratings = listing.purchases
    .map((p) => p.review?.rating)
    .filter((r): r is number => r !== undefined && r !== null)
  const avgRating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null

  let owned = false
  let activeRental: { expiresAt: string } | null = null

  let updateAvailable = false

  if (userId) {
    const [purchase, rental] = await Promise.all([
      prisma.quizPurchase.findFirst({
        where: { buyerId: userId, listingId: id },
      }),
      prisma.quizRental.findFirst({
        where: { userId, listingId: id, expiresAt: { gt: new Date() } },
      }),
    ])
    owned = !!purchase
    if (purchase) updateAvailable = purchase.versionAtPurchase < listing.versionAtPublish
    if (rental) activeRental = { expiresAt: rental.expiresAt.toISOString() }
  }

  res.json({
    id: listing.id,
    price: listing.price,
    currency: listing.currency,
    rentalPrice: listing.rentalPrice,
    themeColor: listing.themeColor,
    createdAt: listing.createdAt,
    quiz: {
      id: listing.quiz.id,
      title: listing.quiz.title,
      description: listing.quiz.description,
      category: listing.quiz.category,
      language: listing.quiz.language,
      difficulty: listing.quiz.difficulty,
      questionCount: listing.quiz._count.questions,
      previewQuestions: listing.quiz.questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        imageUrl: q.imageUrl,
        answerOptions: q.answerOptions,
      })),
    },
    creator: listing.creator,
    avgRating,
    reviewCount: ratings.length,
    purchaseCount: listing.purchases.length,
    reviews: listing.purchases
      .filter((p) => p.review)
      .map((p) => ({
        rating: p.review!.rating,
        body: p.review!.body,
        createdAt: p.review!.createdAt,
        buyerName: p.buyer.name,
        buyerAvatar: p.buyer.avatar,
      })),
    owned,
    updateAvailable,
    activeRental,
  })
})

// ─── Creator profile (public) ─────────────────────────────────────────────────
// NOTE: /my/:quizId, POST /, POST /:id/unpublish, PATCH /:id/version are placed
// after the creator route but before export. Two-segment paths never conflict
// with the single-segment GET /:id route above.

router.get('/creator/:id', async (req, res) => {
  const { id } = req.params

  const creator = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatar: true,
      bio: true,
      createdAt: true,
      listings: {
        where: { status: 'PUBLISHED' },
        orderBy: { listingScore: 'desc' },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              description: true,
              category: true,
              language: true,
              difficulty: true,
              _count: { select: { questions: true } },
            },
          },
          purchases: {
            select: { review: { select: { rating: true } } },
          },
          _count: { select: { purchases: true } },
        },
      },
    },
  })

  if (!creator) {
    res.status(404).json({ error: 'Creator not found' })
    return
  }

  const listings = creator.listings.map((row) => {
    const ratings = row.purchases
      .map((p) => p.review?.rating)
      .filter((r): r is number => r !== undefined && r !== null)
    const avgRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null
    return {
      id: row.id,
      price: row.price,
      currency: row.currency,
      rentalPrice: row.rentalPrice,
      listingScore: row.listingScore,
      themeColor: row.themeColor,
      createdAt: row.createdAt,
      quiz: {
        id: row.quiz.id,
        title: row.quiz.title,
        description: row.quiz.description,
        category: row.quiz.category,
        language: row.quiz.language,
        difficulty: row.quiz.difficulty,
        questionCount: row.quiz._count.questions,
      },
      avgRating,
      reviewCount: ratings.length,
      purchaseCount: row._count.purchases,
    }
  })

  const allRatings = listings.flatMap((l) =>
    l.avgRating !== null ? [l.avgRating] : []
  )
  const overallAvgRating = allRatings.length
    ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10
    : null

  res.json({
    id: creator.id,
    name: creator.name,
    avatar: creator.avatar,
    bio: creator.bio,
    createdAt: creator.createdAt,
    stats: {
      totalPublished: listings.length,
      avgRating: overallAvgRating,
      totalReviews: listings.reduce((sum, l) => sum + l.reviewCount, 0),
    },
    listings,
  })
})

// ─── Auth-protected creator routes ───────────────────────────────────────────

// GET /my/:quizId — current user's listing for a quiz (most recent)
router.get('/my/:quizId', requireAuth, async (req, res) => {
  const quizId = req.params.quizId as string
  const listing = await prisma.marketplaceListing.findFirst({
    where: { quizId, creatorId: req.userId! },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, price: true, currency: true, rentalPrice: true },
  })
  res.json(listing ?? null)
})

const VALID_THEME_COLORS = ['sunset', 'forest', 'rose', 'peach', 'ocean'] as const

// POST / — publish a quiz to the marketplace
router.post('/', requireAuth, async (req, res) => {
  const { quizId, price, currency, rentalPrice, themeColor } = req.body as {
    quizId: string
    price: number
    currency: string
    rentalPrice?: number
    themeColor?: string
  }

  const [quiz, user] = await Promise.all([
    prisma.quiz.findFirst({
      where: { id: quizId, ownerId: req.userId! },
      include: { questions: { orderBy: { order: 'asc' }, include: QUESTION_INCLUDE } },
    }),
    prisma.user.findUnique({ where: { id: req.userId! } }),
  ])

  if (!quiz || !user) {
    res.status(404).json({ error: 'Quiz not found' })
    return
  }
  if (quiz.questions.length < 5) {
    res.status(400).json({ error: 'min_questions' })
    return
  }
  if (!user.stripeAccountId && process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'stripe_required' })
    return
  }
  if (!Number.isInteger(price) || price < 99) {
    res.status(400).json({ error: 'price_too_low' })
    return
  }
  if (rentalPrice !== undefined && rentalPrice !== null) {
    if (!Number.isInteger(rentalPrice) || rentalPrice < 50) {
      res.status(400).json({ error: 'rental_too_low' })
      return
    }
    if (rentalPrice > Math.floor(price * 0.8)) {
      res.status(400).json({ error: 'rental_too_high' })
      return
    }
  }
  if (!['USD', 'SEK', 'EUR'].includes(currency)) {
    res.status(400).json({ error: 'Invalid currency' })
    return
  }
  if (user.plan === 'FREE') {
    const publishedCount = await prisma.marketplaceListing.count({
      where: { creatorId: req.userId!, status: 'PUBLISHED' },
    })
    if (publishedCount >= 3) {
      res.status(403).json({ error: 'free_limit' })
      return
    }
  }

  const validatedThemeColor =
    user.plan === 'PRO' && themeColor && VALID_THEME_COLORS.includes(themeColor as typeof VALID_THEME_COLORS[number])
      ? themeColor
      : null

  const contentSnapshot = { '1': buildVersionedSnapshot(quiz, quiz.questions) } as unknown as Prisma.InputJsonValue

  const listing = await prisma.marketplaceListing.create({
    data: {
      quizId,
      creatorId: req.userId!,
      price,
      currency: currency as 'USD' | 'SEK' | 'EUR',
      rentalPrice: rentalPrice ?? null,
      status: 'PUBLISHED',
      versionAtPublish: 1,
      themeColor: validatedThemeColor,
      contentSnapshot,
    },
  })
  res.status(201).json({
    id: listing.id,
    status: listing.status,
    price: listing.price,
    currency: listing.currency,
    rentalPrice: listing.rentalPrice,
    themeColor: listing.themeColor,
  })
})

// POST /:id/dev-claim — grant free access in dev (non-production only)
router.post('/:id/dev-claim', requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Not available in production' })
    return
  }
  const id = req.params.id as string
  const listing = await prisma.marketplaceListing.findUnique({ where: { id, status: 'PUBLISHED' } })
  if (!listing) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const existing = await prisma.quizPurchase.findFirst({
    where: { buyerId: req.userId!, listingId: id },
  })
  if (existing) {
    res.status(409).json({ error: 'already_owned' })
    return
  }
  await prisma.quizPurchase.create({
    data: {
      buyerId: req.userId!,
      listingId: id,
      amountPaid: 0,
      versionAtPurchase: listing.versionAtPublish,
    },
  })
  res.json({ ok: true })
})

// POST /:id/dev-rent — create a free 48h rental in dev (non-production only)
router.post('/:id/dev-rent', requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Not available in production' })
    return
  }
  const id = req.params.id as string
  const listing = await prisma.marketplaceListing.findUnique({ where: { id, status: 'PUBLISHED' } })
  if (!listing) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
  await prisma.quizRental.create({
    data: {
      userId: req.userId!,
      listingId: id,
      amountPaid: 0,
      expiresAt,
    },
  })
  res.json({ ok: true, expiresAt })
})

// GET /:id/quiz — full quiz content for buyers and renters
router.get('/:id/quiz', requireAuth, async (req, res) => {
  const id = req.params.id as string

  const listing = await prisma.marketplaceListing.findUnique({
    where: { id },
    select: { quizId: true, creatorId: true, contentSnapshot: true },
  })
  if (!listing) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  let buyerPurchase: { id: string; versionAtPurchase: number; customSnapshot: unknown } | null = null

  // Creator can always view their own listing's quiz
  if (listing.creatorId !== req.userId) {
    const [purchase, rental] = await Promise.all([
      prisma.quizPurchase.findFirst({
        where: { buyerId: req.userId!, listingId: id },
        select: { id: true, versionAtPurchase: true, customSnapshot: true },
      }),
      prisma.quizRental.findFirst({ where: { userId: req.userId!, listingId: id, expiresAt: { gt: new Date() } } }),
    ])
    if (!purchase && !rental) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    buyerPurchase = purchase ?? null
  }

  // For buyers: serve version-isolated content. If the buyer made selective choices, use their
  // custom snapshot; otherwise fall back to the versioned snapshot at their purchased version.
  if (buyerPurchase) {
    const snapshot =
      parseCustomSnapshot(buyerPurchase.customSnapshot) ??
      getVersionedSnapshot(listing.contentSnapshot, buyerPurchase.versionAtPurchase)
    if (snapshot) {
      const quizBase = await prisma.quiz.findUnique({
        where: { id: listing.quizId },
        select: { id: true, ownerId: true, createdAt: true, updatedAt: true },
      })
      // Prefer snapshot metadata if available, otherwise fall back to live quiz fields
      const meta = snapshot.meta ?? await prisma.quiz.findUnique({
        where: { id: listing.quizId },
        select: { title: true, description: true, category: true, language: true, difficulty: true },
      })
      return res.json({ ...quizBase, ...meta, questions: snapshot.questions })
    }
  }

  // Creator, renters, or old listings without full snapshots — serve live data
  const quiz = await prisma.quiz.findUnique({
    where: { id: listing.quizId },
    include: { questions: { orderBy: { order: 'asc' }, include: QUESTION_INCLUDE } },
  })
  if (!quiz) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  res.json(quiz)
})

// GET /:id/diff — changelog between buyer's purchased version and current listing
router.get('/:id/diff', requireAuth, async (req, res) => {
  const id = req.params.id as string

  const listing = await prisma.marketplaceListing.findUnique({
    where: { id, status: 'PUBLISHED' },
    select: {
      quizId: true,
      versionAtPublish: true,
      contentSnapshot: true,
      quiz: {
        select: {
          title: true, description: true, category: true, language: true, difficulty: true,
          questions: {
            orderBy: { order: 'asc' },
            include: {
              answerOptions: { select: { id: true, text: true, isCorrect: true } },
              rankingItems: { select: { id: true, label: true, correctPosition: true }, orderBy: { correctPosition: 'asc' as const } },
              mapQuestion: { select: { lat: true, lng: true, rings: { select: { radiusKm: true, points: true, order: true }, orderBy: { order: 'asc' as const } } } },
              audioQuestion: { select: { url: true, platform: true } },
            },
          },
        },
      },
    },
  })
  if (!listing) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const purchase = await prisma.quizPurchase.findFirst({
    where: { buyerId: req.userId!, listingId: id },
    select: { id: true, versionAtPurchase: true, customSnapshot: true },
  })
  if (!purchase || purchase.versionAtPurchase >= listing.versionAtPublish) {
    res.status(400).json({ error: 'No update available' })
    return
  }

  // ── Metadata diff ─────────────────────────────────────────────────────────
  const parsed = parseCustomSnapshot(purchase.customSnapshot)
  const oldSnapshot =
    (parsed?.diffBaseline ?? parsed) ??
    getVersionedSnapshot(listing.contentSnapshot, purchase.versionAtPurchase)
  type MetaChange = { field: string; before: string | null; after: string | null }
  const metaChanges: MetaChange[] = []
  if (oldSnapshot?.meta) {
    const metaFields: (keyof QuizMeta)[] = ['title', 'description', 'category', 'language', 'difficulty']
    for (const field of metaFields) {
      const before = oldSnapshot.meta[field] ?? null
      const after = (listing.quiz[field] as string | null | undefined) ?? null
      if (before !== after) metaChanges.push({ field, before, after })
    }
  }

  // ── Question diff ─────────────────────────────────────────────────────────
  type DiffQ = {
    id: string; text: string; type: string; timeLimit: number; points: number; useTimer: boolean; imageUrl: string | null
    correctAnswers?: string[]
    answerOptions: { text: string; isCorrect: boolean }[]
    rankingItems?: { label: string; correctPosition: number }[]
    mapQuestion?: { lat: number; lng: number; rings: { radiusKm: number; points: number }[] } | null
    audioQuestion?: { url: string; platform: string } | null
  }

  const oldQuestions: DiffQ[] = (oldSnapshot?.questions ?? []).map((q) => ({
    id: q.id, text: q.text, type: q.type,
    timeLimit: (q as SnapshotQuestion).timeLimit ?? 20,
    points: (q as SnapshotQuestion).points ?? 1000,
    useTimer: (q as SnapshotQuestion).useTimer ?? true,
    imageUrl: (q as SnapshotQuestion).imageUrl ?? null,
    correctAnswers: (q as SnapshotQuestion).correctAnswers ?? [],
    answerOptions: ((q as SnapshotQuestion).answerOptions ?? []).map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
    rankingItems: ((q as SnapshotQuestion).rankingItems ?? []).map((r) => ({ label: r.label, correctPosition: r.correctPosition })),
    mapQuestion: (q as SnapshotQuestion).mapQuestion ? {
      lat: (q as SnapshotQuestion).mapQuestion!.lat, lng: (q as SnapshotQuestion).mapQuestion!.lng,
      rings: (q as SnapshotQuestion).mapQuestion!.rings.map((r) => ({ radiusKm: r.radiusKm, points: r.points })),
    } : null,
    audioQuestion: (q as SnapshotQuestion).audioQuestion ? {
      url: (q as SnapshotQuestion).audioQuestion!.url, platform: (q as SnapshotQuestion).audioQuestion!.platform,
    } : null,
  }))

  const newQuestions: DiffQ[] = listing.quiz.questions.map((q) => ({
    id: q.id, text: q.text, type: q.type,
    timeLimit: q.timeLimit, points: q.points, useTimer: q.useTimer, imageUrl: q.imageUrl ?? null,
    correctAnswers: q.correctAnswers,
    answerOptions: q.answerOptions.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
    rankingItems: (q.rankingItems ?? []).map((r) => ({ label: r.label, correctPosition: r.correctPosition })),
    mapQuestion: q.mapQuestion ? {
      lat: q.mapQuestion.lat, lng: q.mapQuestion.lng,
      rings: q.mapQuestion.rings.map((r) => ({ radiusKm: r.radiusKm, points: r.points })),
    } : null,
    audioQuestion: q.audioQuestion ? { url: q.audioQuestion.url, platform: q.audioQuestion.platform } : null,
  }))

  const oldMap = new Map(oldQuestions.map((q) => [q.id, q]))
  const newMap = new Map(newQuestions.map((q) => [q.id, q]))

  const added = newQuestions.filter((q) => !oldMap.has(q.id))
  const removed = oldQuestions.filter((q) => !newMap.has(q.id))
  const modified = newQuestions
    .filter((q) => {
      const old = oldMap.get(q.id)
      if (!old) return false
      return JSON.stringify({ ...old, id: undefined }) !== JSON.stringify({ ...q, id: undefined })
    })
    .map((q) => ({ id: q.id, before: oldMap.get(q.id)!, after: q }))

  res.json({ added, removed, modified, metaChanges })
})

// POST /:id/claim-update — free version bump for buyers of this listing
// Body: { acceptAll?: boolean } for accept-all, or selective fields for partial apply:
//   acceptedMetaFields, acceptedAddedIds, acceptedModifiedIds, acceptedRemovedIds
router.post('/:id/claim-update', requireAuth, async (req, res) => {
  const id = req.params.id as string
  const body = req.body as {
    acceptAll?: boolean
    acceptedMetaFields?: string[]
    acceptedAddedIds?: string[]
    acceptedModifiedIds?: string[]
    acceptedRemovedIds?: string[]
  }

  const listingData = await prisma.marketplaceListing.findUnique({
    where: { id, status: 'PUBLISHED' },
    select: {
      versionAtPublish: true,
      contentSnapshot: true,
      quiz: {
        select: {
          title: true, description: true, category: true, language: true, difficulty: true,
          questions: { orderBy: { order: 'asc' }, include: QUESTION_INCLUDE },
        },
      },
    },
  })
  if (!listingData) { res.status(404).json({ error: 'Not found' }); return }

  const purchase = await prisma.quizPurchase.findFirst({
    where: { buyerId: req.userId!, listingId: id, versionAtPurchase: { lt: listingData.versionAtPublish } },
    select: { id: true, versionAtPurchase: true, customSnapshot: true },
  })
  if (!purchase) { res.status(400).json({ error: 'No update available' }); return }

  const existingCustom = parseCustomSnapshot(purchase.customSnapshot)

  // Fast path: accept-all with no prior partial state — wipe snapshot, use creator's full state.
  if (body.acceptAll !== false && !existingCustom) {
    await prisma.quizPurchase.update({
      where: { id: purchase.id },
      data: { versionAtPurchase: listingData.versionAtPublish, customSnapshot: Prisma.DbNull },
    })
    res.json({ ok: true }); return
  }

  // ── Merge path (selective or accept-all with prior partial state) ─────────────
  //
  // The diff the buyer saw was computed relative to diffBaseline (or the versioned snapshot
  // for first-time partial accepts). "Accepted changes" are only those from that diff.
  // Previously rejected changes must NEVER be applied, even when the buyer clicks "Accept All".

  // What the buyer was shown the diff from
  const baselineSnapshot =
    existingCustom?.diffBaseline ??
    getVersionedSnapshot(listingData.contentSnapshot, purchase.versionAtPurchase)
  const baselineQuestions: SnapshotQuestion[] = baselineSnapshot?.questions ?? []
  const baselineMeta: QuizMeta | null = baselineSnapshot?.meta ?? null

  // The buyer's current preferred question state (what they have now)
  const buyerQuestions: SnapshotQuestion[] = existingCustom?.questions ?? baselineQuestions
  const buyerMeta: QuizMeta | null = existingCustom?.meta ?? baselineMeta

  const lq = listingData.quiz
  const currentQMap = new Map(listingData.quiz.questions.map((q) => [q.id, q]))
  const baselineQSet = new Set(baselineQuestions.map((q) => q.id))
  const buyerQSet = new Set(buyerQuestions.map((q) => q.id))

  const isAcceptAll = body.acceptAll !== false

  // For accept-all: derive accepted IDs from what changed since the last baseline
  const acceptedAddedIds: Set<string> = isAcceptAll
    ? new Set(listingData.quiz.questions.filter((q) => !baselineQSet.has(q.id)).map((q) => q.id))
    : new Set(body.acceptedAddedIds ?? [])

  const acceptedRemovedIds: Set<string> = isAcceptAll
    ? new Set(baselineQuestions.filter((q) => !currentQMap.has(q.id)).map((q) => q.id))
    : new Set(body.acceptedRemovedIds ?? [])

  // For accept-all modified: only questions that actually changed since the baseline (not
  // ones that were already different because of prior rejections — those stay untouched).
  const acceptedModifiedIds: Set<string> = isAcceptAll
    ? new Set(
        baselineQuestions
          .filter((q) => {
            const curr = currentQMap.get(q.id)
            if (!curr) return false
            const baseKey = JSON.stringify({
              text: q.text, type: q.type,
              answerOptions: (q.answerOptions ?? []).map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
            })
            const currKey = JSON.stringify({
              text: curr.text, type: curr.type,
              answerOptions: curr.answerOptions.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
            })
            return baseKey !== currKey
          })
          .map((q) => q.id)
      )
    : new Set(body.acceptedModifiedIds ?? [])

  const metaFields: (keyof QuizMeta)[] = ['title', 'description', 'category', 'language', 'difficulty']
  const acceptedMetaFields: Set<string> = isAcceptAll
    ? new Set(
        baselineMeta
          ? metaFields.filter((f) => (baselineMeta[f] ?? null) !== ((lq[f] as string | null | undefined) ?? null))
          : []
      )
    : new Set(body.acceptedMetaFields ?? [])

  // Build merged question list starting from buyer's current state
  const mergedQuestions: SnapshotQuestion[] = []
  for (const oldQ of buyerQuestions) {
    if (currentQMap.has(oldQ.id)) {
      mergedQuestions.push(
        acceptedModifiedIds.has(oldQ.id)
          ? buildQuestionSnapshots([currentQMap.get(oldQ.id)!])[0]
          : oldQ
      )
    } else if (!acceptedRemovedIds.has(oldQ.id)) {
      mergedQuestions.push(oldQ)
    }
  }
  for (const newQ of listingData.quiz.questions) {
    if (!buyerQSet.has(newQ.id) && acceptedAddedIds.has(newQ.id)) {
      mergedQuestions.push(...buildQuestionSnapshots([newQ]))
    }
  }

  // Build merged meta starting from buyer's current meta
  const mergedMeta: QuizMeta = {
    title:       acceptedMetaFields.has('title')       ? lq.title                        : (buyerMeta?.title       ?? lq.title),
    description: acceptedMetaFields.has('description') ? (lq.description ?? null)        : (buyerMeta?.description ?? lq.description ?? null),
    category:    acceptedMetaFields.has('category')    ? (lq.category    ?? null)        : (buyerMeta?.category    ?? lq.category    ?? null),
    language:    acceptedMetaFields.has('language')    ? (lq.language    ?? null)        : (buyerMeta?.language    ?? lq.language    ?? null),
    difficulty:  acceptedMetaFields.has('difficulty')  ? (lq.difficulty  ?? null)        : (buyerMeta?.difficulty  ?? lq.difficulty  ?? null),
  }

  // diffBaseline advances to the creator's full current state so future diffs only show
  // changes introduced after this point — rejected changes are permanently discarded.
  const diffBaseline = {
    meta: {
      title: lq.title, description: lq.description ?? null,
      category: lq.category ?? null, language: lq.language ?? null, difficulty: lq.difficulty ?? null,
    },
    questions: buildQuestionSnapshots(listingData.quiz.questions),
  }

  const customSnapshot = { meta: mergedMeta, questions: mergedQuestions, diffBaseline }
  await prisma.quizPurchase.update({
    where: { id: purchase.id },
    data: {
      versionAtPurchase: listingData.versionAtPublish,
      customSnapshot: customSnapshot as unknown as Prisma.InputJsonValue,
    },
  })
  res.json({ ok: true })
})

// PATCH /:id/version — bump version when creator applies quiz edits to the listing
router.patch('/:id/version', requireAuth, async (req, res) => {
  const id = req.params.id as string
  const listing = await prisma.marketplaceListing.findFirst({
    where: { id, creatorId: req.userId!, status: 'PUBLISHED' },
    select: { versionAtPublish: true, contentSnapshot: true, quizId: true },
  })
  if (!listing) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const quiz = await prisma.quiz.findUnique({
    where: { id: listing.quizId },
    include: { questions: { orderBy: { order: 'asc' }, include: QUESTION_INCLUDE } },
  })
  const newVersion = listing.versionAtPublish + 1
  const newContentSnapshot = {
    ...parseSnapshots(listing.contentSnapshot),
    [newVersion.toString()]: buildVersionedSnapshot(quiz!, quiz!.questions),
  } as unknown as Prisma.InputJsonValue
  const updated = await prisma.marketplaceListing.update({
    where: { id },
    data: { versionAtPublish: newVersion, contentSnapshot: newContentSnapshot },
  })
  res.json({ id: updated.id, versionAtPublish: updated.versionAtPublish })
})

export default router
