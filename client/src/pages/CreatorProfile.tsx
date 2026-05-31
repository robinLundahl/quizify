import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import NavBar from '../components/ui/NavBar'
import { tCategory, tLanguage } from '../lib/i18nMaps'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorListing {
  id: string
  price: number
  currency: string
  rentalPrice: number | null
  themeColor?: string | null
  createdAt: string
  quiz: {
    id: string
    title: string
    description: string | null
    coverImage: string | null
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

const RATES: Record<string, Record<string, number>> = {
  USD: { USD: 1,     SEK: 10.5,  EUR: 0.92 },
  SEK: { USD: 0.095, SEK: 1,     EUR: 0.088 },
  EUR: { USD: 1.09,  SEK: 11.36, EUR: 1 },
}
const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', SEK: 'kr', EUR: '€' }

function formatPrice(amountCents: number, from: string, to: string): string {
  const converted = (amountCents / 100) * (RATES[from]?.[to] ?? 1)
  const sym = CURRENCY_SYMBOL[to] ?? to
  return to === 'SEK' ? `${Math.round(converted)} ${sym}` : `${sym}${converted.toFixed(2)}`
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-600'}`}
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

const DIFFICULTY_TEXT_COLOR: Record<string, string> = {
  easy:   'text-green-600 dark:text-green-400',
  medium: 'text-yellow-600 dark:text-yellow-500',
  hard:   'text-red-600 dark:text-red-400',
}

type BackState = { from: 'profile'; creatorId: string; creatorName: string }

function ListingCard({ listing, displayCurrency, backState }: { listing: CreatorListing; displayCurrency: string; backState: BackState }) {
  const { t } = useTranslation()
  const diff = listing.quiz.difficulty

  return (
    <div className="group isolate flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
      {/* ── Image hero ── */}
      <Link to={`/marketplace/${listing.id}`} state={backState} className="relative block h-48 overflow-hidden bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500">
        {listing.quiz.coverImage ? (
          <img
            src={listing.quiz.coverImage}
            alt={listing.quiz.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-6xl font-black text-white/20 select-none">
              {listing.quiz.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-7 pt-4">
          <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">{listing.quiz.title}</h3>
          <p className="mt-0.5 text-xs text-white/70">
            {t('marketplace.questions_count', { count: listing.quiz.questionCount })}
          </p>
        </div>
      </Link>

      {/* ── Card body ── */}
      <div className="relative -mt-3 flex flex-1 flex-col gap-3 rounded-t-2xl bg-white p-4 dark:bg-gray-800">
        {/* Rating + price */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {listing.avgRating !== null ? (
              <>
                <Stars rating={listing.avgRating} />
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{listing.avgRating.toFixed(1)}</span>
                {listing.reviewCount > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">({listing.reviewCount})</span>
                )}
              </>
            ) : (
              <span className="text-xs italic text-gray-400 dark:text-gray-500">{t('marketplace.no_reviews', { defaultValue: 'No reviews yet' })}</span>
            )}
          </div>
          <span className="shrink-0 text-base font-bold text-indigo-600 dark:text-indigo-400">
            {listing.price === 0 ? t('marketplace.free') : formatPrice(listing.price, listing.currency, displayCurrency)}
          </span>
        </div>

        {/* Description */}
        <p className="line-clamp-2 min-h-10 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {listing.quiz.description ?? ''}
        </p>

        {/* Metadata columns */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700">
          <div className="min-w-0 pr-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t('marketplace.filter_category')}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
              {listing.quiz.category ? tCategory(listing.quiz.category, t) : '—'}
            </p>
          </div>
          <div className="min-w-0 px-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t('marketplace.card_difficulty')}
            </p>
            <p className={`mt-0.5 truncate text-xs font-semibold ${diff ? (DIFFICULTY_TEXT_COLOR[diff] ?? 'text-gray-800 dark:text-gray-200') : 'text-gray-400 dark:text-gray-500'}`}>
              {diff ? t(`marketplace.difficulty_${diff}`, { defaultValue: diff }) : '—'}
            </p>
          </div>
          <div className="min-w-0 pl-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t('marketplace.filter_language')}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
              {listing.quiz.language ? tLanguage(listing.quiz.language, t) : '—'}
            </p>
          </div>
        </div>

        {/* View button */}
        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
          <Link
            to={`/marketplace/${listing.id}`}
            state={backState}
            className="block w-full rounded-xl bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            {t('marketplace.view', { defaultValue: 'View' })}
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CreatorProfile() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const [displayCurrency, setDisplayCurrency] = useState('USD')

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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {t('creator.published_quizzes')}
                </h2>
                <select
                  value={displayCurrency}
                  onChange={(e) => setDisplayCurrency(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="USD">USD</option>
                  <option value="SEK">SEK</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              {creator.listings.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">{t('creator.no_quizzes')}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {creator.listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      displayCurrency={displayCurrency}
                      backState={{ from: 'profile', creatorId: creator.id, creatorName: creator.name }}
                    />
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
