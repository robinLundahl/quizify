import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getSocket } from '../hooks/useSocket'

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

const OPTION_COLORS = [
  'bg-red-500 hover:bg-red-600',
  'bg-blue-500 hover:bg-blue-600',
  'bg-yellow-500 hover:bg-yellow-600',
  'bg-green-500 hover:bg-green-600',
]

export default function HostView() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const socket = getSocket()

  const [phase, setPhase] = useState<Phase>('lobby')
  const joinCode = (location.state as { code?: string } | null)?.code ?? ''
  const [players, setPlayers] = useState<Player[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState<CorrectAnswer | null>(null)
  const [leaderboard, setLeaderboard] = useState<Player[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [answerCount, setAnswerCount] = useState(0)
  const [rejoinError, setRejoinError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    if (localStorage.getItem(STORAGE_KEY) === sessionId) {
      socket.emit('host:rejoin', { sessionId })
    } else {
      socket.emit('host:join', { sessionId })
    }

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
      setPhase('question')
      const remaining = Math.max(0, Math.round((payload.endsAt - Date.now()) / 1000))
      setTimeLeft(remaining)
    })

    socket.on(
      'session:question_ended',
      ({ correctAnswer: ca, scores }: { correctAnswer: CorrectAnswer; scores: Player[] }) => {
        setCorrectAnswer(ca)
        setLeaderboard(scores)
        setPhase('reveal')
      }
    )

    socket.on('session:finished', ({ leaderboard: lb }: { leaderboard: Player[] }) => {
      localStorage.removeItem(STORAGE_KEY)
      setLeaderboard(lb)
      setPhase('finished')
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
          setTimeLeft(Math.max(0, Math.round((payload.endsAt - Date.now()) / 1000)))
          setPhase('question')
        } else {
          setCorrectAnswer(payload.correctAnswer ?? null)
          setLeaderboard(payload.scores ?? [])
          setPhase('reveal')
        }
      }
    )

    socket.on('host:rejoin_failed', ({ reason }: { reason: string }) => {
      setRejoinError(reason)
    })

    return () => {
      socket.off('session:player_joined')
      socket.off('session:started')
      socket.off('session:question')
      socket.off('session:question_ended')
      socket.off('session:finished')
      socket.off('host:rejoin_success')
      socket.off('host:rejoin_failed')
    }
  }, [sessionId, socket])

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

  if (rejoinError) {
    const message =
      rejoinError === 'server_restarted'
        ? 'The server was restarted and the session state was lost.'
        : 'This session is no longer active.'
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-6 text-white">
        <h1 className="mb-4 text-2xl font-black text-red-400">Could not rejoin session</h1>
        <p className="mb-8 max-w-sm text-center text-gray-300">{message}</p>
        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY)
            navigate('/dashboard')
          }}
          className="rounded-xl bg-indigo-500 px-8 py-3 text-lg font-bold hover:bg-indigo-600"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (phase === 'lobby') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-indigo-600 p-6 text-white">
        <h1 className="mb-2 text-4xl font-black tracking-tight">Game Code</h1>
        <div className="mb-8 rounded-2xl bg-white px-10 py-6 text-6xl font-black tracking-widest text-indigo-600 shadow-xl">
          {joinCode || '------'}
        </div>
        <p className="mb-8 text-lg opacity-80">
          Players joined: <span className="font-bold">{players.length}</span>
        </p>
        {players.length > 0 && (
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {players.map((p) => (
              <span key={p.id} className="rounded-full bg-white/20 px-4 py-1 text-sm font-medium">
                {p.nickname}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={handleStart}
          disabled={players.length === 0}
          className="rounded-xl bg-white px-8 py-3 text-lg font-bold text-indigo-600 shadow-lg transition hover:bg-indigo-50 disabled:opacity-40"
        >
          Start Game
        </button>
        <p className="mt-4 text-sm opacity-60">
          Go to <span className="font-semibold">quizify.app/join</span> to join
        </p>
      </div>
    )
  }

  if (phase === 'finished') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-indigo-600 p-6 text-white">
        <h1 className="mb-8 text-4xl font-black">Final Leaderboard</h1>
        <div className="w-full max-w-md space-y-3">
          {leaderboard.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-xl px-6 py-4 font-semibold text-white shadow ${
                i === 0 ? 'bg-yellow-400 text-gray-900' : i === 1 ? 'bg-gray-300 text-gray-900' : i === 2 ? 'bg-amber-600' : 'bg-white/20'
              }`}
            >
              <span>
                {i + 1}. {p.nickname}
              </span>
              <span>{p.score.toLocaleString()} pts</span>
            </div>
          ))}
        </div>
        <div className="mt-10 flex gap-3">
          <button
            onClick={() => navigate(`/results/${sessionId}`)}
            className="rounded-xl bg-white px-8 py-3 text-lg font-bold text-indigo-600 shadow-lg transition hover:bg-indigo-50"
          >
            View Results
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-xl bg-white/20 px-8 py-3 text-lg font-bold text-white transition hover:bg-white/30"
          >
            Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'reveal' && currentQuestion) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-gray-900 p-6 text-white">
        <div className="w-full max-w-2xl">
          <p className="mb-2 text-center text-sm font-medium uppercase tracking-widest text-gray-400">
            Question {currentQuestion.index + 1} / {currentQuestion.total} — Results
          </p>
          <h2 className="mb-6 text-center text-2xl font-bold">{currentQuestion.question.text}</h2>

          {correctAnswer?.type === 'OPEN_ENDED' && (
            <div className="mb-6 rounded-xl bg-yellow-500/20 p-4 text-center text-yellow-300">
              Open-ended — all participants received full points.
            </div>
          )}
          {correctAnswer?.optionText && (
            <div className="mb-6 rounded-xl bg-green-500/20 p-4 text-center text-lg font-semibold text-green-400">
              Correct: {correctAnswer.optionText}
            </div>
          )}
          {correctAnswer?.type === 'MAP' && (
            <div className="mb-6 rounded-xl bg-blue-500/20 p-4 text-center text-blue-300">
              Map answer revealed — scored by distance rings.
            </div>
          )}
          {correctAnswer?.type === 'RANKING' && correctAnswer.items && (
            <div className="mb-6 rounded-xl bg-purple-500/20 p-4">
              <p className="mb-3 text-center text-sm font-semibold text-purple-300">Correct order</p>
              <ol className="space-y-1.5">
                {correctAnswer.items.map((item, i) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-2">
                    <span className="w-5 shrink-0 text-center text-sm font-bold text-purple-300">{i + 1}</span>
                    <span className="text-sm text-white">{item.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <h3 className="mb-3 text-lg font-semibold">Leaderboard</h3>
          <div className="mb-8 space-y-2">
            {leaderboard.slice(0, 10).map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-2"
              >
                <span className="font-medium">
                  {i + 1}. {p.nickname}
                </span>
                <span className="text-indigo-300">{p.score.toLocaleString()} pts</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-full rounded-xl bg-indigo-500 py-4 text-lg font-bold hover:bg-indigo-600"
          >
            {currentQuestion.index + 1 < currentQuestion.total ? 'Next Question →' : 'Show Final Results'}
          </button>
        </div>
      </div>
    )
  }

  // Question phase
  if (currentQuestion) {
    const { question, index, total } = currentQuestion
    return (
      <div className="flex min-h-screen flex-col items-center bg-gray-900 p-6 text-white">
        <div className="w-full max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Question {index + 1} / {total}
            </span>
            <span
              className={`text-2xl font-black tabular-nums ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}
            >
              {timeLeft}s
            </span>
            <span className="text-sm text-gray-400">
              {answerCount} answered
            </span>
          </div>

          {question.imageUrl && (
            <img
              src={question.imageUrl}
              alt=""
              className="mb-4 max-h-48 w-full rounded-xl object-cover"
            />
          )}

          <h2 className="mb-6 text-center text-2xl font-bold leading-snug">{question.text}</h2>

          {(question.type === 'MULTIPLE_CHOICE' || question.type === 'IMAGE') && (
            <div className="grid grid-cols-2 gap-3">
              {question.answerOptions.map((opt, i) => (
                <div
                  key={opt.id}
                  className={`${OPTION_COLORS[i % 4]} flex items-center justify-center rounded-xl p-4 text-center font-semibold`}
                >
                  {opt.text}
                </div>
              ))}
            </div>
          )}

          {question.type === 'TRUE_FALSE' && (
            <div className="grid grid-cols-2 gap-3">
              {['True', 'False'].map((label, i) => (
                <div
                  key={label}
                  className={`${OPTION_COLORS[i]} flex items-center justify-center rounded-xl p-4 text-center text-xl font-bold`}
                >
                  {label}
                </div>
              ))}
            </div>
          )}

          {question.type === 'OPEN_ENDED' && (
            <div className="rounded-xl bg-white/10 p-6 text-center text-gray-300">
              Open-ended — players type their answer
            </div>
          )}

          {question.type === 'MAP' && (
            <div className="rounded-xl bg-white/10 p-6 text-center text-gray-300">
              Map question — players pin a location
            </div>
          )}

          {question.type === 'RANKING' && (
            <div className="rounded-xl bg-white/10 p-4 text-gray-300">
              <p className="mb-3 text-center text-sm">Ranking question — players drag items into order</p>
              {question.rankingItems && (
                <ol className="space-y-2">
                  {question.rankingItems.map((item, i) => (
                    <li key={item.id} className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-2">
                      <span className="w-5 shrink-0 text-center text-sm font-bold text-gray-400">{i + 1}</span>
                      <span className="text-sm">{item.label}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
