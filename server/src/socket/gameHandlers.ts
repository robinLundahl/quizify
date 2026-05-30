import type { Server, Socket } from 'socket.io'
import { prisma } from '../lib/prisma.js'
import { getVersionedSnapshot, parseCustomSnapshot } from '../lib/snapshotUtils.js'

interface QuestionData {
  id: string
  text: string
  type: string
  imageUrl: string | null
  songName: string | null
  artistName: string | null
  timeLimit: number
  useTimer: boolean
  points: number
  answerOptions: { id: string; text: string; isCorrect: boolean }[]
  mapQuestion: {
    lat: number
    lng: number
    rings: { radiusKm: number; points: number; order: number }[]
  } | null
  audioQuestion: { url: string; platform: string; embedUrl: string } | null
  rankingItems: { id: string; label: string; correctPosition: number }[]
  correctAnswers: string[]
}

interface SessionState {
  questions: QuestionData[]
  currentIndex: number
  questionStartedAt: number
  questionEnded: boolean
  questionEndTimer?: ReturnType<typeof setTimeout>
  answeredParticipants: Set<string>
  theme: string
  hostId: string
}

const sessions = new Map<string, SessionState>()
const sessionThemes = new Map<string, string>()
const sessionHosts = new Map<string, string>() // sessionId → userId (lobby phase)

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
  const timeFraction = question.useTimer
    ? Math.max(0, 1 - responseTimeMs / (question.timeLimit * 1000))
    : 0
  const timeMultiplier = 1.0 + 0.5 * timeFraction

  if (question.type === 'OPEN_ENDED' || question.type === 'AUDIO') {
    if (!question.correctAnswers.length) return question.points
    const lower = answer.trim().toLowerCase()
    const match = question.correctAnswers.some((a) => lower.includes(a.trim().toLowerCase()))
    return match ? Math.round(question.points * timeMultiplier) : 0
  }

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
  const endsAt = q.useTimer ? state.questionStartedAt + q.timeLimit * 1000 : 0

  if (q.useTimer) {
    state.questionEndTimer = setTimeout(() => {
      void endQuestion(io, sessionId, state)
    }, q.timeLimit * 1000)
  }

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
      useTimer: q.useTimer,
      points: q.points,
      answerOptions: q.answerOptions.map(({ id, text }) => ({ id, text })),
      mapQuestion: q.mapQuestion ? { lat: q.mapQuestion.lat, lng: q.mapQuestion.lng } : null,
      audioQuestion: q.audioQuestion ?? null,
      rankingItems: shuffledRankingItems,
    },
    index: state.currentIndex,
    total: state.questions.length,
    endsAt,
  })
}

function computeCorrectAnswer(q: QuestionData): unknown {
  if (q.type === 'MAP') {
    return {
      type: 'MAP',
      lat: q.mapQuestion?.lat,
      lng: q.mapQuestion?.lng,
      rings: q.mapQuestion?.rings,
    }
  } else if (q.type === 'OPEN_ENDED' || q.type === 'AUDIO') {
    return {
      type: q.type,
      optionText: q.correctAnswers.length ? q.correctAnswers.join(' / ') : null,
    }
  } else if (q.type === 'RANKING') {
    return {
      type: 'RANKING',
      items: [...q.rankingItems].sort((a, b) => a.correctPosition - b.correctPosition),
    }
  } else {
    const correct = q.answerOptions.find((o) => o.isCorrect)
    return { type: q.type, optionId: correct?.id, optionText: correct?.text }
  }
}

async function endQuestion(io: Server, sessionId: string, state: SessionState) {
  if (state.questionEnded) return
  state.questionEnded = true

  if (state.questionEndTimer) {
    clearTimeout(state.questionEndTimer)
    state.questionEndTimer = undefined
  }

  const q = state.questions[state.currentIndex]
  const correctAnswer = computeCorrectAnswer(q)

  const participants = await prisma.participant.findMany({
    where: { sessionId },
    orderBy: { score: 'desc' },
    select: { id: true, nickname: true, score: true },
  })

  const nextIndex = state.currentIndex + 1
  const nextQuestion =
    nextIndex < state.questions.length ? buildQuestionPayload(state.questions[nextIndex]) : null

  io.to(sessionId).emit('session:question_ended', { correctAnswer, scores: participants, nextQuestion })
}

function buildQuestionPayload(q: QuestionData) {
  return {
    id: q.id,
    text: q.text,
    type: q.type,
    imageUrl: q.imageUrl,
    songName: q.songName,
    artistName: q.artistName,
    timeLimit: q.timeLimit,
    useTimer: q.useTimer,
    points: q.points,
    answerOptions: q.answerOptions.map(({ id, text }) => ({ id, text })),
    mapQuestion: q.mapQuestion ? { lat: q.mapQuestion.lat, lng: q.mapQuestion.lng } : null,
    audioQuestion: q.audioQuestion ?? null,
    rankingItems: q.rankingItems.length ? q.rankingItems.map(({ id, label }) => ({ id, label })) : null,
  }
}

