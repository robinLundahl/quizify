import { Router } from 'express'
import { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'
import { verifyToken } from '../lib/jwt.js'

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

export default router
