import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  points: number
  answerOptions: AnswerOption[]
  mapQuestion: { lat: number; lng: number } | null
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

const OPTION_COLORS = [
  'bg-red-400 active:brightness-75',
  'bg-blue-400 active:brightness-75',
  'bg-yellow-400 active:brightness-75',
  'bg-green-400 active:brightness-75',
]

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

const MEDALS = ['🥇', '🥈', '🥉']

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-3"
    >
      <button
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="cursor-grab touch-none p-1 text-gray-400 active:cursor-grabbing disabled:cursor-default"
        aria-label="Drag to reorder"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
        </svg>
      </button>
      <span className="w-5 shrink-0 text-center text-xs font-bold text-gray-400">{index + 1}</span>
      <span className="flex-1 text-sm font-medium text-white">{item.label}</span>
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => onMove(index, -1)}
          disabled={disabled || index === 0}
          className="rounded px-1 text-gray-400 hover:text-white disabled:opacity-20"
          aria-label="Move up"
        >
          ▲
        </button>
        <button
          onClick={() => onMove(index, 1)}
          disabled={disabled || index === total - 1}
          className="rounded px-1 text-gray-400 hover:text-white disabled:opacity-20"
          aria-label="Move down"
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

  const [phase, setPhase] = useState<Phase>('enter')
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [quizTitle, setQuizTitle] = useState('')
  const [hostName, setHostName] = useState('')
  const [hostAvatar, setHostAvatar] = useState<string | null>(null)
  const [participantId, setParticipantId] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [mapPin, setMapPin] = useState<[number, number] | null>(null)
  const [openText, setOpenText] = useState('')
  const [rankingOrder, setRankingOrder] = useState<RankingItem[]>([])
  const [leaderboard, setLeaderboard] = useState<Player[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [myScore, setMyScore] = useState(0)
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
    socket.on('player:joined', (data: { sessionId: string; participantId: string; quizTitle: string; hostName: string; hostAvatar: string | null }) => {
      localStorage.setItem(PLAYER_SESSION_KEY, data.sessionId)
      localStorage.setItem(PLAYER_PARTICIPANT_KEY, data.participantId)
      setParticipantId(data.participantId)
      setQuizTitle(data.quizTitle)
      setHostName(data.hostName)
      setHostAvatar(data.hostAvatar)
      setPhase('lobby')
      sessionIdRef.current = data.sessionId
      participantIdRef.current = data.participantId
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

    socket.on('player:answer_received', ({ pointsEarned: pts }: { pointsEarned: number }) => {
      setMyScore((s) => s + pts)
      setPhase('answered')
    })

    socket.on(
      'session:question_ended',
      ({ scores }: { correctAnswer: unknown; scores: Player[] }) => {
        setLeaderboard(scores)
        setPhase('reveal')
      }
    )

    socket.on('session:finished', ({ leaderboard: lb }: { leaderboard: Player[] }) => {
      localStorage.removeItem(PLAYER_SESSION_KEY)
      localStorage.removeItem(PLAYER_PARTICIPANT_KEY)
      setLeaderboard(lb)
      setPhase('finished')
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
      }) => {
        const savedSessionId = localStorage.getItem(PLAYER_SESSION_KEY) ?? ''
        const savedParticipantId = localStorage.getItem(PLAYER_PARTICIPANT_KEY) ?? ''
        sessionIdRef.current = savedSessionId
        participantIdRef.current = savedParticipantId
        setParticipantId(savedParticipantId)
        setNickname(payload.nickname)
        setMyScore(payload.score)
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
          setLeaderboard(payload.scores ?? [])
          setPhase('reveal')
        }
      }
    )

    socket.on('player:reconnect_failed', () => {
      localStorage.removeItem(PLAYER_SESSION_KEY)
      localStorage.removeItem(PLAYER_PARTICIPANT_KEY)
      setSavedSession(null)
      setError('Could not reconnect — the session may have ended.')
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
    }
  }, [socket])

  // Sync html/body background to the current phase so iOS safe areas match
  useEffect(() => {
    const color =
      phase === 'question' || phase === 'answered' || phase === 'reveal'
        ? '#111827'
        : '#ef3f7f'
    document.documentElement.style.backgroundColor = color
    document.body.style.backgroundColor = color
    return () => {
      document.documentElement.style.backgroundColor = ''
      document.body.style.backgroundColor = ''
    }
  }, [phase])

  // Countdown timer
  useEffect(() => {
    if (phase !== 'question' || timeLeft <= 0) return
    const t = setTimeout(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft])

  const handleJoin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
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

  // ── Enter ──────────────────────────────────────────────────────────────────
  if (phase === 'enter') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-indigo-600 px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <h1 className="mb-6 text-4xl font-black text-white">Quizify</h1>
        <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
          {savedSession && (
            <div className="mb-5 rounded-xl bg-white/15 p-4 text-white">
              <p className="mb-1 font-semibold">Active session found</p>
              <p className="mb-3 text-sm opacity-70">You were in a game that may still be running.</p>
              <button
                onClick={handleRejoin}
                className="w-full rounded-xl bg-white py-3 font-bold text-indigo-600 transition hover:bg-indigo-50"
              >
                Rejoin game
              </button>
            </div>
          )}
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              placeholder="Game code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full rounded-xl bg-white px-5 py-4 text-center text-2xl font-black uppercase tracking-widest text-gray-800 outline-none focus:ring-2 focus:ring-white/50"
            />
            <input
              type="text"
              placeholder="Your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              className="w-full rounded-xl bg-white px-5 py-4 text-center text-lg font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-white/50"
            />
            {error && <p className="text-center text-sm font-medium text-red-200">{error}</p>}
            <button
              type="submit"
              disabled={!code.trim() || !nickname.trim()}
              className="w-full rounded-xl bg-white py-4 text-lg font-bold text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-40"
            >
              Join
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-indigo-600 px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white">
        {hostAvatar ? (
          <img src={hostAvatar} alt={hostName} className="mb-3 h-20 w-20 rounded-full object-cover ring-4 ring-white/30" />
        ) : (
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-2xl font-bold ring-4 ring-white/30">
            {hostName.charAt(0).toUpperCase()}
          </div>
        )}
        {hostName && (
          <p className="mb-5 text-sm opacity-75">Hosted by {hostName}</p>
        )}
        <div className="mb-5 rounded-full border border-white/20 bg-white/15 px-5 py-2 text-sm font-medium backdrop-blur-sm">
          {quizTitle}
        </div>
        <h2 className="mb-1 text-3xl font-black">{nickname}</h2>
        <p className="text-base opacity-60">Waiting for the host to start…</p>
        <div className="mt-8 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    )
  }

  // ── Finished ──────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const myRank = leaderboard.findIndex((p) => p.id === participantId) + 1
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-indigo-600 px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white">
        <h1 className="mb-1 text-4xl font-black">Game Over!</h1>
        {myRank > 0 && (
          <p className="mb-6 text-base opacity-75">
            You finished #{myRank} with {myScore.toLocaleString()} pts
          </p>
        )}
        <div className="w-full max-w-sm space-y-2">
          {leaderboard.slice(0, 10).map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-2xl px-5 py-3 font-semibold ${
                p.id === participantId ? 'bg-white text-indigo-700' : 'bg-white/20'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{MEDALS[i] ?? `${i + 1}.`}</span>
                {p.nickname}
              </span>
              <span className="text-sm opacity-90">{p.score.toLocaleString()} pts</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Reveal ────────────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-900 px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white">
        {hostAvatar ? (
          <img
            src={hostAvatar}
            alt={hostName}
            className="mb-5 h-20 w-20 animate-pulse rounded-full object-cover ring-4 ring-white/20"
          />
        ) : (
          <div className="mb-5 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-white/20 text-2xl font-bold ring-4 ring-white/20">
            {hostName.charAt(0).toUpperCase()}
          </div>
        )}
        <p className="text-base font-medium text-gray-400">Waiting for next question…</p>
      </div>
    )
  }

  // ── Answered ──────────────────────────────────────────────────────────────
  if (phase === 'answered') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-900 px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20 text-3xl ring-4 ring-indigo-500/30">
          ✓
        </div>
        <p className="text-lg font-bold text-white">Answer submitted!</p>
        <p className="mt-1 text-sm text-gray-500">Waiting for other players…</p>
        <div className="mt-8 h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-400" />
      </div>
    )
  }

  // ── Question ──────────────────────────────────────────────────────────────
  if (currentQuestion) {
    const { question, index, total } = currentQuestion

    return (
      <div className="flex min-h-dvh flex-col bg-gray-900 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white">
        {/* Header pill */}
        <div className="mx-4 mt-3 flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5">
          <span className="text-sm text-gray-400">
            {index + 1} / {total}
          </span>
          <span
            className={`text-2xl font-black tabular-nums transition-colors ${timeLeft <= 5 ? 'animate-pulse text-red-400' : 'text-white'}`}
          >
            {timeLeft}s
          </span>
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
                  className={`${OPTION_COLORS[i % 4]} flex min-h-[5rem] items-center rounded-2xl p-3 text-left text-sm font-semibold text-white shadow-lg transition disabled:opacity-60 ${
                    selectedAnswer === opt.id ? 'ring-4 ring-white' : ''
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
              {question.answerOptions.map((opt, i) => (
                <button
                  key={opt.id}
                  onClick={() => submitAnswer(opt.id)}
                  disabled={!!selectedAnswer}
                  className={`${OPTION_COLORS[i % 2]} flex min-h-[5rem] items-center justify-center rounded-2xl p-3 text-center text-2xl font-bold text-white shadow-lg transition disabled:opacity-60 ${
                    selectedAnswer === opt.id ? 'ring-4 ring-white' : ''
                  }`}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          )}

          {question.type === 'OPEN_ENDED' && (
            <div className="flex flex-col gap-3">
              <textarea
                value={openText}
                onChange={(e) => setOpenText(e.target.value)}
                disabled={!!selectedAnswer}
                placeholder="Type your answer…"
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-white/8 p-4 text-white placeholder-gray-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-60"
              />
              <button
                onClick={() => submitAnswer(openText)}
                disabled={!openText.trim() || !!selectedAnswer}
                className="w-full rounded-2xl bg-indigo-500 py-4 font-bold text-white transition hover:bg-indigo-600 disabled:opacity-40"
              >
                Submit
              </button>
            </div>
          )}

          {question.type === 'MAP' && (
            <div className="flex flex-col gap-3">
              <p className="text-center text-sm text-gray-400">Tap the map to place your pin</p>
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
                {mapPin ? 'Submit Pin' : 'Tap to place pin first'}
              </button>
            </div>
          )}

          {question.type === 'RANKING' && rankingOrder.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-center text-sm text-gray-400">Drag or use arrows to put items in the correct order</p>
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
                Submit Order
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
