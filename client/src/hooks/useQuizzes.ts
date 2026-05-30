import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export interface QuizSession {
  id: string
  code: string
  finishedAt: string | null
}

export interface ActiveSession {
  id: string
  code: string
  status: 'ACTIVE' | 'WAITING'
  quizTitle: string
  themeColor?: string | null
}

export interface QuizListing {
  id: string
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'SUSPENDED'
  price: number
  currency: string
  rentalPrice: number | null
  versionAtPublish?: number
}

export interface PurchasedQuiz {
  purchaseId: string
  purchaseDate: string
  versionAtPurchase: number
  listing: {
    id: string
    status: string
    versionAtPublish: number
    themeColor: string | null
    quiz: { id: string; title: string; description: string | null; category: string | null; sessions: QuizSession[] }
    creator: { id: string; name: string; avatar: string | null }
  }
}

export interface RentalItem {
  rentalId: string
  rentedAt: string
  expiresAt: string
  isExpired: boolean
  listing: {
    id: string
    themeColor: string | null
    quiz: { id: string; title: string; description: string | null; category: string | null; sessions: QuizSession[] }
    creator: { id: string; name: string; avatar: string | null }
  }
}

export interface Quiz {
  id: string
  title: string
  description: string | null
  category: string | null
  language: string | null
  difficulty: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
  _count?: { questions: number }
  sessions?: QuizSession[]
  listings?: QuizListing[]
}

export interface AnswerOption {
  id: string
  text: string
  isCorrect: boolean
}

export interface MapRing {
  id: string
  radiusKm: number
  points: number
  order: number
}

export interface MapQuestionData {
  id: string
  lat: number
  lng: number
  rings: MapRing[]
}

export interface RankingItem {
  id: string
  label: string
  correctPosition: number
  order: number
}

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN_ENDED' | 'IMAGE' | 'MAP' | 'RANKING' | 'AUDIO'

export interface AudioQuestionData {
  id: string
  url: string
  platform: string
  embedUrl: string
}

export interface Question {
  id: string
  quizId: string
  type: QuestionType
  text: string
  imageUrl: string | null
  songName: string | null
  artistName: string | null
  order: number
  timeLimit: number
  useTimer: boolean
  points: number
  answerOptions: AnswerOption[]
  mapQuestion: MapQuestionData | null
  audioQuestion: AudioQuestionData | null
  rankingItems: RankingItem[]
  correctAnswers: string[]
}

export interface QuizWithQuestions extends Quiz {
  questions: Question[]
}

export function useQuizzes() {
  return useQuery({
    queryKey: ['quizzes'],
    queryFn: async () => {
      const { data } = await api.get<Quiz[]>('/quiz')
      return data
    },
  })
}

export function useActiveSessions() {
  return useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const { data } = await api.get<ActiveSession[]>('/sessions/active')
      return data
    },
    refetchOnWindowFocus: true,
  })
}

export function useQuiz(id: string) {
  return useQuery({
    queryKey: ['quiz', id],
    queryFn: async () => {
      const { data } = await api.get<QuizWithQuestions>(`/quiz/${id}`)
      return data
    },
  })
}

export function useCreateQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { title: string; description?: string }) => {
      const { data } = await api.post<Quiz>('/quiz', body)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] }),
  })
}

export function useUpdateQuiz(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { title: string; description?: string; category?: string; language?: string; difficulty?: string }) => {
      const { data } = await api.put<Quiz>(`/quiz/${id}`, body)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quizzes'] })
      qc.invalidateQueries({ queryKey: ['quiz', id] })
    },
  })
}

export function useDeleteQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/quiz/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] }),
  })
}

export type QuestionPayload = {
  type: QuestionType
  text: string
  imageUrl?: string
  songName?: string | null
  artistName?: string | null
  order?: number
  timeLimit?: number
  useTimer?: boolean
  points?: number
  answerOptions?: { text: string; isCorrect: boolean }[]
  correctAnswer?: 'true' | 'false'
  mapQuestion?: { lat: number; lng: number; rings: { radiusKm: number; points: number; order: number }[] }
  rankingItems?: { label: string; correctPosition: number; order: number }[]
  correctAnswers?: string[]
  audioUrl?: string
}

export function useAddQuestion(quizId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: QuestionPayload) => {
      const { data } = await api.post<Question>(`/quiz/${quizId}/questions`, body)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quiz', quizId] }),
  })
}

