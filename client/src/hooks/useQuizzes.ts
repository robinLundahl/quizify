import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export interface Quiz {
  id: string
  title: string
  description: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
  _count?: { questions: number }
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

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN_ENDED' | 'IMAGE' | 'MAP'

export interface Question {
  id: string
  quizId: string
  type: QuestionType
  text: string
  imageUrl: string | null
  order: number
  timeLimit: number
  points: number
  answerOptions: AnswerOption[]
  mapQuestion: MapQuestionData | null
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
    mutationFn: async (body: { title: string; description?: string }) => {
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
  order?: number
  timeLimit?: number
  points?: number
  answerOptions?: { text: string; isCorrect: boolean }[]
  correctAnswer?: 'true' | 'false'
  mapQuestion?: { lat: number; lng: number; rings: { radiusKm: number; points: number; order: number }[] }
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
