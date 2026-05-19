import type { Server, Socket } from 'socket.io'
import { prisma } from '../lib/prisma.js'

interface QuestionData {
  id: string
  text: string
  type: string
  imageUrl: string | null
  timeLimit: number
  points: number
  answerOptions: { id: string; text: string; isCorrect: boolean }[]
  mapQuestion: {
    lat: number
    lng: number
    rings: { radiusKm: number; points: number; order: number }[]
  } | null
  rankingItems: { id: string; label: string; correctPosition: number }[]
}

interface SessionState {
  questions: QuestionData[]
  currentIndex: number
  questionStartedAt: number
  questionEnded: boolean
  questionEndTimer?: ReturnType<typeof setTimeout>
  answeredParticipants: Set<string>
}

const sessions = new Map<string, SessionState>()

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function scoreAnswer(question: QuestionData, answer: string, responseTimeMs: number): number {
  const timeFraction = Math.max(0, 1 - responseTimeMs / (question.timeLimit * 1000))
  const timeMultiplier = 1.0 + 0.5 * timeFraction

  if (question.type === 'OPEN_ENDED') return question.points

  if (question.type === 'RANKING') {
    const items = question.rankingItems
    if (!items.length) return 0
    let answeredIds: string[]
    try {
      answeredIds = JSON.parse(answer) as string[]
    } catch {
      return 0
    }
    const pointsPerItem = question.points / items.length
    let correct = 0
    for (const item of items) {
      if (answeredIds.indexOf(item.id) + 1 === item.correctPosition) correct++
    }
    return Math.round(correct * pointsPerItem * timeMultiplier)
  }

  if (question.type === 'MAP') {
    if (!question.mapQuestion) return 0
    const parts = answer.split(',')
    const lat = parseFloat(parts[0] ?? '')
    const lng = parseFloat(parts[1] ?? '')
    if (isNaN(lat) || isNaN(lng)) return 0
    const dist = haversineKm(question.mapQuestion.lat, question.mapQuestion.lng, lat, lng)
    const sorted = [...question.mapQuestion.rings].sort((a, b) => a.radiusKm - b.radiusKm)
    for (const ring of sorted) {
      if (dist <= ring.radiusKm) return Math.round(ring.points * timeMultiplier)
    }
    return 0
  }

  // MULTIPLE_CHOICE, IMAGE, TRUE_FALSE — answer is the option ID
  const correct = question.answerOptions.find((o) => o.isCorrect)
  if (!correct || answer !== correct.id) return 0
  return Math.round(question.points * timeMultiplier)
}

async function broadcastQuestion(io: Server, sessionId: string, state: SessionState) {
  const q = state.questions[state.currentIndex]
  state.questionStartedAt = Date.now()
  state.questionEnded = false
  const endsAt = state.questionStartedAt + q.timeLimit * 1000

  state.questionEndTimer = setTimeout(() => {
    void endQuestion(io, sessionId, state)
  }, q.timeLimit * 1000)

  const shuffledRankingItems = q.rankingItems.length
    ? [...q.rankingItems].sort(() => Math.random() - 0.5).map(({ id, label }) => ({ id, label }))
    : null

  io.to(sessionId).emit('session:question', {
    question: {
      id: q.id,
      text: q.text,
      type: q.type,
      imageUrl: q.imageUrl,
      timeLimit: q.timeLimit,
      points: q.points,
      answerOptions: q.answerOptions.map(({ id, text }) => ({ id, text })),
      mapQuestion: q.mapQuestion ? { lat: q.mapQuestion.lat, lng: q.mapQuestion.lng } : null,
      rankingItems: shuffledRankingItems,
    },
    index: state.currentIndex,
    total: state.questions.length,
    endsAt,
  })
}

async function endQuestion(io: Server, sessionId: string, state: SessionState) {
  if (state.questionEnded) return
  state.questionEnded = true

  if (state.questionEndTimer) {
    clearTimeout(state.questionEndTimer)
    state.questionEndTimer = undefined
  }

  const q = state.questions[state.currentIndex]

  let correctAnswer: unknown
  if (q.type === 'MAP') {
    correctAnswer = {
      type: 'MAP',
      lat: q.mapQuestion?.lat,
      lng: q.mapQuestion?.lng,
      rings: q.mapQuestion?.rings,
    }
  } else if (q.type === 'OPEN_ENDED') {
    correctAnswer = { type: 'OPEN_ENDED' }
  } else if (q.type === 'RANKING') {
    correctAnswer = {
      type: 'RANKING',
      items: [...q.rankingItems].sort((a, b) => a.correctPosition - b.correctPosition),
    }
  } else {
    const correct = q.answerOptions.find((o) => o.isCorrect)
    correctAnswer = { type: q.type, optionId: correct?.id, optionText: correct?.text }
  }

  const participants = await prisma.participant.findMany({
    where: { sessionId },
    orderBy: { score: 'desc' },
    select: { id: true, nickname: true, score: true },
  })

  io.to(sessionId).emit('session:question_ended', { correctAnswer, scores: participants })
}

