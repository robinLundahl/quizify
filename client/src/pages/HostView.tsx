import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getSocket } from '../hooks/useSocket'
import { useThemeStore, PRO_ONLY_THEMES } from '../store/themeStore'
import { useAuthStore } from '../store/authStore'
import LangToggle from '../components/ui/LangToggle'
import ReviewModal from '../components/ui/ReviewModal'
import api from '../lib/api'

interface Player {
  id: string
  nickname: string
  score: number
}

interface AnswerOption {
  id: string
  text: string
}

interface RankingItem {
  id: string
  label: string
}

interface Question {
  id: string
  text: string
  type: string
  imageUrl: string | null
  songName: string | null
  artistName: string | null
  timeLimit: number
  useTimer: boolean
  points: number
  answerOptions: AnswerOption[]
  mapQuestion: { lat: number; lng: number } | null
  audioQuestion: { url: string; platform: string; embedUrl: string } | null
  rankingItems: RankingItem[] | null
}

interface QuestionPayload {
  question: Question
  index: number
  total: number
  endsAt: number
}

interface CorrectAnswer {
  type: string
  optionId?: string
  optionText?: string
  lat?: number
  lng?: number
  items?: { id: string; label: string; correctPosition: number }[]
}

type Phase = 'lobby' | 'question' | 'reveal' | 'finished'

const STORAGE_KEY = 'quizify_active_host_session'

const OPTION_GLASS = 'bg-indigo-500/20 border border-white/20 backdrop-blur-md'

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

const RANK_STYLES = [
  'bg-yellow-400/20 text-yellow-700 dark:text-yellow-300',
  'bg-gray-400/20 text-gray-600 dark:text-gray-300',
  'bg-amber-400/20 text-amber-700 dark:text-amber-300',
]

