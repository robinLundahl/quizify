import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
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

interface Question {
  id: string
  text: string
  type: string
  imageUrl: string | null
  timeLimit: number
  points: number
  answerOptions: AnswerOption[]
  mapQuestion: { lat: number; lng: number } | null
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

interface CorrectAnswer {
  type: string
  optionId?: string
  optionText?: string
  lat?: number
  lng?: number
}

type Phase = 'enter' | 'lobby' | 'question' | 'answered' | 'reveal' | 'finished'

const OPTION_COLORS = [
  { bg: 'bg-red-500 active:bg-red-700', border: 'border-red-600' },
  { bg: 'bg-blue-500 active:bg-blue-700', border: 'border-blue-600' },
  { bg: 'bg-yellow-500 active:bg-yellow-700', border: 'border-yellow-600' },
  { bg: 'bg-green-500 active:bg-green-700', border: 'border-green-600' },
]

function MapPinPicker({
  onPin,
}: {
  onPin: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      onPin(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function JoinView() {
  const [searchParams] = useSearchParams()
  const socket = getSocket()

  const [phase, setPhase] = useState<Phase>('enter')
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [quizTitle, setQuizTitle] = useState('')
  const [participantId, setParticipantId] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [mapPin, setMapPin] = useState<[number, number] | null>(null)
  const [openText, setOpenText] = useState('')
  const [pointsEarned, setPointsEarned] = useState<number | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState<CorrectAnswer | null>(null)
  const [leaderboard, setLeaderboard] = useState<Player[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [myScore, setMyScore] = useState(0)

  const participantIdRef = useRef('')
  const sessionIdRef = useRef('')

  useEffect(() => {
    socket.on('player:joined', (data: { sessionId: string; participantId: string; quizTitle: string }) => {
      setParticipantId(data.participantId)
      setQuizTitle(data.quizTitle)
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
      setPointsEarned(null)
      setPhase('question')
      const remaining = Math.max(0, Math.round((payload.endsAt - Date.now()) / 1000))
      setTimeLeft(remaining)
    })

    socket.on('player:answer_received', ({ pointsEarned: pts }: { pointsEarned: number }) => {
      setPointsEarned(pts)
      setMyScore((s) => s + pts)
      setPhase('answered')
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
      setLeaderboard(lb)
      setPhase('finished')
    })

    return () => {
      socket.off('player:joined')
      socket.off('error')
      socket.off('session:started')
      socket.off('session:question')
      socket.off('player:answer_received')
      socket.off('session:question_ended')
      socket.off('session:finished')
    }
  }, [socket])

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

  const handleMapPin = useCallback(
    (lat: number, lng: number) => {
      setMapPin([lat, lng])
    },
    []
  )

  const submitMapAnswer = useCallback(() => {
    if (!mapPin) return
    submitAnswer(`${mapPin[0]},${mapPin[1]}`)
  }, [mapPin, submitAnswer])

  // ── Enter code + nickname ──────────────────────────────────────────────────
  if (phase === 'enter') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-indigo-600 px-4">
        <h1 className="mb-8 text-4xl font-black text-white">Join a Quiz</h1>
        <form onSubmit={handleJoin} className="w-full max-w-sm space-y-4">
          <input
            type="text"
            placeholder="Game code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-full rounded-xl bg-white px-5 py-4 text-center text-2xl font-black uppercase tracking-widest text-gray-800 shadow-lg outline-none"
          />
          <input
            type="text"
            placeholder="Your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="w-full rounded-xl bg-white px-5 py-4 text-center text-lg font-semibold text-gray-800 shadow-lg outline-none"
          />
          {error && <p className="text-center text-sm font-medium text-red-200">{error}</p>}
          <button
            type="submit"
            disabled={!code.trim() || !nickname.trim()}
            className="w-full rounded-xl bg-white py-4 text-lg font-bold text-indigo-600 shadow-lg transition hover:bg-indigo-50 disabled:opacity-40"
          >
            Join
          </button>
        </form>
      </div>
    )
  }

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-indigo-600 px-4 text-white">
        <div className="mb-4 rounded-full bg-white/20 px-5 py-2 text-sm font-medium">{quizTitle}</div>
        <h2 className="mb-2 text-3xl font-black">{nickname}</h2>
        <p className="text-lg opacity-70">Waiting for the host to start…</p>
        <div className="mt-8 h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      </div>
    )
  }

  // ── Finished ──────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const myRank = leaderboard.findIndex((p) => p.id === participantId) + 1
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-indigo-600 px-4 text-white">
        <h1 className="mb-2 text-4xl font-black">Game Over!</h1>
        {myRank > 0 && (
          <p className="mb-6 text-xl opacity-80">
            You finished #{myRank} with {myScore.toLocaleString()} pts
          </p>
        )}
        <div className="w-full max-w-sm space-y-2">
          {leaderboard.slice(0, 10).map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-xl px-5 py-3 font-semibold ${
                p.id === participantId ? 'bg-white text-indigo-700' : 'bg-white/20'
              }`}
            >
              <span>
                {i + 1}. {p.nickname}
              </span>
              <span>{p.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Reveal ────────────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    const myRank = leaderboard.findIndex((p) => p.id === participantId) + 1
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 text-white">
        <div
          className={`mb-4 rounded-full px-6 py-2 text-lg font-bold ${
            pointsEarned && pointsEarned > 0 ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {pointsEarned !== null && pointsEarned > 0
            ? `+${pointsEarned.toLocaleString()} pts`
            : 'No points'}
        </div>
        {correctAnswer?.optionText && (
          <p className="mb-2 text-center text-lg text-gray-300">
            Correct: <span className="font-bold text-green-400">{correctAnswer.optionText}</span>
          </p>
        )}
        {correctAnswer?.type === 'OPEN_ENDED' && (
          <p className="mb-2 text-center text-gray-300">Open-ended — full points awarded.</p>
        )}
        {correctAnswer?.type === 'MAP' && (
          <p className="mb-2 text-center text-gray-300">Scored by proximity to the target.</p>
        )}
        <p className="mt-4 text-gray-400">
          Rank: <span className="font-bold text-white">#{myRank}</span> · Total:{' '}
          <span className="font-bold text-white">{myScore.toLocaleString()} pts</span>
        </p>
        <p className="mt-6 text-sm text-gray-500">Waiting for next question…</p>
      </div>
    )
  }

  // ── Answered (waiting for question to end) ────────────────────────────────
  if (phase === 'answered') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 text-white">
        <div className="mb-4 rounded-full bg-indigo-500 px-6 py-2 text-lg font-bold">
          Answer submitted!
        </div>
        <p className="text-gray-400">Waiting for other players…</p>
        <div className="mt-8 h-10 w-10 animate-spin rounded-full border-4 border-indigo-300/30 border-t-indigo-400" />
      </div>
    )
  }

  // ── Question ──────────────────────────────────────────────────────────────
  if (currentQuestion) {
    const { question, index, total } = currentQuestion

    return (
      <div className="flex min-h-screen flex-col bg-gray-900 text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-400">
            {index + 1} / {total}
          </span>
          <span
            className={`text-2xl font-black tabular-nums ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}
          >
            {timeLeft}s
          </span>
          <span className="text-sm text-gray-400">{myScore.toLocaleString()} pts</span>
        </div>

        {/* Question */}
        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt=""
            className="mx-4 max-h-40 rounded-xl object-cover"
          />
        )}
        <h2 className="px-4 py-4 text-center text-xl font-bold leading-snug">{question.text}</h2>

        {/* Answer interface */}
        <div className="flex-1 px-4 pb-6">
          {(question.type === 'MULTIPLE_CHOICE' || question.type === 'IMAGE') && (
            <div className="grid grid-cols-2 gap-3">
              {question.answerOptions.map((opt, i) => (
                <button
                  key={opt.id}
                  onClick={() => submitAnswer(opt.id)}
                  disabled={!!selectedAnswer}
                  className={`${OPTION_COLORS[i % 4].bg} flex min-h-[5rem] items-center justify-center rounded-xl p-3 text-center text-sm font-semibold text-white shadow-lg transition disabled:opacity-60 ${
                    selectedAnswer === opt.id ? 'ring-4 ring-white' : ''
                  }`}
                >
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
                  className={`${OPTION_COLORS[i % 2].bg} flex min-h-[5rem] items-center justify-center rounded-xl p-3 text-center text-2xl font-bold text-white shadow-lg transition disabled:opacity-60 ${
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
                className="w-full rounded-xl border border-gray-600 bg-gray-800 p-4 text-white placeholder-gray-500 outline-none focus:border-indigo-400 disabled:opacity-60"
              />
              <button
                onClick={() => submitAnswer(openText)}
                disabled={!openText.trim() || !!selectedAnswer}
                className="w-full rounded-xl bg-indigo-500 py-4 font-bold text-white transition hover:bg-indigo-600 disabled:opacity-40"
              >
                Submit
              </button>
            </div>
          )}

          {question.type === 'MAP' && (
            <div className="flex flex-col gap-3">
              <p className="text-center text-sm text-gray-400">Tap the map to place your pin</p>
              <div className="h-72 w-full overflow-hidden rounded-xl">
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
                className="w-full rounded-xl bg-indigo-500 py-4 font-bold text-white transition hover:bg-indigo-600 disabled:opacity-40"
              >
                {mapPin ? 'Submit Pin' : 'Tap to place pin first'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
