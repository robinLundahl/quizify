import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import NavBar from '../components/ui/NavBar'

// ─── Types ────────────────────────────────────────────────────────────────────

const THEME_ACCENT: Record<string, string> = {
  sunset: '#eb7f86',
  forest: '#4da284',
  rose:   '#cc607d',
  peach:  '#fac484',
  ocean:  '#63a6a0',
}

interface MarketplaceListing {
  id: string
  price: number
  currency: string
  rentalPrice: number | null
  listingScore: number
  versionAtPublish: number
  themeColor?: string | null
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
  creator: { id: string; name: string; avatar: string | null }
  avgRating: number | null
  reviewCount: number
  purchaseCount: number
}

interface MarketplaceResponse {
  listings: MarketplaceListing[]
  total: number
  page: number
  pageSize: number
}

// ─── Currency ─────────────────────────────────────────────────────────────────

const RATES: Record<string, Record<string, number>> = {
  USD: { USD: 1,     SEK: 10.5,  EUR: 0.92 },
  SEK: { USD: 0.095, SEK: 1,     EUR: 0.088 },
  EUR: { USD: 1.09,  SEK: 11.36, EUR: 1 },
}

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', SEK: 'kr', EUR: '€' }

function convertPrice(amount: number, from: string, to: string): number {
  return Math.round(amount * (RATES[from]?.[to] ?? 1))
}

function formatPrice(amount: number, from: string, to: string): string {
  const converted = convertPrice(amount, from, to)
  const sym = CURRENCY_SYMBOL[to] ?? to
  return to === 'SEK' ? `${converted} ${sym}` : `${sym}${converted}`
}

// ─── Filter constants ─────────────────────────────────────────────────────────

const CATEGORIES = [
  'Agriculture','AI','Art & Literature','Banking & Insurance','Chemistry',
  'Communication','Culture & Tradition','Dance','Design','Economics',
  'Education','Entertainment','Film & TV','Food & Drink','General Knowledge',
  'Geography','History','Languages','Law','Literature','Marketing & Sales',
  'Mathematics','Music','Nutrition','Physics','Science','Security',
  'Social Studies','Sports','Technology','Theatre','Travel & Tourism',
]

const LANGUAGES = ['Swedish','English','Norwegian','Danish','German','French','Spanish']

const Q_RANGES = [
  { label: '1–10',   min: 1,   max: 10       },
  { label: '11–20',  min: 11,  max: 20       },
  { label: '21–30',  min: 21,  max: 30       },
  { label: '31–40',  min: 31,  max: 40       },
  { label: '41–50',  min: 41,  max: 50       },
  { label: '51–60',  min: 51,  max: 60       },
  { label: '61–70',  min: 61,  max: 70       },
  { label: '71–80',  min: 71,  max: 80       },
  { label: '81–90',  min: 81,  max: 90       },
  { label: '91–100', min: 91,  max: 100      },
  { label: '100+',   min: 101, max: Infinity },
]