export default function HostView() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const socket = getSocket()
  const { t } = useTranslation()

  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const isFreePlan = useAuthStore((s) => s.user?.plan === 'FREE')
  const [phase, setPhase] = useState<Phase>('lobby')
  const [reviewPrompt, setReviewPrompt] = useState<{ listingId: string; quizTitle: string } | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const locationState = location.state as { code?: string; rejoin?: boolean; status?: string; themeColor?: string | null } | null
  const joinCode = locationState?.code ?? ''
  const [players, setPlayers] = useState<Player[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState<CorrectAnswer | null>(null)
  const [leaderboard, setLeaderboard] = useState<Player[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [answerCount, setAnswerCount] = useState(0)
  const [nextQuestion, setNextQuestion] = useState<Question | null>(null)
  const [rejoinError, setRejoinError] = useState<string | null>(null)

  useEffect(() => {
    if (locationState?.themeColor && isFreePlan) {
      sessionStorage.setItem('purchasedTheme', '1')
      setTheme(locationState.themeColor as Parameters<typeof setTheme>[0])
    }
    return () => {
      if (sessionStorage.getItem('purchasedTheme')) {
        sessionStorage.removeItem('purchasedTheme')
        setTheme('light')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!sessionId) return

    const fromDashboardRejoin = locationState?.rejoin === true && locationState?.status === 'ACTIVE'
    const fromLocalStorage = localStorage.getItem(STORAGE_KEY) === sessionId

    if (fromDashboardRejoin || fromLocalStorage) {
      socket.emit('host:rejoin', { sessionId, theme: useThemeStore.getState().theme })
    } else {
      socket.emit('host:join', { sessionId, theme: useThemeStore.getState().theme })
    }

    socket.on('host:joined', ({ participants }: { participants: string[] }) => {
      setPlayers(participants.map((nickname) => ({ id: nickname, nickname, score: 0 })))
    })

    socket.on('session:player_joined', ({ nickname, count }: { nickname: string; count: number }) => {
      setPlayers((prev) => {
        if (prev.some((p) => p.nickname === nickname)) return prev
        return [...prev, { id: nickname, nickname, score: 0 }]
      })
      void count
    })

    socket.on('session:started', () => {
      localStorage.setItem(STORAGE_KEY, sessionId)
      setPhase('question')
    })

    socket.on('session:question', (payload: QuestionPayload) => {
      setCurrentQuestion(payload)
      setCorrectAnswer(null)
      setAnswerCount(0)
      setNextQuestion(null)
      setPhase('question')
      const remaining = Math.max(0, Math.round((payload.endsAt - Date.now()) / 1000))
      setTimeLeft(remaining)
    })

    socket.on(
      'session:question_ended',
      ({ correctAnswer: ca, scores, nextQuestion: nq }: { correctAnswer: CorrectAnswer; scores: Player[]; nextQuestion: Question | null }) => {
        setCorrectAnswer(ca)
        setLeaderboard(scores)
        setNextQuestion(nq ?? null)
        setPhase('reveal')
      }
    )

    socket.on('session:finished', ({ leaderboard: lb }: { leaderboard: Player[] }) => {
      localStorage.removeItem(STORAGE_KEY)
      setLeaderboard(lb)
      setPhase('finished')
      // Pre-fetch review eligibility so it's ready when the host clicks Dashboard
      api.get<{ prompt: { listingId: string; quizTitle: string } | null }>(`/sessions/${sessionId}/review-prompt`)
        .then(({ data }) => setReviewPrompt(data.prompt))
        .catch(() => {})
    })

    socket.on(
      'host:rejoin_success',
      (payload: {
        phase: 'question' | 'reveal'
        question: Question
        index: number
        total: number
        endsAt: number
        answeredCount: number
        correctAnswer?: CorrectAnswer
        scores?: Player[]
        nextQuestion?: Question | null
      }) => {
        const questionPayload: QuestionPayload = {
          question: payload.question,
          index: payload.index,
          total: payload.total,
          endsAt: payload.endsAt,
        }
        setCurrentQuestion(questionPayload)
        setAnswerCount(payload.answeredCount)
        if (payload.phase === 'question') {
          setCorrectAnswer(null)
          setNextQuestion(null)
          setTimeLeft(Math.max(0, Math.round((payload.endsAt - Date.now()) / 1000)))
          setPhase('question')
        } else {
          setCorrectAnswer(payload.correctAnswer ?? null)
          setLeaderboard(payload.scores ?? [])
          setNextQuestion(payload.nextQuestion ?? null)
          setPhase('reveal')
        }
      }
    )

    socket.on('host:rejoin_failed', ({ reason }: { reason: string }) => {
      setRejoinError(reason)
    })

    return () => {
      socket.off('host:joined')
      socket.off('session:player_joined')
      socket.off('session:started')
      socket.off('session:question')
      socket.off('session:question_ended')
      socket.off('session:finished')
      socket.off('host:rejoin_success')
      socket.off('host:rejoin_failed')
    }
  }, [sessionId, socket])

  // Broadcast theme changes to all players in the session
  useEffect(() => {
    if (!sessionId) return
    socket.emit('host:set_theme', { sessionId, theme })
  }, [theme, sessionId, socket])

  // Countdown timer
  useEffect(() => {
    if (phase !== 'question' || timeLeft <= 0) return
    const t = setTimeout(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft])

  const handleStart = useCallback(() => {
    socket.emit('host:start', { sessionId })
  }, [socket, sessionId])

  const handleNext = useCallback(() => {
    socket.emit('host:next', { sessionId })
  }, [socket, sessionId])

  const handleStop = useCallback(() => {
    socket.emit('host:stop_question', { sessionId })
  }, [socket, sessionId])

  if (rejoinError) {
    const message =
      rejoinError === 'server_restarted'
        ? t('host.server_restarted')
        : t('host.session_inactive')
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <h1 className="mb-4 text-2xl font-black text-red-500 dark:text-red-400">{t('host.rejoin_error_title')}</h1>
        <p className="mb-8 max-w-sm text-center text-gray-600 dark:text-gray-300">{message}</p>
        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY)
            navigate('/dashboard')
          }}
          className="rounded-xl bg-indigo-600 px-8 py-3 text-lg font-bold text-white transition hover:bg-indigo-700"
        >
          {t('host.back_to_dashboard')}
        </button>
      </div>
    )
  }

  const purchasedTheme = isFreePlan ? (locationState?.themeColor ?? null) : null
  const isLockedForFree = (val: string) => isFreePlan && PRO_ONLY_THEMES.includes(val as typeof PRO_ONLY_THEMES[number]) && val !== purchasedTheme

  const themeAndLangControl = (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
      <LangToggle />
      <select
        value={theme}
        onChange={(e) => {
          const val = e.target.value as Parameters<typeof setTheme>[0]
          if (isLockedForFree(val)) return
          setTheme(val)
        }}
        className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 px-2 py-1 text-xs font-medium shadow-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="light">{t('host.themes.light')}</option>
        <option value="dark">{t('host.themes.dark')}</option>
        <option value="forest" disabled={isLockedForFree('forest')}>{t('host.themes.forest')}{isLockedForFree('forest') ? ` (${t('plan.pro_only')})` : ''}</option>
        <option value="ocean" disabled={isLockedForFree('ocean')}>{t('host.themes.ocean')}{isLockedForFree('ocean') ? ` (${t('plan.pro_only')})` : ''}</option>
        <option value="sunset" disabled={isLockedForFree('sunset')}>{t('host.themes.sunset')}{isLockedForFree('sunset') ? ` (${t('plan.pro_only')})` : ''}</option>
        <option value="peach" disabled={isLockedForFree('peach')}>{t('host.themes.peach')}{isLockedForFree('peach') ? ` (${t('plan.pro_only')})` : ''}</option>
        <option value="rose" disabled={isLockedForFree('rose')}>{t('host.themes.rose')}{isLockedForFree('rose') ? ` (${t('plan.pro_only')})` : ''}</option>
      </select>
    </div>
  )

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <><div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <h1 className="mb-2 text-4xl font-black tracking-tight text-gray-900 dark:text-gray-100">{t('host.game_code')}</h1>
        <p className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
          {t('host.join_hint', { url: 'quizcraft.app/join' })}
        </p>
        <div className="mb-8 rounded-2xl border border-gray-200 dark:border-indigo-500/40 bg-white dark:bg-indigo-600/20 px-10 py-6 text-6xl font-black tracking-widest text-indigo-600 dark:text-indigo-300 shadow-lg">
          {joinCode || '------'}
        </div>
        <p className="mb-6 text-lg font-medium text-gray-600 dark:text-gray-300">
          {t('host.players_joined')} <span className="font-bold text-gray-900 dark:text-white">{players.length}</span>
        </p>
        {players.length > 0 && (
          <div className="mb-8 flex flex-wrap justify-center gap-2 max-w-lg">
            {players.map((p) => (
              <span key={p.id} className="rounded-full bg-indigo-50 dark:bg-gray-700 px-4 py-1 text-sm font-medium text-indigo-700 dark:text-gray-200">
                {p.nickname}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={handleStart}
          disabled={players.length === 0}
          className="rounded-xl bg-indigo-600 px-8 py-3 text-lg font-bold text-white shadow-lg transition hover:bg-indigo-700 disabled:opacity-40"
        >
          {t('host.start_game')}
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 rounded-xl border border-gray-300 dark:border-gray-600 px-8 py-3 text-lg font-bold text-gray-600 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {t('nav.dashboard')}
        </button>
      </div>
      {themeAndLangControl}
    </>
    )
  }

  // ── Finished ──────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const medals = ['🥇', '🥈', '🥉']
    return (
      <>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <h1 className="mb-8 text-4xl font-black text-gray-900 dark:text-gray-100">{t('host.final_leaderboard')}</h1>
        <div className="w-full max-w-md space-y-3">
          {leaderboard.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4 font-semibold shadow-sm"
            >
              <span className="flex items-center gap-3 text-gray-800 dark:text-gray-100">
                <span className="text-xl">{medals[i] ?? `${i + 1}.`}</span>
                {p.nickname}
              </span>
              <span className="text-gray-600 dark:text-gray-300">{p.score.toLocaleString()} {t('common.pts')}</span>
            </div>
          ))}
        </div>
        <div className="mt-10 flex gap-3">
          <button
            onClick={() => navigate(`/results/${sessionId}`)}
            className="rounded-xl bg-indigo-600 px-8 py-3 text-lg font-bold text-white shadow-lg transition hover:bg-indigo-700"
          >
            {t('host.view_results')}
          </button>
          <button
            onClick={() => {
              if (reviewPrompt) {
                setShowReviewModal(true)
              } else {
                navigate('/dashboard')
              }
            }}
            className="rounded-xl border border-gray-300 dark:border-gray-600 px-8 py-3 text-lg font-bold text-gray-600 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {t('nav.dashboard')}
          </button>
        </div>
      </div>

      {showReviewModal && reviewPrompt && (
        <ReviewModal
          listingId={reviewPrompt.listingId}
          quizTitle={reviewPrompt.quizTitle}
          onClose={() => navigate('/dashboard')}
        />
      )}

      {themeAndLangControl}
      </>
    )
  }

  // ── Reveal ────────────────────────────────────────────────────────────────
  if (phase === 'reveal' && currentQuestion) {
    return (
      <>
      <div className="flex min-h-screen flex-col items-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="w-full max-w-2xl">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-500">
            {t('host.results_header', { index: currentQuestion.index + 1, total: currentQuestion.total })}
          </p>
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-white">{currentQuestion.question.text}</h2>

          {correctAnswer?.type === 'OPEN_ENDED' && (
            <div className="mb-6 rounded-2xl border border-yellow-200 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/20 p-6 text-center text-yellow-700 dark:text-yellow-300">
              {t('host.open_ended_reveal')}
            </div>
          )}
          {correctAnswer?.optionText && (
            <div className="mb-6 rounded-2xl border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/20 p-6 text-center">
              <div className="mb-2 text-3xl">✓</div>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">{correctAnswer.optionText}</p>
            </div>
          )}
          {correctAnswer?.type === 'MAP' && (
            <div className="mb-6 rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/20 p-6 text-center text-blue-700 dark:text-blue-300">
              {t('host.map_reveal')}
            </div>
          )}
          {correctAnswer?.type === 'RANKING' && correctAnswer.items && (
            <div className="mb-6 rounded-2xl border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/20 p-5">
              <p className="mb-3 text-center text-sm font-semibold text-purple-700 dark:text-purple-300">{t('host.correct_order')}</p>
              <ol className="space-y-1.5">
                {correctAnswer.items.map((item, i) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-xl bg-gray-100 dark:bg-white/10 px-4 py-2.5">
                    <span className="w-5 shrink-0 text-center text-sm font-bold text-purple-600 dark:text-purple-300">{i + 1}</span>
                    <span className="text-sm text-gray-800 dark:text-white">{item.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('host.leaderboard')}</h3>
          <div className="mb-8 space-y-2">
            {leaderboard.slice(0, 10).map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-transparent bg-white dark:bg-white/8 px-4 py-2.5"
              >
                <span className="flex items-center gap-2.5">
                  {i < 3 ? (
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${RANK_STYLES[i]}`}>
                      #{i + 1}
                    </span>
                  ) : (
                    <span className="w-7 text-sm text-gray-500">{i + 1}.</span>
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">{p.nickname}</span>
                </span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-300">{p.score.toLocaleString()} {t('common.pts')}</span>
              </div>
            ))}
          </div>

          {nextQuestion && (
            <div className="mb-6 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">{t('host.up_next')}</p>
              {(nextQuestion.songName || nextQuestion.artistName) && (
                <p className="mb-2 text-sm font-medium text-indigo-600 dark:text-indigo-300">
                  {[nextQuestion.songName, nextQuestion.artistName].filter(Boolean).join(' – ')}
                </p>
              )}
              <p className="mb-3 font-semibold text-gray-900 dark:text-white">{nextQuestion.text}</p>
              {(nextQuestion.type === 'MULTIPLE_CHOICE' || nextQuestion.type === 'IMAGE') && nextQuestion.answerOptions.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {nextQuestion.answerOptions.map((opt, i) => (
                    <div key={opt.id} className="flex items-center gap-2 rounded-xl bg-white/60 dark:bg-white/5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                        {OPTION_LETTERS[i % 4]}
                      </span>
                      {opt.text}
                    </div>
                  ))}
                </div>
              )}
              {nextQuestion.type === 'TRUE_FALSE' && (
                <div className="grid grid-cols-2 gap-2">
                  {[t('common.true'), t('common.false')].map((label) => (
                    <div key={label} className="rounded-xl bg-white/60 dark:bg-white/5 px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleNext}
            className="w-full rounded-2xl bg-indigo-600 py-4 text-lg font-bold text-white hover:bg-indigo-700 transition-colors"
          >
            {currentQuestion.index + 1 < currentQuestion.total ? t('host.next_question') : t('host.show_final_results')}
          </button>
        </div>
      </div>
      {themeAndLangControl}
      </>
    )
  }

  // ── Question ──────────────────────────────────────────────────────────────
  if (currentQuestion) {
    const { question, index, total } = currentQuestion
    return (
      <>
      <div className="flex min-h-screen flex-col items-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="w-full max-w-2xl">
          <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-100 dark:bg-white/5 px-4 py-2.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('host.question_header', { index: index + 1, total })}
            </span>
            {question.useTimer && (
              <span
                className={`text-2xl font-black tabular-nums transition-colors ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-gray-900 dark:text-white'}`}
              >
                {timeLeft}s
              </span>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {answerCount} {t('host.answered')}
            </span>
          </div>

          {question.imageUrl && (
            <img
              src={question.imageUrl}
              alt=""
              className="mb-4 max-h-48 w-full rounded-2xl object-contain"
            />
          )}

          <h2 className="mb-6 text-center text-2xl font-bold leading-snug text-gray-900 dark:text-white">{question.text}</h2>

          {(question.type === 'MULTIPLE_CHOICE' || question.type === 'IMAGE') && (
            <div className="grid grid-cols-2 gap-3">
              {question.answerOptions.map((opt, i) => (
                <div
                  key={opt.id}
                  className={`${OPTION_GLASS} flex min-h-[6rem] items-center rounded-2xl p-4 font-semibold text-white`}
                >
                  <span className="mr-3 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/20 text-sm font-bold">
                    {OPTION_LETTERS[i % 4]}
                  </span>
                  <span>{opt.text}</span>
                </div>
              ))}
            </div>
          )}

          {question.type === 'TRUE_FALSE' && (
            <div className="grid grid-cols-2 gap-3">
              {[t('common.true'), t('common.false')].map((label) => (
                <div
                  key={label}
                  className={`${OPTION_GLASS} flex min-h-[6rem] items-center justify-center rounded-2xl p-4 text-center text-xl font-bold text-white`}
                >
                  {label}
                </div>
              ))}
            </div>
          )}

          {question.type === 'OPEN_ENDED' && (
            <div className="rounded-2xl bg-gray-100 dark:bg-white/10 p-6 text-center text-gray-600 dark:text-gray-300">
              {t('host.open_ended_info')}
            </div>
          )}

          {question.type === 'MAP' && (
            <div className="rounded-2xl bg-gray-100 dark:bg-white/10 p-6 text-center text-gray-600 dark:text-gray-300">
              {t('host.map_info')}
            </div>
          )}

          {question.type === 'AUDIO' && (
            <div className="space-y-3">
              {question.audioQuestion && (
                <iframe
                  src={question.audioQuestion.embedUrl}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700"
                  style={{ height: question.audioQuestion.platform === 'apple' ? 150 : question.audioQuestion.platform === 'youtube' ? 180 : 80 }}
                  title="Audio player"
                />
              )}
              <div className="rounded-2xl bg-gray-100 dark:bg-white/10 p-6 text-center text-gray-600 dark:text-gray-300">
                {t('host.open_ended_info')}
              </div>
            </div>
          )}

          {question.type === 'RANKING' && (
            <div className="rounded-2xl bg-gray-100 dark:bg-white/10 p-4 text-gray-600 dark:text-gray-300">
              <p className="mb-3 text-center text-sm">{t('host.ranking_info')}</p>
              {question.rankingItems && (
                <ol className="space-y-2">
                  {question.rankingItems.map((item, i) => (
                    <li key={item.id} className="flex items-center gap-3 rounded-xl bg-gray-200 dark:bg-white/10 px-4 py-2">
                      <span className="w-5 shrink-0 text-center text-sm font-bold text-gray-500 dark:text-gray-400">{i + 1}</span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">{item.label}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {!question.useTimer && (
            <button
              onClick={handleStop}
              className="mt-6 w-full rounded-2xl bg-indigo-600 py-4 text-lg font-bold text-white hover:bg-indigo-700 transition-colors"
            >
              {t('host.stop_question')}
            </button>
          )}
        </div>
      </div>
      {themeAndLangControl}
      </>
    )
  }

  return null
}
