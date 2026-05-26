import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import NavBar from '../components/ui/NavBar'
import { useAuth } from '../hooks/useAuth'

const IS_DEV = import.meta.env.DEV

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreviewQuestion {
  id: string
  type: string
  text: string
  imageUrl: string | null
  answerOptions: Array<{ id: string; text: string }>
}

interface Review {
  rating: number
  body: string | null
  createdAt: string
  buyerName: string
  buyerAvatar: string | null
}

const THEME_ACCENT: Record<string, string> = {
  sunset: '#eb7f86',
  forest: '#4da284',
  rose:   '#cc607d',
  peach:  '#fac484',
  ocean:  '#63a6a0',
}

interface ListingDetail {
  id: string
  price: number
  currency: string
  rentalPrice: number | null
  themeColor: string | null
  createdAt: string
  quiz: {
    id: string
    title: string
    description: string | null
    category: string | null
    language: string | null
    difficulty: string | null
    questionCount: number
    previewQuestions: PreviewQuestion[]
  }
  creator: { id: string; name: string; avatar: string | null; bio: string | null }
  avgRating: number | null
  reviewCount: number
  purchaseCount: number
  reviews: Review[]
  owned: boolean
  activeRental: { expiresAt: string } | null
}

// ─── Currency helpers ─────────────────────────────────────────────────────────

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

// ─── Time remaining ───────────────────────────────────────────────────────────

function formatRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'expired'
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'h-4 w-4' : 'h-3 w-3'
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`${sz} ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  )
}

// ─── Question preview card ────────────────────────────────────────────────────

function QuestionPreviewCard({ question, index }: { question: PreviewQuestion; index: number }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
        {t('marketplace.preview_title')} · Q{index + 1}
      </p>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">{question.text}</p>
      {question.imageUrl && (
        <img src={question.imageUrl} alt="" className="rounded-lg mb-3 max-h-40 object-cover w-full" />
      )}
      {question.answerOptions.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {question.answerOptions.map((opt) => (
            <div key={opt.id} className="rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
              {opt.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketplaceListing() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [displayCurrency, setDisplayCurrency] = useState('USD')
  const [copied, setCopied] = useState(false)

  const qc = useQueryClient()

  const { data: listing, isLoading, isError } = useQuery<ListingDetail>({
    queryKey: ['marketplace-listing', id],
    queryFn: () => api.get(`/marketplace/${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 60_000,
  })

  const devClaim = useMutation({
    mutationFn: () => api.post(`/marketplace/${id}/dev-claim`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketplace-listing', id] }),
  })

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleBuy() {
    if (!user) {
      navigate('/login', { state: { returnTo: `/marketplace/${id}` } })
      return
    }
    if (IS_DEV) {
      devClaim.mutate()
      return
    }
    // Purchase flow — TICKET-067
  }

  function handleRent() {
    if (!user) {
      navigate('/login', { state: { returnTo: `/marketplace/${id}` } })
      return
    }
    // Rental flow — TICKET-074
  }

  const difficultyColor: Record<string, string> = {
    easy:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    hard:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  const difficultyLabel: Record<string, string> = {
    easy:   t('marketplace.difficulty_easy'),
    medium: t('marketplace.difficulty_medium'),
    hard:   t('marketplace.difficulty_hard'),
  }

  const SELECT_CLS = 'border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'

  const accent = listing?.themeColor ? (THEME_ACCENT[listing.themeColor] ?? null) : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">

        {/* Back link */}
        <Link to="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 transition-colors mb-6 inline-block">
          {t('marketplace.back_to_marketplace')}
        </Link>

        {isLoading && (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 dark:border-gray-700 border-t-indigo-600" />
          </div>
        )}

        {isError && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-24">{t('marketplace.listing_not_found')}</p>
        )}

        {listing && (
          <div className="flex flex-col lg:flex-row gap-8">

            {/* ── Main content ── */}
            <div className="flex-1 min-w-0 space-y-6">

              {accent && (
                <div className="h-1 w-full rounded-full" style={{ backgroundColor: accent }} />
              )}

              {/* Header */}
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {listing.quiz.category && (
                    <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      {listing.quiz.category}
                    </span>
                  )}
                  {listing.quiz.difficulty && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyColor[listing.quiz.difficulty] ?? ''}`}>
                      {difficultyLabel[listing.quiz.difficulty] ?? listing.quiz.difficulty}
                    </span>
                  )}
                  {listing.quiz.language && (
                    <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                      {listing.quiz.language}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {listing.quiz.title}
                </h1>

                {listing.quiz.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {listing.quiz.description}
                  </p>
                )}

                {/* Creator */}
                <div className="flex items-center gap-2 mt-4">
                  {listing.creator.avatar ? (
                    <img src={listing.creator.avatar} alt={listing.creator.name} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-semibold text-indigo-600">
                      {listing.creator.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {listing.creator.name}
                  </span>
                  {/* Creator profile — TICKET-063 */}
                  <Link
                    to={`/creator/${listing.creator.id}`}
                    className="text-xs text-indigo-500 hover:underline"
                  >
                    {t('marketplace.view_creator_profile')}
                  </Link>
                </div>

                {listing.creator.bio && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">{listing.creator.bio}</p>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{t('marketplace.questions_count', { count: listing.quiz.questionCount })}</span>
                {listing.avgRating !== null && (
                  <span className="flex items-center gap-1">
                    <Stars rating={listing.avgRating} />
                    <span>{listing.avgRating.toFixed(1)} ({listing.reviewCount})</span>
                  </span>
                )}
                <span>
                  {listing.purchaseCount === 1
                    ? t('marketplace.purchases_count_one', { count: listing.purchaseCount })
                    : t('marketplace.purchases_count_other', { count: listing.purchaseCount })}
                </span>
              </div>

              {/* Question preview */}
              <section>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {t('marketplace.preview_title')}
                </h2>
                <div className="space-y-3">
                  {listing.quiz.previewQuestions.map((q, i) => (
                    <QuestionPreviewCard key={q.id} question={q} index={i} />
                  ))}
                </div>

                {/* Locked questions */}
                {listing.quiz.questionCount > listing.quiz.previewQuestions.length && (
                  <div className="mt-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 p-6 text-center select-none">
                    <div className="blur-sm pointer-events-none space-y-2 mb-4">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-3 rounded bg-gray-200 dark:bg-gray-700" style={{ width: `${65 + i * 10}%`, margin: '0 auto' }} />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('marketplace.preview_locked', {
                        count: listing.quiz.questionCount - listing.quiz.previewQuestions.length,
                      })}
                    </p>
                  </div>
                )}
              </section>

              {/* Reviews */}
              <section>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {t('marketplace.reviews_title')}
                  {listing.avgRating !== null && (
                    <span className="ml-2 font-normal text-sm text-gray-500 dark:text-gray-400">
                      {listing.avgRating.toFixed(1)} / 5
                    </span>
                  )}
                </h2>

                {listing.reviews.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">{t('marketplace.no_reviews')}</p>
                ) : (
                  <div className="space-y-4">
                    {listing.reviews.map((review, i) => (
                      <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {review.buyerAvatar ? (
                            <img src={review.buyerAvatar} alt={review.buyerName} className="h-6 w-6 rounded-full object-cover" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-500">
                              {review.buyerName[0]?.toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{review.buyerName}</span>
                          <Stars rating={review.rating} />
                          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {review.body && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{review.body}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* ── Sidebar ── */}
            <aside className="w-full lg:w-72 shrink-0">
              <div className="sticky top-24 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-4">

                {/* Currency toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Currency</span>
                  <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)} className={SELECT_CLS}>
                    <option value="USD">USD</option>
                    <option value="SEK">SEK</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                {/* Price */}
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {listing.price === 0
                      ? t('marketplace.free')
                      : formatPrice(listing.price, listing.currency, displayCurrency)}
                  </p>
                  {listing.rentalPrice && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {t('marketplace.rent_button', {
                        price: formatPrice(listing.rentalPrice, listing.currency, displayCurrency),
                      })}
                    </p>
                  )}
                </div>

                {/* CTA buttons */}
                {listing.owned ? (
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400 text-center">
                    {t('marketplace.you_own_this')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={handleBuy}
                      disabled={devClaim.isPending}
                      className="w-full text-white rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60"
                      style={accent ? { backgroundColor: accent } : { backgroundColor: '#4f46e5' }}
                    >
                      {IS_DEV
                        ? t('marketplace.dev_add_to_dashboard', { defaultValue: 'Add to dashboard (dev)' })
                        : listing.price === 0
                        ? t('marketplace.free')
                        : t('marketplace.buy_button', {
                            price: formatPrice(listing.price, listing.currency, displayCurrency),
                          })}
                    </button>

                    {listing.rentalPrice && (
                      listing.activeRental ? (
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-2.5 text-xs text-blue-700 dark:text-blue-400 text-center">
                          {t('marketplace.rented_expires', { time: formatRemaining(listing.activeRental.expiresAt) })}
                        </div>
                      ) : (
                        <button
                          onClick={handleRent}
                          className="w-full border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
                        >
                          {t('marketplace.rent_button', {
                            price: formatPrice(listing.rentalPrice, listing.currency, displayCurrency),
                          })}
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* Share */}
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  {copied ? (
                    <>
                      <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('marketplace.share_copied')}
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      {t('marketplace.share')}
                    </>
                  )}
                </button>

                {/* Report — TICKET-081 */}
                <button className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors text-center py-1">
                  {t('marketplace.report_listing')}
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