export function registerGameHandlers(io: Server, socket: Socket) {
  // Host joins an already-created session room (lobby phase)
  socket.on('host:join', async (data: { sessionId: string; theme?: string }) => {
    const session = await prisma.gameSession.findUnique({
      where: { id: data.sessionId },
    })
    if (!session || session.status !== 'WAITING') return
    if (socket.data.userId == null || session.hostId !== socket.data.userId) return
    const theme = data.theme ?? 'forest'
    sessionThemes.set(data.sessionId, theme)
    sessionHosts.set(data.sessionId, socket.data.userId)
    socket.join(data.sessionId)
    io.to(data.sessionId).emit('session:theme', { theme })
    const participants = await prisma.participant.findMany({
      where: { sessionId: data.sessionId },
      select: { nickname: true },
    })
    socket.emit('host:joined', { participants: participants.map((p) => p.nickname) })
  })

  // Host updates theme mid-session
  socket.on('host:set_theme', (data: { sessionId: string; theme: string }) => {
    const { sessionId, theme } = data
    const ownerId = sessions.get(sessionId)?.hostId ?? sessionHosts.get(sessionId)
    if (socket.data.userId == null || socket.data.userId !== ownerId) return
    const state = sessions.get(sessionId)
    if (state) state.theme = theme
    sessionThemes.set(sessionId, theme)
    io.to(sessionId).emit('session:theme', { theme })
  })

  // Host reconnects after a page refresh during an active session
  socket.on('host:rejoin', async (data: { sessionId: string; theme?: string }) => {
    const { sessionId } = data

    const session = await prisma.gameSession.findUnique({ where: { id: sessionId } })
    if (!session || session.status !== 'ACTIVE') {
      socket.emit('host:rejoin_failed', { reason: 'session_not_active' })
      return
    }
    if (socket.data.userId == null || session.hostId !== socket.data.userId) {
      socket.emit('host:rejoin_failed', { reason: 'unauthorized' })
      return
    }

    const state = sessions.get(sessionId)
    if (!state) {
      socket.emit('host:rejoin_failed', { reason: 'server_restarted' })
      return
    }

    if (data.theme) state.theme = data.theme
    socket.join(sessionId)
    io.to(sessionId).emit('session:theme', { theme: state.theme })

    const q = state.questions[state.currentIndex]
    const questionPayload = buildQuestionPayload(q)

    if (!state.questionEnded) {
      const endsAt = q.useTimer ? state.questionStartedAt + q.timeLimit * 1000 : 0
      socket.emit('host:rejoin_success', {
        phase: 'question',
        question: questionPayload,
        index: state.currentIndex,
        total: state.questions.length,
        endsAt,
        answeredCount: state.answeredParticipants.size,
      })
    } else {
      const correctAnswer = computeCorrectAnswer(q)
      const scores = await prisma.participant.findMany({
        where: { sessionId },
        orderBy: { score: 'desc' },
        select: { id: true, nickname: true, score: true },
      })
      const nextIdx = state.currentIndex + 1
      const nextQ =
        nextIdx < state.questions.length ? buildQuestionPayload(state.questions[nextIdx]) : null
      socket.emit('host:rejoin_success', {
        phase: 'reveal',
        question: questionPayload,
        index: state.currentIndex,
        total: state.questions.length,
        endsAt: 0,
        answeredCount: state.answeredParticipants.size,
        correctAnswer,
        scores,
        nextQuestion: nextQ,
      })
    }
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
                audioQuestion: true,
                rankingItems: { orderBy: { correctPosition: 'asc' } },
              },
            },
          },
        },
      },
    })

    if (!session || session.status !== 'WAITING') return
    if (socket.data.userId == null || session.hostId !== socket.data.userId) return
    if (session.quiz.questions.length === 0) return

    // For buyer-hosted sessions, load questions from the versioned snapshot so the host
    // plays the content they purchased, not the live quiz that may have been edited since.
    let questions: QuestionData[] = session.quiz.questions as QuestionData[]
    if (session.listingId) {
      const purchase = await prisma.quizPurchase.findFirst({
        where: { buyerId: session.hostId, listingId: session.listingId },
        select: { versionAtPurchase: true, customSnapshot: true, listing: { select: { contentSnapshot: true } } },
      })
      if (purchase) {
        const snapshot =
          parseCustomSnapshot(purchase.customSnapshot) ??
          getVersionedSnapshot(purchase.listing.contentSnapshot, purchase.versionAtPurchase)
        if (snapshot && snapshot.questions.length > 0) {
          questions = snapshot.questions as unknown as QuestionData[]
        }
      }
    }

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: 'ACTIVE' },
    })

    const state: SessionState = {
      questions,
      currentIndex: 0,
      questionStartedAt: 0,
      questionEnded: false,
      answeredParticipants: new Set(),
      theme: sessionThemes.get(sessionId) ?? 'forest',
      hostId: session.hostId,
    }
    sessions.set(sessionId, state)
    sessionThemes.delete(sessionId)
    sessionHosts.delete(sessionId)

    socket.join(sessionId)
    io.to(sessionId).emit('session:started')
    await broadcastQuestion(io, sessionId, state)
  })

  // Host advances to next question
  socket.on('host:next', async (data: { sessionId: string }) => {
    const { sessionId } = data
    const state = sessions.get(sessionId)
    if (!state) return
    if (socket.data.userId == null || socket.data.userId !== state.hostId) return

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
      sessionThemes.delete(sessionId)
    } else {
      await broadcastQuestion(io, sessionId, state)
    }
  })

  // Player reconnects after a page reload during an active session
  socket.on('player:reconnect', async (data: { sessionId: string; participantId: string }) => {
    const { sessionId, participantId } = data

    const [session, participant] = await Promise.all([
      prisma.gameSession.findUnique({ where: { id: sessionId }, include: { host: { select: { name: true, avatar: true } } } }),
      prisma.participant.findUnique({ where: { id: participantId } }),
    ])

    if (!session || session.status !== 'ACTIVE') {
      socket.emit('player:reconnect_failed', { reason: 'session_not_active' })
      return
    }
    if (!participant || participant.sessionId !== sessionId) {
      socket.emit('player:reconnect_failed', { reason: 'participant_not_found' })
      return
    }

    const state = sessions.get(sessionId)
    if (!state) {
      socket.emit('player:reconnect_failed', { reason: 'server_restarted' })
      return
    }

    socket.join(sessionId)
    socket.data.participantId = participantId
    socket.data.sessionId = sessionId

    const q = state.questions[state.currentIndex]
    const alreadyAnswered = state.answeredParticipants.has(participantId)

    if (!state.questionEnded) {
      const endsAt = q.useTimer ? state.questionStartedAt + q.timeLimit * 1000 : 0
      socket.emit('player:reconnect_success', {
        phase: alreadyAnswered ? 'answered' : 'question',
        question: buildQuestionPayload(q),
        index: state.currentIndex,
        total: state.questions.length,
        endsAt,
        score: participant.score,
        nickname: participant.nickname,
        theme: state.theme,
        hostName: session.host.name,
        hostAvatar: session.host.avatar ?? null,
      })
    } else {
      const correctAnswer = computeCorrectAnswer(q)
      const [scores, myAnswer] = await Promise.all([
        prisma.participant.findMany({
          where: { sessionId },
          orderBy: { score: 'desc' },
          select: { id: true, nickname: true, score: true },
        }),
        prisma.gameAnswer.findFirst({
          where: { participantId, questionId: q.id },
          select: { pointsEarned: true },
        }),
      ])
      socket.emit('player:reconnect_success', {
        phase: 'reveal',
        question: buildQuestionPayload(q),
        index: state.currentIndex,
        total: state.questions.length,
        endsAt: 0,
        score: participant.score,
        nickname: participant.nickname,
        correctAnswer,
        scores,
        pointsEarned: myAnswer?.pointsEarned ?? null,
        theme: state.theme,
        hostName: session.host.name,
        hostAvatar: session.host.avatar ?? null,
      })
    }
  })

  // Player joins a session lobby
  socket.on('player:join', async (data: { code: string; nickname: string }) => {
    const { code, nickname } = data
    if (!code || !nickname) return

    const session = await prisma.gameSession.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        quiz: { select: { title: true } },
        host: { select: { name: true, avatar: true } },
      },
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
      hostName: session.host.name,
      hostAvatar: session.host.avatar ?? null,
      theme: sessionThemes.get(session.id) ?? 'forest',
    })

    const count = await prisma.participant.count({ where: { sessionId: session.id } })
    io.to(session.id).emit('session:player_joined', { nickname, count })
  })

  // Host manually stops an untimed question (reveals answer without advancing)
  socket.on('host:stop_question', async (data: { sessionId: string }) => {
    const state = sessions.get(data.sessionId)
    if (!state) return
    if (socket.data.userId == null || socket.data.userId !== state.hostId) return
    await endQuestion(io, data.sessionId, state)
  })

  // Player submits an answer
  socket.on(
    'player:answer',
    async (data: {
      sessionId: string
      questionId: string
      answer: string
    }) => {
      const { sessionId, questionId, answer } = data
      const participantId = socket.data.participantId
      if (!participantId) return
      const state = sessions.get(sessionId)
      if (!state || state.questionEnded) return
      if (state.answeredParticipants.has(participantId)) return

      const q = state.questions[state.currentIndex]
      if (!q || q.id !== questionId) return

      state.answeredParticipants.add(participantId)

      const responseTimeMs = q.useTimer
        ? Math.min(Date.now() - state.questionStartedAt, q.timeLimit * 1000)
        : Date.now() - state.questionStartedAt
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