const PRICE_RANGES: Record<string, Array<{ label: string; min: number; max: number | null }>> = {
  USD: [
    { label: 'Free',      min: 0,   max: 0    },
    { label: 'Under $5',  min: 1,   max: 4    },
    { label: '$5–$15',    min: 5,   max: 15   },
    { label: '$15+',      min: 16,  max: null },
  ],
  SEK: [
    { label: 'Free',        min: 0,   max: 0    },
    { label: 'Under 50 kr', min: 1,   max: 49   },
    { label: '50–150 kr',   min: 50,  max: 150  },
    { label: '150+ kr',     min: 151, max: null },
  ],
  EUR: [
    { label: 'Free',     min: 0,  max: 0    },
    { label: 'Under €5', min: 1,  max: 4    },
    { label: '€5–€13',   min: 5,  max: 13   },
    { label: '€13+',     min: 14, max: null },
  ],
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-xs text-gray-400">—</span>
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <svg key={i} className={`h-3 w-3 ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">{rating.toFixed(1)}</span>
    </span>
  )
}

// ─── Quiz card ────────────────────────────────────────────────────────────────

function QuizCard({ listing, displayCurrency }: { listing: MarketplaceListing; displayCurrency: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const accent = listing.themeColor ? (THEME_ACCENT[listing.themeColor] ?? null) : null

  function handleShare() {
    const url = `${window.location.origin}/marketplace/${listing.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
      {accent && (
        <div className="h-1 w-full rounded-full" style={{ backgroundColor: accent }} />
      )}
      <div className="flex items-start justify-between gap-2">
        <Link to={`/marketplace/${listing.id}`} className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 hover:text-indigo-600 transition-colors">
            {listing.quiz.title}
          </h3>
        </Link>
        <button
          onClick={handleShare}
          title={copied ? t('marketplace.share_copied') : t('marketplace.share')}
          className="shrink-0 text-gray-400 hover:text-indigo-600 transition-colors"
        >
          {copied ? (
            <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
          )}
        </button>
      </div>

      {listing.quiz.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{listing.quiz.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {listing.quiz.category && (
          <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            {listing.quiz.category}
          </span>
        )}
        {listing.quiz.difficulty && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${difficultyColor[listing.quiz.difficulty] ?? ''}`}>
            {difficultyLabel[listing.quiz.difficulty] ?? listing.quiz.difficulty}
          </span>
        )}
        {listing.quiz.language && (
          <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
            {listing.quiz.language}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{t('marketplace.questions_count', { count: listing.quiz.questionCount })}</span>
          <Stars rating={listing.avgRating} />
        </div>
        <div className="text-sm font-semibold text-indigo-600">
          {listing.price === 0
            ? t('marketplace.free')
            : formatPrice(listing.price, listing.currency, displayCurrency)}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {listing.creator.avatar ? (
          <img src={listing.creator.avatar} alt={listing.creator.name} className="h-5 w-5 rounded-full object-cover"/>
        ) : (
          <div className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-semibold text-indigo-600">
            {listing.creator.name[0]?.toUpperCase()}
          </div>
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400">{listing.creator.name}</span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Landing() {
  const { t } = useTranslation()

  const [search, setSearch]             = useState('')
  const [category, setCategory]         = useState('')
  const [language, setLanguage]         = useState('')
  const [difficulty, setDifficulty]     = useState('')
  const [qRange, setQRange]             = useState('')
  const [minRating, setMinRating]       = useState('')
  const [priceRange, setPriceRange]     = useState('')
  const [sort, setSort]                 = useState('score')
  const [displayCurrency, setDisplayCurrency] = useState('USD')
  const [page, setPage]                 = useState(1)

  const params = new URLSearchParams({
    ...(search     ? { search }     : {}),
    ...(category   ? { category }   : {}),
    ...(language   ? { language }   : {}),
    ...(difficulty ? { difficulty } : {}),
    sort,
    page: String(page),
    limit: '24',
  })

  const { data, isLoading } = useQuery<MarketplaceResponse>({
    queryKey: ['marketplace', search, category, language, difficulty, sort, page],
    queryFn: () => api.get(`/marketplace?${params}`).then((r) => r.data),
    staleTime: 60_000,
  })

  const selectedQRange = Q_RANGES.find((r) => r.label === qRange)

  const listings = useMemo(() => {
    if (!data?.listings) return []
    let result = data.listings
    if (selectedQRange) {
      result = result.filter(
        (l) => l.quiz.questionCount >= selectedQRange.min && l.quiz.questionCount <= selectedQRange.max,
      )
    }
    if (minRating) {
      const min = parseFloat(minRating)
      result = result.filter((l) => l.avgRating !== null && l.avgRating >= min)
    }
    if (priceRange) {
      const range = (PRICE_RANGES[displayCurrency] ?? []).find((r) => r.label === priceRange)
      if (range) {
        result = result.filter((l) => {
          const converted = convertPrice(l.price, l.currency, displayCurrency)
          return range.max === null ? converted >= range.min : converted >= range.min && converted <= range.max
        })
      }
    }
    return result
  }, [data, selectedQRange, minRating, priceRange, displayCurrency])

  function resetFilters() {
    setSearch(''); setCategory(''); setLanguage(''); setDifficulty('')
    setQRange(''); setMinRating(''); setPriceRange(''); setSort('score'); setPage(1)
  }

  const hasFilters = !!(search || category || language || difficulty || qRange || minRating || priceRange)

  const SELECT_CLS = 'border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        {/* Search */}
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('marketplace.search_placeholder')}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} className={SELECT_CLS}>
            <option value="">{t('marketplace.filter_category')}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={language} onChange={(e) => { setLanguage(e.target.value); setPage(1) }} className={SELECT_CLS}>
            <option value="">{t('marketplace.filter_language')}</option>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>

          <select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setPage(1) }} className={SELECT_CLS}>
            <option value="">{t('marketplace.filter_difficulty')}</option>
            <option value="easy">{t('marketplace.difficulty_easy')}</option>
            <option value="medium">{t('marketplace.difficulty_medium')}</option>
            <option value="hard">{t('marketplace.difficulty_hard')}</option>
          </select>

          <select value={qRange} onChange={(e) => setQRange(e.target.value)} className={SELECT_CLS}>
            <option value="">{t('marketplace.filter_questions')}</option>
            {Q_RANGES.map((r) => <option key={r.label} value={r.label}>{r.label}</option>)}
          </select>

          <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className={SELECT_CLS}>
            <option value="">{t('marketplace.filter_rating')}</option>
            {['1','2','3','4'].map((v) => (
              <option key={v} value={v}>{'★'.repeat(Number(v))}+</option>
            ))}
          </select>

          <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)} className={SELECT_CLS}>
            <option value="">{t('marketplace.filter_price')}</option>
            {(PRICE_RANGES[displayCurrency] ?? []).map((r) => (
              <option key={r.label} value={r.label}>{r.label}</option>
            ))}
          </select>

          {hasFilters && (
            <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1.5">
              ✕ Clear
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('marketplace.result_count_other', { count: data?.total ?? 0 })}
          </p>
          <div className="flex items-center gap-2">
            <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }} className={SELECT_CLS}>
              <option value="score">{t('marketplace.sort_score')}</option>
              <option value="newest">{t('marketplace.sort_newest')}</option>
              <option value="price_asc">{t('marketplace.sort_price_asc')}</option>
              <option value="price_desc">{t('marketplace.sort_price_desc')}</option>
            </select>
            <select value={displayCurrency} onChange={(e) => { setDisplayCurrency(e.target.value); setPriceRange(''); setPage(1) }} className={SELECT_CLS}>
              <option value="USD">USD</option>
              <option value="SEK">SEK</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 dark:border-gray-700 border-t-indigo-600"/>
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('marketplace.empty_title')}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('marketplace.empty_hint')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <QuizCard key={listing.id} listing={listing} displayCurrency={displayCurrency}/>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.total > data.pageSize && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition"
            >
              ←
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {page} / {Math.ceil(data.total / data.pageSize)}
            </span>
            <button
              disabled={page >= Math.ceil(data.total / data.pageSize)}
              onClick={() => setPage((p) => p + 1)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition"
            >
              →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
