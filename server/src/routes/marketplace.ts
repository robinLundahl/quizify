import { Router } from 'express'
import { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'
import { verifyToken } from '../lib/jwt.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

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
              id: true, title: true, description: true, category: true,
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
    purchases.map((p) => ({
      purchaseId: p.id,
      purchaseDate: p.purchaseDate,
      versionAtPurchase: p.versionAtPurchase,
      listing: {
        id: p.listing.id,
        versionAtPublish: p.listing.versionAtPublish,
        themeColor: p.listing.themeColor,
        quiz: p.listing.quiz,
        creator: p.listing.creator,
      },
    }))
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
              id: true, title: true, description: true, category: true,
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
    rentals.map((r) => ({
      rentalId: r.id,
      rentedAt: r.rentedAt,
      expiresAt: r.expiresAt,
      isExpired: r.expiresAt < now,
      listing: {
        id: r.listing.id,
        themeColor: r.listing.themeColor,
        quiz: r.listing.quiz,
        creator: r.listing.creator,
      },
    }))
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

  if (userId) {
    const [purchase, rental] = await Promise.all([
      prisma.quizPurchase.findFirst({ where: { buyerId: userId, listingId: id } }),
      prisma.quizRental.findFirst({
        where: { userId, listingId: id, expiresAt: { gt: new Date() } },
      }),
    ])
    owned = !!purchase
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
    prisma.quiz.findFirst({ where: { id: quizId, ownerId: req.userId! } }),
    prisma.user.findUnique({ where: { id: req.userId! } }),
  ])

  if (!quiz || !user) {
    res.status(404).json({ error: 'Quiz not found' })
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
  const existing = await prisma.quizPurchase.findFirst({ where: { buyerId: req.userId!, listingId: id } })
  if (existing) {
    res.json({ ok: true })
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
    select: { quizId: true, creatorId: true },
  })
  if (!listing) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  // Creator can always view their own listing's quiz
  if (listing.creatorId !== req.userId) {
    const [purchase, rental] = await Promise.all([
      prisma.quizPurchase.findFirst({ where: { buyerId: req.userId!, listingId: id } }),
      prisma.quizRental.findFirst({ where: { userId: req.userId!, listingId: id, expiresAt: { gt: new Date() } } }),
    ])
    if (!purchase && !rental) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: listing.quizId },
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

// POST /:id/unpublish — take a listing off the marketplace
router.post('/:id/unpublish', requireAuth, async (req, res) => {
  const id = req.params.id as string
  const listing = await prisma.marketplaceListing.findFirst({
    where: { id, creatorId: req.userId! },
  })
  if (!listing) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  await prisma.marketplaceListing.update({
    where: { id },
    data: { status: 'UNPUBLISHED' },
  })
  res.json({ ok: true })
})

// PATCH /:id/version — bump version when creator applies quiz edits to the listing
router.patch('/:id/version', requireAuth, async (req, res) => {
  const id = req.params.id as string
  const listing = await prisma.marketplaceListing.findFirst({
    where: { id, creatorId: req.userId!, status: 'PUBLISHED' },
  })
  if (!listing) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const updated = await prisma.marketplaceListing.update({
    where: { id },
    data: { versionAtPublish: { increment: 1 } },
  })
  res.json({ id: updated.id, versionAtPublish: updated.versionAtPublish })
})

export default router
