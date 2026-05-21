import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getSocket } from '../hooks/useSocket'
import { applyTheme } from '../lib/theme'
import { useThemeStore } from '../store/themeStore'
import LangToggle from '../components/ui/LangToggle'

// Fix default leaflet icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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

interface Player {
  id: string
  nickname: string
  score: number
}

type Phase = 'enter' | 'lobby' | 'question' | 'answered' | 'reveal' | 'finished'

const PLAYER_SESSION_KEY = 'quizify_player_session'
const PLAYER_PARTICIPANT_KEY = 'quizify_player_participant'

const OPTION_GLASS = 'bg-indigo-500/20 border border-white/20 hover:bg-indigo-500/35 active:bg-indigo-500/45'

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

function MapPinPicker({ onPin }: { onPin: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPin(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function SortableRankingItem({
  item,
  index,
  total,
  disabled,
  onMove,
}: {
  item: RankingItem
  index: number
  total: number
  disabled: boolean
  onMove: (i: number, dir: -1 | 1) => void
}) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2 rounded-2xl bg-gray-100 dark:bg-white/10 px-3 py-3"
    >
      <button
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="cursor-grab touch-none p-1 text-gray-400 active:cursor-grabbing disabled:cursor-default"
        aria-label={t('join.drag_to_reorder')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
        </svg>
      </button>
      <span className="w-5 shrink-0 text-center text-xs font-bold text-gray-400">{index + 1}</span>
      <span className="flex-1 text-sm font-medium text-gray-800 dark:text-white">{item.label}</span>
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => onMove(index, -1)}
          disabled={disabled || index === 0}
          className="rounded px-1 text-gray-400 hover:text-white disabled:opacity-20"
          aria-label={t('join.move_up')}
        >
          ▲
        </button>
        <button
          onClick={() => onMove(index, 1)}
          disabled={disabled || index === total - 1}
          className="rounded px-1 text-gray-400 hover:text-white disabled:opacity-20"
          aria-label={t('join.move_down')}
        >
          ▼
        </button>
      </div>
    </div>
  )
}

export default function JoinView() {
  const [searchParams] = useSearchParams()
  const socket = getSocket()
  const { t } = useTranslation()

  const [phase, setPhase] = useState<Phase>('enter')
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [errorKey, setErrorKey] = useState('')
  const [hostName, setHostName] = useState('')
  const [hostAvatar, setHostAvatar] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [mapPin, setMapPin] = useState<[number, number] | null>(null)
  const [openText, setOpenText] = useState('')
  const [rankingOrder, setRankingOrder] = useState<RankingItem[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [savedSession, setSavedSession] = useState<{ sessionId: string; participantId: string } | null>(() => {
    const sessionId = localStorage.getItem(PLAYER_SESSION_KEY)
    const participantId = localStorage.getItem(PLAYER_PARTICIPANT_KEY)
    return sessionId && participantId ? { sessionId, participantId } : null
  })

  const participantIdRef = useRef('')
  const sessionIdRef = useRef('')

  const rankingSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  )

  const handleRankingDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setRankingOrder((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      return arrayMove(items, oldIndex, newIndex)
    })
  }, [])

  const moveRankingItem = useCallback((index: number, dir: -1 | 1) => {
    const j = index + dir
    setRankingOrder((items) => {
      if (j < 0 || j >= items.length) return items
      const next = [...items]
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }, [])

  useEffect(() => {
    socket.on('player:joined', (data: { sessionId: string; participantId: string; quizTitle: string; hostName: string; hostAvatar: string | null; theme?: string }) => {
      applyTheme(data.theme ?? 'forest')
      localStorage.setItem(PLAYER_SESSION_KEY, data.sessionId)
      localStorage.setItem(PLAYER_PARTICIPANT_KEY, data.participantId)
      setHostName(data.hostName)
      setHostAvatar(data.hostAvatar)
      setPhase('lobby')
      sessionIdRef.current = data.sessionId
      participantIdRef.current = data.participantId
    })

    socket.on('session:theme', ({ theme }: { theme: string }) => {
      applyTheme(theme)
    })

    socket.on('error', (data: { message: string }) => {
      setError(data.message)
    })

    socket.on('session:started', () => {
      setPhase('question')
    })

    socket.on('session:question', (payload: QuestionPayload) => {
      setCurrentQuestion(payload)
      setSelectedAnswer('')
      setMapPin(null)
      setOpenText('')

      setRankingOrder(payload.question.rankingItems ?? [])
      setPhase('question')
      const remaining = Math.max(0, Math.round((payload.endsAt - Date.now()) / 1000))
      setTimeLeft(remaining)
    })

    socket.on('player:answer_received', () => {
      setPhase('answered')
    })

    socket.on('session:question_ended', () => {
      setPhase('reveal')
    })

    socket.on('session:finished', () => {
      localStorage.removeItem(PLAYER_SESSION_KEY)
      localStorage.removeItem(PLAYER_PARTICIPANT_KEY)
    })

    socket.on(
      'player:reconnect_success',
      (payload: {
        phase: 'question' | 'answered' | 'reveal'
        question: Question
        index: number
        total: number
        endsAt: number
        score: number
        nickname: string
        scores?: Player[]
        theme?: string
      }) => {
        applyTheme(payload.theme ?? 'forest')
        const savedSessionId = localStorage.getItem(PLAYER_SESSION_KEY) ?? ''
        const savedParticipantId = localStorage.getItem(PLAYER_PARTICIPANT_KEY) ?? ''
        sessionIdRef.current = savedSessionId
        participantIdRef.current = savedParticipantId
        setNickname(payload.nickname)
        setCurrentQuestion({
          question: payload.question,
          index: payload.index,
          total: payload.total,
          endsAt: payload.endsAt,
        })
        if (payload.phase === 'question') {
          setSelectedAnswer('')
          setMapPin(null)
          setOpenText('')
    
          setRankingOrder(payload.question.rankingItems ?? [])
          setTimeLeft(Math.max(0, Math.round((payload.endsAt - Date.now()) / 1000)))
          setPhase('question')
        } else if (payload.phase === 'answered') {
          setPhase('answered')
        } else {
          setPhase('reveal')
        }
      }
    )

    socket.on('player:reconnect_failed', () => {
      localStorage.removeItem(PLAYER_SESSION_KEY)
      localStorage.removeItem(PLAYER_PARTICIPANT_KEY)
      setSavedSession(null)
      setErrorKey('join.reconnect_failed')
    })

    return () => {
      socket.off('player:joined')
      socket.off('error')
      socket.off('session:started')
      socket.off('session:question')
      socket.off('player:answer_received')
      socket.off('session:question_ended')
      socket.off('session:finished')
      socket.off('player:reconnect_success')
      socket.off('player:reconnect_failed')
      socket.off('session:theme')
      applyTheme(useThemeStore.getState().theme)
    }
  }, [socket])

  // Countdown timer
  useEffect(() => {
    if (phase !== 'question' || timeLeft <= 0) return
    const timer = setTimeout(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(timer)
  }, [phase, timeLeft])

  const handleJoin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setErrorKey('')
      if (!code.trim() || !nickname.trim()) return
      socket.emit('player:join', { code: code.trim().toUpperCase(), nickname: nickname.trim() })
    },
    [socket, code, nickname]
  )

  const handleRejoin = useCallback(() => {
    if (!savedSession) return
    socket.emit('player:reconnect', savedSession)
  }, [socket, savedSession])

  const submitAnswer = useCallback(
    (answer: string) => {
      if (!currentQuestion || phase !== 'question') return
      setSelectedAnswer(answer)
      socket.emit('player:answer', {
        sessionId: sessionIdRef.current,
        participantId: participantIdRef.current,
        questionId: currentQuestion.question.id,
        answer,
      })
    },
    [socket, currentQuestion, phase]
  )

  const handleMapPin = useCallback((lat: number, lng: number) => {
    setMapPin([lat, lng])
  }, [])

  const submitMapAnswer = useCallback(() => {
    if (!mapPin) return
    submitAnswer(`${mapPin[0]},${mapPin[1]}`)
  }, [mapPin, submitAnswer])

  const submitRankingAnswer = useCallback(() => {
    if (!rankingOrder.length) return
    submitAnswer(JSON.stringify(rankingOrder.map((i) => i.id)))
  }, [rankingOrder, submitAnswer])

  const langToggle = (
    <div className="fixed top-3 right-3 z-50">
      <LangToggle />
    </div>
  )

  // ── Enter ──────────────────────────────────────────────────────────────────
  if (phase === 'enter') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {langToggle}
        <h1 className="mb-6 text-4xl font-black text-gray-900 dark:text-white">Quizify</h1>
        <div className="w-full max-w-sm rounded-2xl border border-gray-200/70 dark:border-white/20 bg-white/80 dark:bg-white/10 p-6 backdrop-blur-sm">
          {savedSession && (
            <div className="mb-5 rounded-xl bg-gray-50 dark:bg-white/15 p-4 text-gray-900 dark:text-white">
              <p className="mb-1 font-semibold">{t('join.active_session_title')}</p>
              <p className="mb-3 text-sm opacity-70">{t('join.active_session_body')}</p>
              <button
                onClick={handleRejoin}
                className="w-full rounded-xl bg-white py-3 font-bold text-indigo-600 transition hover:bg-indigo-50"
              >
                {t('join.rejoin_game')}
              </button>
            </div>
          )}
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              placeholder={t('join.game_code')}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full rounded-xl bg-white px-5 py-4 text-center text-2xl font-black uppercase tracking-widest text-gray-800 outline-none focus:ring-2 focus:ring-white/50"
            />
            <input
              type="text"
              placeholder={t('join.your_nickname')}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              className="w-full rounded-xl bg-white px-5 py-4 text-center text-lg font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-white/50"
            />
            {(error || errorKey) && <p className="text-center text-sm font-medium text-red-600 dark:text-red-200">{errorKey ? t(errorKey) : error}</p>}
            <button
              type="submit"
              disabled={!code.trim() || !nickname.trim()}
              className="w-full rounded-xl bg-white py-4 text-lg font-bold text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-40"
            >
              {t('join.join')}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-gray-900 dark:text-white">
        {langToggle}
        {hostAvatar ? (
          <img src={hostAvatar} alt={hostName} className="mb-3 h-20 w-20 rounded-full object-cover ring-4 ring-black/10 dark:ring-white/30" />
        ) : (
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-black/10 dark:bg-white/20 text-2xl font-bold ring-4 ring-black/10 dark:ring-white/30">
            {hostName.charAt(0).toUpperCase()}
          </div>
        )}
        {hostName && (
          <p className="mb-5 text-sm text-gray-600 dark:text-white/75">{t('join.hosted_by', { hostName })}</p>
        )}
        <h2 className="mb-1 text-3xl font-black">{t('join.good_luck', { nickname })}</h2>
        <p className="text-base text-gray-500 dark:text-white/60">{t('join.waiting_for_host')}</p>
        <div className="mt-8 h-10 w-10 animate-spin rounded-full border-4 border-black/10 dark:border-white/20 border-t-gray-800 dark:border-t-white" />
      </div>
    )
  }


  // ── Reveal ────────────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    const isFinalRound = currentQuestion !== null && currentQuestion.index + 1 === currentQuestion.total
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-gray-900 dark:text-white">
        {langToggle}
        {hostAvatar ? (
          <img
            src={hostAvatar}
            alt={hostName}
            className={`mb-5 h-20 w-20 rounded-full object-cover ring-4 ring-black/10 dark:ring-white/20 ${!isFinalRound ? 'animate-pulse' : ''}`}
          />
        ) : (
          <div className={`mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-black/10 dark:bg-white/20 text-2xl font-bold ring-4 ring-black/10 dark:ring-white/20 ${!isFinalRound ? 'animate-pulse' : ''}`}>
            {hostName.charAt(0).toUpperCase()}
          </div>
        )}
        {isFinalRound ? (
          <>
            <p className="text-lg font-bold">{t('join.thank_you')}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('join.host_will_present')}</p>
          </>
        ) : (
          <p className="text-base font-medium text-gray-500 dark:text-gray-400">{t('join.waiting_next_question')}</p>
        )}
      </div>
    )
  }

  // ── Answered ──────────────────────────────────────────────────────────────
  if (phase === 'answered') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-gray-900 dark:text-white">
        {langToggle}
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20 text-3xl ring-4 ring-indigo-500/30">
          ✓
        </div>
        <p className="text-lg font-bold">{t('join.answer_submitted')}</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('join.waiting_players')}</p>
        <div className="mt-8 h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-400" />
      </div>
    )
  }

  // ── Question ──────────────────────────────────────────────────────────────
  if (currentQuestion) {
    const { question, index, total } = currentQuestion

    return (
      <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-gray-900 dark:text-white">
        {/* Header pill */}
        <div className="mx-4 mt-3 flex items-center justify-between rounded-xl bg-black/5 dark:bg-white/5 px-4 py-2.5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {index + 1} / {total}
          </span>
          <LangToggle />
          {question.useTimer ? (
            <span
              className={`text-2xl font-black tabular-nums transition-colors ${timeLeft <= 5 ? 'animate-pulse text-red-400' : 'text-white'}`}
            >
              {timeLeft}s
            </span>
          ) : (
            <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{t('join.no_timer')}</span>
          )}
        </div>

        {/* Question content */}
        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt=""
            className="mx-4 mt-4 max-h-40 rounded-2xl object-contain"
          />
        )}
        <h2 className="px-4 py-4 text-center text-xl font-bold leading-snug">{question.text}</h2>

        {/* Answers */}
        <div className="flex-1 px-4 pb-6">
          {(question.type === 'MULTIPLE_CHOICE' || question.type === 'IMAGE') && (
            <div className="grid grid-cols-2 gap-3">
              {question.answerOptions.map((opt, i) => (
                <button
                  key={opt.id}
                  onClick={() => submitAnswer(opt.id)}
                  disabled={!!selectedAnswer}
                  className={`${OPTION_GLASS} flex min-h-[5rem] items-center rounded-2xl p-3 text-left text-sm font-semibold text-white shadow-lg backdrop-blur-md transition disabled:opacity-60 ${
                    selectedAnswer === opt.id ? 'bg-white/20 ring-4 ring-white' : ''
                  }`}
                >
                  <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/20 text-xs font-bold">
                    {OPTION_LETTERS[i % 4]}
                  </span>
                  {opt.text}
                </button>
              ))}
            </div>
          )}

          {question.type === 'TRUE_FALSE' && (
            <div className="grid grid-cols-2 gap-3">
              {question.answerOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => submitAnswer(opt.id)}
                  disabled={!!selectedAnswer}
                  className={`${OPTION_GLASS} flex min-h-[5rem] items-center justify-center rounded-2xl p-3 text-center text-2xl font-bold text-white shadow-lg backdrop-blur-md transition disabled:opacity-60 ${
                    selectedAnswer === opt.id ? 'bg-white/20 ring-4 ring-white' : ''
                  }`}
                >
                  {opt.text === 'True' ? t('common.true') : opt.text === 'False' ? t('common.false') : opt.text}
                </button>
              ))}
            </div>
          )}

          {question.type === 'AUDIO' && (
            <div className="flex flex-col gap-3">
              <textarea
                value={openText}
                onChange={(e) => setOpenText(e.target.value)}
                disabled={!!selectedAnswer}
                placeholder={t('join.type_answer')}
                rows={3}
                className="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/8 p-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-60"
              />
              <button
                onClick={() => submitAnswer(openText)}
                disabled={!openText.trim() || !!selectedAnswer}
                className="w-full rounded-2xl bg-indigo-500 py-4 font-bold text-white transition hover:bg-indigo-600 disabled:opacity-40"
              >
                {t('join.submit')}
              </button>
            </div>
          )}

          {question.type === 'OPEN_ENDED' && (
            <div className="flex flex-col gap-3">
              <textarea
                value={openText}
                onChange={(e) => setOpenText(e.target.value)}
                disabled={!!selectedAnswer}
                placeholder={t('join.type_answer')}
                rows={3}
                className="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/8 p-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-60"
              />
              <button
                onClick={() => submitAnswer(openText)}
                disabled={!openText.trim() || !!selectedAnswer}
                className="w-full rounded-2xl bg-indigo-500 py-4 font-bold text-white transition hover:bg-indigo-600 disabled:opacity-40"
              >
                {t('join.submit')}
              </button>
            </div>
          )}

          {question.type === 'MAP' && (
            <div className="flex flex-col gap-3">
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">{t('join.tap_map')}</p>
              <div className="h-72 w-full overflow-hidden rounded-2xl">
                <MapContainer
                  center={
                    question.mapQuestion
                      ? [question.mapQuestion.lat, question.mapQuestion.lng]
                      : [20, 0]
                  }
                  zoom={question.mapQuestion ? 5 : 2}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapPinPicker onPin={handleMapPin} />
                  {mapPin && <Marker position={mapPin} />}
                </MapContainer>
              </div>
              <button
                onClick={submitMapAnswer}
                disabled={!mapPin || !!selectedAnswer}
                className="w-full rounded-2xl bg-indigo-500 py-4 font-bold text-white transition hover:bg-indigo-600 disabled:opacity-40"
              >
                {mapPin ? t('join.submit_pin') : t('join.tap_to_place')}
              </button>
            </div>
          )}

          {question.type === 'RANKING' && rankingOrder.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">{t('join.drag_order')}</p>
              <DndContext
                sensors={rankingSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleRankingDragEnd}
              >
                <SortableContext items={rankingOrder.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {rankingOrder.map((item, i) => (
                      <SortableRankingItem
                        key={item.id}
                        item={item}
                        index={i}
                        total={rankingOrder.length}
                        disabled={!!selectedAnswer}
                        onMove={moveRankingItem}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <button
                onClick={submitRankingAnswer}
                disabled={!!selectedAnswer}
                className="w-full rounded-2xl bg-indigo-500 py-4 font-bold text-white transition hover:bg-indigo-600 disabled:opacity-40"
              >
                {t('join.submit_order')}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