export interface GenerateQuestionsPayload {
  topic: string
  category: string
  language: string
  difficulty: 'easy' | 'medium' | 'hard'
  count: number
  withImage: boolean
}

export function useGenerateQuestions(quizId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: GenerateQuestionsPayload) => {
      const { data } = await api.post<Question[]>(`/quiz/${quizId}/generate`, body)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quiz', quizId] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useUpdateQuestion(quizId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ qid, ...body }: { qid: string } & QuestionPayload) => {
      const { data } = await api.put<Question>(`/quiz/${quizId}/questions/${qid}`, body)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quiz', quizId] }),
  })
}

export function useDeleteQuestion(quizId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (qid: string) => {
      await api.delete(`/quiz/${quizId}/questions/${qid}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quiz', quizId] }),
  })
}

export interface QuestionResult {
  id: string
  text: string
  type: QuestionType
  correctAnswerText: string | null
  totalAnswers: number
  correctAnswers: number
  answers: { nickname: string; answer: string; pointsEarned: number; responseTimeMs: number }[]
}

export interface SessionResults {
  sessionId: string
  quizTitle: string
  status: string
  finishedAt: string | null
  leaderboard: { rank: number; nickname: string; score: number }[]
  questions: QuestionResult[]
  reviewPrompt: { listingId: string } | null
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await api.delete(`/sessions/${sessionId}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['quizzes'] })
      void qc.invalidateQueries({ queryKey: ['active-sessions'] })
      void qc.invalidateQueries({ queryKey: ['purchases'] })
      void qc.invalidateQueries({ queryKey: ['rentals'] })
    },
  })
}

export function useSessionResults(sessionId: string) {
  return useQuery({
    queryKey: ['session-results', sessionId],
    queryFn: async () => {
      const { data } = await api.get<SessionResults>(`/sessions/${sessionId}/results`)
      return data
    },
    enabled: !!sessionId,
  })
}

// ─── Marketplace hooks ────────────────────────────────────────────────────────

export function useMyListing(quizId: string) {
  return useQuery<QuizListing | null>({
    queryKey: ['my-listing', quizId],
    queryFn: async () => {
      const { data } = await api.get<QuizListing | null>(`/marketplace/my/${quizId}`)
      return data
    },
    enabled: !!quizId,
    staleTime: 30_000,
  })
}

export function usePublishQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { quizId: string; price: number; currency: string; rentalPrice?: number; themeColor?: string }) => {
      const { data } = await api.post<QuizListing>('/marketplace', body)
      return data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['quizzes'] })
      qc.invalidateQueries({ queryKey: ['my-listing', variables.quizId] })
    },
  })
}

export function useBumpListingVersion() {
  return useMutation({
    mutationFn: async (listingId: string) => {
      await api.patch(`/marketplace/${listingId}/version`)
    },
  })
}

// ─── Question reorder ─────────────────────────────────────────────────────────

export function useReorderQuestions(quizId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (orders: { id: string; order: number }[]) => {
      await api.patch(`/quiz/${quizId}/questions/reorder`, { orders })
    },
    onMutate: async (orders) => {
      await qc.cancelQueries({ queryKey: ['quiz', quizId] })
      const prev = qc.getQueryData<QuizWithQuestions>(['quiz', quizId])
      if (prev) {
        const orderMap = new Map(orders.map(({ id, order }) => [id, order]))
        qc.setQueryData<QuizWithQuestions>(['quiz', quizId], {
          ...prev,
          questions: [...prev.questions]
            .map((q) => ({ ...q, order: orderMap.get(q.id) ?? q.order }))
            .sort((a, b) => a.order - b.order),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['quiz', quizId], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['quiz', quizId] }),
  })
}

export function useDeletePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (purchaseId: string) => { await api.delete(`/marketplace/purchases/${purchaseId}`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }),
  })
}

export function useDeleteRental() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rentalId: string) => { await api.delete(`/marketplace/rentals/${rentalId}`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rentals'] }),
  })
}

export function usePurchases() {
  return useQuery<PurchasedQuiz[]>({
    queryKey: ['purchases'],
    queryFn: async () => {
      const { data } = await api.get<PurchasedQuiz[]>('/marketplace/purchases')
      return data
    },
    staleTime: 30_000,
  })
}

export function useRentals() {
  return useQuery<RentalItem[]>({
    queryKey: ['rentals'],
    queryFn: async () => {
      const { data } = await api.get<RentalItem[]>('/marketplace/rentals')
      return data
    },
    staleTime: 30_000,
  })
}