export function registerGameHandlers(io: Server, socket: Socket) {
  // Host joins an already-created session room (lobby phase)
  socket.on('host:join', async (data: { sessionId: string }) => {
    const session = await prisma.gameSession.findUnique({
      where: { id: data.sessionId },
    })
    if (!session || session.status !== 'WAITING') return
    socket.join(data.sessionId)
  })

  // Host starts the game
  socket.on('host:start', async (data: { sessionId: string }) => {
    const { sessionId } = data

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                answerOptions: true,
                mapQuestion: { include: { rings: { orderBy: { order: 'asc' } } } },
                rankingItems: { orderBy: { correctPosition: 'asc' } },
              },
            },
          },
        },
      },
    })

    if (!session || session.status !== 'WAITING') return
    if (session.quiz.questions.length === 0) return

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: 'ACTIVE' },
    })

    const state: SessionState = {
      questions: session.quiz.questions as QuestionData[],
      currentIndex: 0,
      questionStartedAt: 0,
      questionEnded: false,
      answeredParticipants: new Set(),
    }
    sessions.set(sessionId, state)

    socket.join(sessionId)
    io.to(sessionId).emit('session:started')
    await broadcastQuestion(io, sessionId, state)
  })

  // Host advances to next question
  socket.on('host:next', async (data: { sessionId: string }) => {
    const { sessionId } = data
    const state = sessions.get(sessionId)
    if (!state) return

    await endQuestion(io, sessionId, state)

    state.currentIndex++
    state.answeredParticipants.clear()

    if (state.currentIndex >= state.questions.length) {
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { status: 'FINISHED', finishedAt: new Date() },
      })
      const leaderboard = await prisma.participant.findMany({
        where: { sessionId },
        orderBy: { score: 'desc' },
        select: { id: true, nickname: true, score: true },
      })
      io.to(sessionId).emit('session:finished', { leaderboard })
      sessions.delete(sessionId)
    } else {
      await broadcastQuestion(io, sessionId, state)
    }
  })

  // Player joins a session lobby
  socket.on('player:join', async (data: { code: string; nickname: string }) => {
    const { code, nickname } = data
    if (!code || !nickname) return

    const session = await prisma.gameSession.findUnique({
      where: { code: code.toUpperCase() },
      include: { quiz: { select: { title: true } } },
    })

    if (!session) {
      socket.emit('error', { message: 'Session not found' })
      return
    }
    if (session.status !== 'WAITING') {
      socket.emit('error', { message: 'Game has already started' })
      return
    }

    const participant = await prisma.participant.create({
      data: { sessionId: session.id, nickname, score: 0 },
    })

    socket.join(session.id)
    socket.data.participantId = participant.id
    socket.data.sessionId = session.id

    socket.emit('player:joined', {
      sessionId: session.id,
      participantId: participant.id,
      quizTitle: session.quiz.title,
    })

    const count = await prisma.participant.count({ where: { sessionId: session.id } })
    io.to(session.id).emit('session:player_joined', { nickname, count })
  })

  // Player submits an answer
  socket.on(
    'player:answer',
    async (data: {
      sessionId: string
      participantId: string
      questionId: string
      answer: string
    }) => {
      const { sessionId, participantId, questionId, answer } = data
      const state = sessions.get(sessionId)
      if (!state || state.questionEnded) return
      if (state.answeredParticipants.has(participantId)) return

      const q = state.questions[state.currentIndex]
      if (!q || q.id !== questionId) return

      state.answeredParticipants.add(participantId)

      const responseTimeMs = Math.min(Date.now() - state.questionStartedAt, q.timeLimit * 1000)
      const earned = scoreAnswer(q, answer, responseTimeMs)

      await prisma.$transaction([
        prisma.gameAnswer.create({
          data: { participantId, questionId, answer, pointsEarned: earned, responseTimeMs },
        }),
        prisma.participant.update({
          where: { id: participantId },
          data: { score: { increment: earned } },
        }),
      ])

      socket.emit('player:answer_received', { pointsEarned: earned })
    }
  )
}
