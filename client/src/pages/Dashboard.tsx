import { useState, useRef, useLayoutEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import {
  useQuizzes, useCreateQuiz, useDeleteQuiz, useDeleteSession,
  useActiveSessions, usePurchases, useRentals,
  useDeletePurchase, useDeleteRental,
  type Quiz,
} from '../hooks/useQuizzes'
import NavDropdown from '../components/ui/NavDropdown'
import PublishModal from '../components/ui/PublishModal'
import UpdateModal from '../components/ui/UpdateModal'
import { useThemeStore, PRO_ONLY_THEMES } from '../store/themeStore'
import { useAuthStore } from '../store/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'quizzes' | 'purchased' | 'rentals' | 'earnings'


const TAB_ORDER: readonly Tab[] = ['quizzes', 'purchased', 'rentals', 'earnings']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return ''
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: quizzes, isLoading: quizzesLoading } = useQuizzes()
  const { data: activeSessions } = useActiveSessions()
  const { data: purchases, isLoading: purchasesLoading } = usePurchases()
  const { data: rentals, isLoading: rentalsLoading } = useRentals()
  const createQuiz = useCreateQuiz()
  const deleteQuiz = useDeleteQuiz()
  const deleteSession = useDeleteSession()
  const deletePurchase = useDeletePurchase()
  const deleteRental = useDeleteRental()

  const location = useLocation()
  const [activeTab, setActiveTab] = useState<Tab>((location.state as { tab?: Tab } | null)?.tab ?? 'quizzes')
  const [exitingTab, setExitingTab] = useState<Tab | null>(null)
  const [direction, setDirection] = useState<'right' | 'left'>('right')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null)
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [hostingId, setHostingId] = useState<string | null>(null)
  const [hostError, setHostError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string; isPublished: boolean } | null>(null)
  const [confirmDeletePurchase, setConfirmDeletePurchase] = useState<{ purchaseId: string; title: string } | null>(null)
  const [confirmDeleteRental, setConfirmDeleteRental] = useState<{ rentalId: string; title: string } | null>(null)
  const [upgradeModal, setUpgradeModal] = useState<string | null>(null)
  const [publishingQuiz, setPublishingQuiz] = useState<Pick<Quiz, 'id' | 'title' | 'category' | 'language'> | null>(null)
  const [missingPublishFields, setMissingPublishFields] = useState<string[]>([])
  const [updateModal, setUpdateModal] = useState<{ listingId: string; title: string } | null>(
    (location.state as { openUpdateModal?: { listingId: string; title: string } } | null)?.openUpdateModal ?? null
  )

  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const user = useAuthStore((s) => s.user)
  const isFreePlan = user?.plan === 'FREE'

  useLayoutEffect(() => {
    const idx = TAB_ORDER.indexOf(activeTab)
    const el = tabRefs.current[idx]
    if (el) setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth })
  }, [activeTab])

  function handleTabChange(newTab: Tab) {
    if (newTab === activeTab) return
    if (animationTimer.current) clearTimeout(animationTimer.current)
    const oldIdx = TAB_ORDER.indexOf(activeTab)
    const newIdx = TAB_ORDER.indexOf(newTab)
    setDirection(newIdx > oldIdx ? 'right' : 'left')
    setExitingTab(activeTab)
    setActiveTab(newTab)
    animationTimer.current = setTimeout(() => setExitingTab(null), 280)
  }

  function handleRejoin(sessionId: string, code: string, status: 'ACTIVE' | 'WAITING', themeColor?: string | null) {
    if (status === 'ACTIVE') localStorage.setItem('quizify_active_host_session', sessionId)
    navigate(`/host/${sessionId}`, { state: { code, rejoin: true, status, themeColor: themeColor ?? null } })
  }

  async function handleCreate() {
    if (isFreePlan && (quizzes?.length ?? 0) >= 1) {
      setUpgradeModal(t('plan.upgrade_quiz_limit'))
      return
    }
    const quiz = await createQuiz.mutateAsync({ title: 'Untitled quiz' })
    navigate(`/quiz/${quiz.id}`)
  }

  function handleThemeChange(value: string) {
    if (isFreePlan && PRO_ONLY_THEMES.includes(value as typeof PRO_ONLY_THEMES[number])) {
      setUpgradeModal(t('plan.upgrade_theme'))
      return
    }
    setTheme(value as Parameters<typeof setTheme>[0])
  }

  async function handleHost(quizId: string, themeColor?: string | null, listingId?: string) {
    setHostingId(quizId)
    setHostError(null)
    try {
      const body: Record<string, string> = { quizId }
      if (listingId) body.listingId = listingId
      const res = await api.post<{ sessionId: string; code: string }>('/sessions', body)
      navigate(`/host/${res.data.sessionId}`, { state: { code: res.data.code, themeColor: themeColor ?? null } })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setHostError(msg ?? 'Failed to start session')
    } finally {
      setHostingId(null)
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'quizzes',   label: t('dashboard.tab_my_quizzes') },
    { key: 'purchased', label: t('dashboard.tab_purchased') },
    { key: 'rentals',   label: t('dashboard.tab_rentals') },
    { key: 'earnings',  label: t('dashboard.tab_earnings') },
  ]

  function renderTab(tab: Tab) {
    if (tab === 'quizzes') return (
      <>
        {quizzesLoading && <p className="text-gray-400 dark:text-gray-500 text-sm">{t('common.loading')}</p>}

        {!quizzesLoading && quizzes?.length === 0 && (
          <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-2xl">📝</div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.no_quizzes')}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('dashboard.no_quizzes_hint')}</p>
            <button onClick={handleCreate} disabled={createQuiz.isPending} className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              {t('dashboard.new_quiz')}
            </button>
          </div>
        )}

        {quizzes && quizzes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => {
              const listing = quiz.listings?.[0]
              const isPublished = listing?.status === 'PUBLISHED'
              return (
                <div key={quiz.id} className="flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-sm transition-shadow hover:shadow-md">
                  <div className="h-1 w-full bg-indigo-600" />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <h2 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">{quiz.title}</h2>
                          {isPublished && listing?.versionAtPublish != null && (
                            <span className="shrink-0 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                              v{listing.versionAtPublish}
                            </span>
                          )}
                        </div>
                        {quiz.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{quiz.description}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {t('dashboard.question_count', { count: quiz._count?.questions ?? 0 })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!isPublished && (
                          <button
                            onClick={() => {
                              const missing: string[] = []
                              if (!quiz.title?.trim())       missing.push(t('quiz_editor.title_label'))
                              if (!quiz.description?.trim()) missing.push(t('quiz_editor.description_label'))
                              if (!quiz.category)            missing.push(t('quiz_editor.ai_panel_category'))
                              if (!quiz.language)            missing.push(t('quiz_editor.ai_panel_language'))
                              if (!quiz.difficulty)          missing.push(t('quiz_editor.ai_panel_difficulty'))
                              if ((quiz._count?.questions ?? 0) < 5) missing.push(t('quiz_editor.publish_min_questions', { defaultValue: 'At least 5 questions' }))
                              if (missing.length > 0) { setMissingPublishFields(missing); return }
                              setPublishingQuiz({ id: quiz.id, title: quiz.title, category: quiz.category, language: quiz.language })
                            }}
                            title={t('dashboard.publish')}
                            className="rounded-lg p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                              <path d="M8.75 13.25a.75.75 0 0 1-1.5 0V4.71L5.03 6.93a.75.75 0 0 1-1.06-1.06l3.5-3.5a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 1 1-1.06 1.06L8.75 4.71v8.54Z" />
                              <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/quiz/${quiz.id}`)}
                          title={t('common.edit')}
                          className="rounded-lg p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                            <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474ZM4.75 13.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: quiz.id, title: quiz.title, isPublished })}
                          title={t('common.delete')}
                          className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="mt-auto pt-4">
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                        <button onClick={() => handleHost(quiz.id)} disabled={hostingId === quiz.id} className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                          {hostingId === quiz.id ? t('common.creating') : t('dashboard.host')}
                        </button>
                      </div>
                    </div>

                    {quiz.sessions && quiz.sessions.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('dashboard.past_sessions')}</p>
                        {quiz.sessions.map((s) => (
                          <div key={s.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 font-mono text-xs font-semibold text-gray-600 dark:text-gray-300">{s.code}</span>
                              {s.finishedAt && <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(s.finishedAt).toLocaleDateString()}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Link to={`/results/${s.id}`} state={{ fromTab: 'quizzes' }} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">{t('dashboard.results')}</Link>
                              <button onClick={() => deleteSession.mutate(s.id)} disabled={deleteSession.isPending} className="cursor-pointer text-gray-300 dark:text-gray-600 transition hover:text-red-500 disabled:opacity-40" title={t('common.delete')}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                  <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </>
    )

    if (tab === 'purchased') return (
      <>
        {purchasesLoading && <p className="text-gray-400 dark:text-gray-500 text-sm">{t('common.loading')}</p>}

        {!purchasesLoading && purchases?.length === 0 && (
          <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dashboard.no_purchases')}</p>
            <Link to="/" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">{t('dashboard.browse_marketplace')}</Link>
          </div>
        )}

        {purchases && purchases.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {purchases.map((p) => {
              const hasUpdate = p.listing.status === 'PUBLISHED' && p.listing.versionAtPublish > p.versionAtPurchase
              return (
                <div
                  key={p.purchaseId}
                  className="flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="h-1 w-full bg-indigo-600" />
                  <div className="flex flex-1 flex-col p-5 gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/quiz-preview/${p.listing.id}`} state={{ fromTab: 'purchased' }} className="hover:text-indigo-600 transition-colors flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">{p.listing.quiz.title}</h2>
                      </Link>
                      <div className="flex items-center gap-1 shrink-0">
                        {hasUpdate && (
                          <button
                            onClick={() => setUpdateModal({ listingId: p.listing.id, title: p.listing.quiz.title })}
                            className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                          >
                            {t('dashboard.update_available')}
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDeletePurchase({ purchaseId: p.purchaseId, title: p.listing.quiz.title })}
                          title={t('common.delete')}
                          className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {p.listing.quiz.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{p.listing.quiz.description}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-1.5">
                        {p.listing.creator.avatar ? (
                          <img src={p.listing.creator.avatar} alt={p.listing.creator.name} className="h-4 w-4 rounded-full object-cover" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                            {p.listing.creator.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <span>{p.listing.creator.name}</span>
                      </div>
                      <span>{new Date(p.purchaseDate).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => handleHost(p.listing.quiz.id, p.listing.themeColor, p.listing.id)}
                      disabled={hostingId === p.listing.quiz.id}
                      className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {hostingId === p.listing.quiz.id ? t('common.creating') : t('dashboard.host')}
                    </button>

                    {p.listing.quiz.sessions.length > 0 && (
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('dashboard.past_sessions')}</p>
                        {p.listing.quiz.sessions.map((s) => (
                          <div key={s.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 font-mono text-xs font-semibold text-gray-600 dark:text-gray-300">{s.code}</span>
                              {s.finishedAt && <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(s.finishedAt).toLocaleDateString()}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Link to={`/results/${s.id}`} state={{ fromTab: 'purchased' }} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">{t('dashboard.results')}</Link>
                              <button onClick={() => deleteSession.mutate(s.id)} disabled={deleteSession.isPending} className="cursor-pointer text-gray-300 dark:text-gray-600 transition hover:text-red-500 disabled:opacity-40" title={t('common.delete')}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                  <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </>
    )

    if (tab === 'rentals') return (
      <>
        {rentalsLoading && <p className="text-gray-400 dark:text-gray-500 text-sm">{t('common.loading')}</p>}

        {!rentalsLoading && rentals?.length === 0 && (
          <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dashboard.no_rentals')}</p>
            <Link to="/" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">{t('dashboard.browse_marketplace')}</Link>
          </div>
        )}

        {rentals && rentals.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rentals.map((r) => {
              const remaining = !r.isExpired ? timeRemaining(r.expiresAt) : null
              return (
                <div
                  key={r.rentalId}
                  className={`flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-sm transition-shadow hover:shadow-md ${r.isExpired ? 'opacity-50' : ''}`}
                >
                  <div className={`h-1 w-full ${r.isExpired ? 'bg-gray-300 dark:bg-gray-600' : 'bg-indigo-600'}`} />
                  <div className="flex flex-1 flex-col p-5 gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/quiz-preview/${r.listing.id}`} state={{ fromTab: 'rentals' }} className="hover:text-indigo-600 transition-colors flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">{r.listing.quiz.title}</h2>
                      </Link>
                      <button
                        onClick={() => setConfirmDeleteRental({ rentalId: r.rentalId, title: r.listing.quiz.title })}
                        title={t('common.delete')}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    {r.listing.quiz.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{r.listing.quiz.description}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between text-xs pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                        {r.listing.creator.avatar ? (
                          <img src={r.listing.creator.avatar} alt={r.listing.creator.name} className="h-4 w-4 rounded-full object-cover" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                            {r.listing.creator.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <span>{r.listing.creator.name}</span>
                      </div>
                      {r.isExpired ? (
                        <span className="text-gray-400 dark:text-gray-500">
                          {t('dashboard.rental_expired', { date: new Date(r.expiresAt).toLocaleDateString() })}
                        </span>
                      ) : (
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">
                          {t('dashboard.rental_time_left', { time: remaining })}
                        </span>
                      )}
                    </div>
                    {!r.isExpired && (
                      <button
                        onClick={() => handleHost(r.listing.quiz.id, r.listing.themeColor, r.listing.id)}
                        disabled={hostingId === r.listing.quiz.id}
                        className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {hostingId === r.listing.quiz.id ? t('common.creating') : t('dashboard.host')}
                      </button>
                    )}

                    {r.listing.quiz.sessions.length > 0 && (
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('dashboard.past_sessions')}</p>
                        {r.listing.quiz.sessions.map((s) => (
                          <div key={s.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 font-mono text-xs font-semibold text-gray-600 dark:text-gray-300">{s.code}</span>
                              {s.finishedAt && <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(s.finishedAt).toLocaleDateString()}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Link to={`/results/${s.id}`} state={{ fromTab: 'rentals' }} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">{t('dashboard.results')}</Link>
                              <button onClick={() => deleteSession.mutate(s.id)} disabled={deleteSession.isPending} className="cursor-pointer text-gray-300 dark:text-gray-600 transition hover:text-red-500 disabled:opacity-40" title={t('common.delete')}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                  <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </>
    )

    return (
      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm p-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-2xl">💰</div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.earnings_coming_soon')}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('dashboard.earnings_coming_soon_hint')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-xl font-black text-indigo-600 hover:opacity-80 transition-opacity">
              QuizCraft
            </Link>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="light">{t('host.themes.light')}</option>
              <option value="dark">{t('host.themes.dark')}</option>
              <option value="forest" disabled={isFreePlan}>{t('host.themes.forest')}{isFreePlan ? ` (${t('plan.pro_only')})` : ''}</option>
              <option value="ocean" disabled={isFreePlan}>{t('host.themes.ocean')}{isFreePlan ? ` (${t('plan.pro_only')})` : ''}</option>
              <option value="sunset" disabled={isFreePlan}>{t('host.themes.sunset')}{isFreePlan ? ` (${t('plan.pro_only')})` : ''}</option>
              <option value="peach" disabled={isFreePlan}>{t('host.themes.peach')}{isFreePlan ? ` (${t('plan.pro_only')})` : ''}</option>
              <option value="rose" disabled={isFreePlan}>{t('host.themes.rose')}{isFreePlan ? ` (${t('plan.pro_only')})` : ''}</option>
            </select>
          </div>
          <NavDropdown />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">

        {/* ── Active sessions banner ── */}
        {activeSessions && activeSessions.length > 0 && (
          <div className="mb-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {t('dashboard.active_sessions')}
            </p>
            <div className="space-y-2">
              {activeSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 font-mono text-sm font-bold tracking-widest text-indigo-700 dark:text-indigo-300">
                      {s.code}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{s.quizTitle}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {s.status === 'ACTIVE' ? t('dashboard.in_progress') : t('dashboard.waiting')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleRejoin(s.id, s.code, s.status, s.themeColor)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                      {t('dashboard.rejoin')}
                    </button>
                    <button onClick={() => deleteSession.mutate(s.id)} disabled={deleteSession.isPending} className="text-sm text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab bar ── */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex border-b border-gray-200 dark:border-gray-700 w-full">
            <div className="relative flex gap-1 flex-1">
              {indicatorStyle && (
                <div
                  className="absolute bottom-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 themed:bg-indigo-900 transition-all duration-200 ease-out pointer-events-none"
                  style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                />
              )}
              {TABS.map((tab, idx) => (
                <button
                  key={tab.key}
                  ref={el => { tabRefs.current[idx] = el }}
                  onClick={() => handleTabChange(tab.key)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-indigo-600 dark:text-indigo-400 themed:text-indigo-900'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 themed:text-white/60 themed:hover:text-white/90'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab === 'quizzes' && (
              <button
                onClick={handleCreate}
                disabled={createQuiz.isPending}
                className="mb-1 rounded-xl bg-indigo-600 themed:bg-indigo-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {createQuiz.isPending ? t('common.creating') : t('dashboard.new_quiz')}
              </button>
            )}
          </div>
        </div>

        {hostError && (
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {hostError}
          </div>
        )}

        {/* ── Tab content with directional slide animation ── */}
        <div className="relative overflow-hidden">
          {exitingTab && (
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{
                animation: `${direction === 'right' ? 'tab-slide-out-left' : 'tab-slide-out-right'} 250ms ease-out forwards`
              }}
            >
              {renderTab(exitingTab)}
            </div>
          )}
          <div
            key={activeTab}
            style={exitingTab ? {
              animation: `${direction === 'right' ? 'tab-slide-in-right' : 'tab-slide-in-left'} 250ms ease-out forwards`
            } : undefined}
          >
            {renderTab(activeTab)}
          </div>
        </div>
      </main>

      {/* ── Modals ── */}

      {upgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('plan.upgrade_title')}</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{upgradeModal}</p>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setUpgradeModal(null)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
                {t('plan.got_it')}
              </button>
            </div>
          </div>
        </div>
      )}

      {missingPublishFields.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('quiz_editor.publish_missing_title', { defaultValue: 'Complete before publishing' })}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('quiz_editor.publish_missing_body', { defaultValue: 'Please fill in the following before publishing:' })}</p>
            <ul className="mt-3 space-y-1.5">
              {missingPublishFields.map((field) => (
                <li key={field} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                  {field}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setMissingPublishFields([])}
              className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              {t('common.ok', { defaultValue: 'OK' })}
            </button>
          </div>
        </div>
      )}

      {publishingQuiz && (
        <PublishModal
          quizId={publishingQuiz.id}
          quizTitle={publishingQuiz.title}
          category={publishingQuiz.category}
          language={publishingQuiz.language}
          onClose={() => setPublishingQuiz(null)}
          onSuccess={() => setPublishingQuiz(null)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.delete_quiz_title')}</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {confirmDelete.isPublished
                ? t('dashboard.delete_published_quiz_body', { defaultValue: 'This will permanently remove your quiz from the marketplace and dashboard. This cannot be undone.' })
                : t('dashboard.delete_quiz_body', { title: confirmDelete.title })}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={deleteQuiz.isPending} className="rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteQuiz.mutate(confirmDelete.id, { onSettled: () => setConfirmDelete(null) })}
                disabled={deleteQuiz.isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleteQuiz.isPending ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeletePurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.delete_purchase_title')}</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('dashboard.delete_purchase_body', { title: confirmDeletePurchase.title })}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDeletePurchase(null)} disabled={deletePurchase.isPending} className="rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deletePurchase.mutate(confirmDeletePurchase.purchaseId, { onSettled: () => setConfirmDeletePurchase(null) })}
                disabled={deletePurchase.isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deletePurchase.isPending ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.delete_rental_title')}</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('dashboard.delete_rental_body', { title: confirmDeleteRental.title })}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteRental(null)} disabled={deleteRental.isPending} className="rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteRental.mutate(confirmDeleteRental.rentalId, { onSettled: () => setConfirmDeleteRental(null) })}
                disabled={deleteRental.isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleteRental.isPending ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {updateModal && (
        <UpdateModal
          listingId={updateModal.listingId}
          title={updateModal.title}
          onClose={() => setUpdateModal(null)}
        />
      )}
    </div>
  )
}
