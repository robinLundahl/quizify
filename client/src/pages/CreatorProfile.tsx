import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import NavBar from '../components/ui/NavBar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorListing {
  id: string
  price: number
  currency: string
  rentalPrice: number | null
  createdAt: string
  quiz: {
    id: string
    title: string
    description: string | null
    category: string | null
    language: string | null
    difficulty: string | null
    questionCount: number
  }
  avgRating: number | null
  reviewCount: number
  purchaseCount: number
}

interface CreatorProfileData {
  id: string
  name: string
  avatar: string | null
  bio: string | null
  createdAt: string
  stats: {
    totalPublished: number
    avgRating: number | null
    totalReviews: number
  }
  listings: CreatorListing[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', SEK: 'kr', EUR: '€' }

function formatPrice(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOL[currency] ?? currency
  return currency === 'SEK' ? `${amount} ${sym}` : `${sym}${amount}`
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`h-3 w-3 ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  )
}

// ─── Listing card ─────────────────────────────────────────────────────────────

const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  hard:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function ListingCard({ listing }: { listing: CreatorListing }) {
  const { t } = useTranslation()
  const diff = listing.quiz.difficulty

  return (
    <Link
      to={`/marketplace/${listing.id}`}
      className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
    >
      <div className="flex flex-wrap gap-1.5">
        {listing.quiz.category && (
          <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            {listing.quiz.category}
          </span>
        )}
        {diff && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DIFFICULTY_COLOR[diff] ?? ''}`}>
            {t(`marketplace.difficulty_${diff}`, { defaultValue: diff })}
          </span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">
          {listing.quiz.title}
        </h3>
        {listing.quiz.description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {listing.quiz.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{t('marketplace.questions_count', { count: listing.quiz.questionCount })}</span>
        {listing.avgRating !== null && (
          <span className="flex items-center gap-1">
            <Stars rating={listing.avgRating} />
            <span>{listing.avgRating.toFixed(1)}</span>
          </span>
        )}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {listing.price === 0 ? t('marketplace.free') : formatPrice(listing.price, listing.currency)}
        </span>
      </div>
    </Link>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CreatorProfile() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()

  const { data: creator, isLoading, isError } = useQuery<CreatorProfileData>({
    queryKey: ['creator-profile', id],
    queryFn: () => api.get(`/marketplace/creator/${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 60_000,
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">

        <Link
          to="/"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 transition-colors mb-6 inline-block"
        >
          {t('marketplace.back_to_marketplace')}
        </Link>

        {isLoading && (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 dark:border-gray-700 border-t-indigo-600" />
          </div>
        )}

        {isError && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-24">
            {t('creator.not_found')}
          </p>
        )}

        {creator && (
          <div className="space-y-8">

            {/* ── Creator header ── */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 flex flex-col sm:flex-row gap-5">
              {creator.avatar ? (
                <img
                  src={creator.avatar}
                  alt={creator.name}
                  className="h-20 w-20 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-2xl font-bold text-indigo-600 shrink-0">
                  {creator.name[0]?.toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{creator.name}</h1>
                {creator.bio && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {creator.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>
                    {t('creator.quizzes_published', { count: creator.stats.totalPublished })}
                  </span>
                  {creator.stats.avgRating !== null && (
                    <span className="flex items-center gap-1.5">
                      <Stars rating={creator.stats.avgRating} />
                      <span>
                        {t('creator.avg_rating', {
                          rating: creator.stats.avgRating.toFixed(1),
                          count: creator.stats.totalReviews,
                        })}
                      </span>
                    </span>
                  )}
                  <span>
                    {t('creator.member_since', {
                      date: new Date(creator.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                      }),
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Listings grid ── */}
            <section>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('creator.published_quizzes')}
              </h2>

              {creator.listings.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">{t('creator.no_quizzes')}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {creator.listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
