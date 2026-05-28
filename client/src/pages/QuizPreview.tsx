import { useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import NavBar from '../components/ui/NavBar'
import UpdateModal from '../components/ui/UpdateModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnswerOption {
  id: string
  text: string
  isCorrect: boolean
}

interface RankingItem {
  id: string
  label: string
  correctPosition: number
}

interface MapRing {
  id: string
  radiusKm: number
  points: number
  order: number
}

interface Question {
  id: string
  type: string
  text: string
  imageUrl: string | null
  order: number
  timeLimit: number
  useTimer: boolean
  points: number
  answerOptions: AnswerOption[]
  rankingItems: RankingItem[]
  mapQuestion: {
    lat: number
    lng: number
    rings: MapRing[]
  } | null
  audioQuestion: { url: string; platform: string } | null
  correctAnswers: string[]
}

interface QuizFull {
  id: string
  title: string
  description: string | null
  category: string | null
  language: string | null
  difficulty: string | null
  questions: Question[]
}

// ─── Question card ────────────────────────────────────────────────────────────

function QuestionCard({ question, index }: { question: Question; index: number }) {
  const { t } = useTranslation()

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm p-5">
      <div className="flex items-start gap-3">
        <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {t(`quiz_editor.types.${question.type}`, { defaultValue: question.type })}
            </span>
            {question.useTimer && (
              <span className="text-xs text-gray-400 dark:text-gray-500">· {question.timeLimit}s</span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">· {question.points} {t('common.pts')}</span>
          </div>

          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">{question.text}</p>

          {question.imageUrl && (
            <img src={question.imageUrl} alt="" className="rounded-xl mb-3 max-h-48 object-cover w-full" />
          )}

          {/* Multiple choice / image / true-false options */}
          {question.answerOptions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {question.answerOptions.map((opt) => (
                <div
                  key={opt.id}
                  className={`rounded-xl px-3 py-2 text-sm flex items-center gap-2 ${
                    opt.isCorrect
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                      : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {opt.isCorrect && (
                    <svg className="h-3.5 w-3.5 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {opt.text}
                </div>
              ))}
            </div>
          )}

          {/* Ranking items */}
          {question.rankingItems.length > 0 && (
            <div className="space-y-1.5">
              {[...question.rankingItems]
                .sort((a, b) => a.correctPosition - b.correctPosition)
                .map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="shrink-0 text-xs font-bold text-gray-400 dark:text-gray-500 w-4">{item.correctPosition}.</span>
                    {item.label}
                  </div>
                ))}
            </div>
          )}

          {/* Open-ended accepted answers */}
          {question.type === 'OPEN_ENDED' && question.correctAnswers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {question.correctAnswers.map((a, i) => (
                <span key={i} className="rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-2.5 py-0.5 text-xs text-green-700 dark:text-green-300">
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Map question */}
          {question.mapQuestion && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              📍 {question.mapQuestion.lat.toFixed(4)}, {question.mapQuestion.lng.toFixed(4)}
              {question.mapQuestion.rings.length > 0 && (
                <span className="ml-2">
                  · {question.mapQuestion.rings.map(r => `${r.radiusKm} km → ${r.points} pts`).join(', ')}
                </span>
              )}
            </p>
          )}

          {/* Audio */}
          {question.audioQuestion && (
            <p className="text-xs text-gray-500 dark:text-gray-400">🎵 {question.audioQuestion.platform} · {question.audioQuestion.url}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QuizPreview() {
  const { listingId } = useParams<{ listingId: string }>()
  const { t } = useTranslation()
  const location = useLocation()
  const fromTab = (location.state as { fromTab?: string } | null)?.fromTab
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const qc = useQueryClient()

  const { data: quiz, isLoading, isError } = useQuery<QuizFull>({
    queryKey: ['quiz-preview', listingId],
    queryFn: () => api.get(`/marketplace/${listingId}/quiz`).then((r) => r.data),
    enabled: !!listingId,
  })

  const { data: listingMeta } = useQuery<{ updateAvailable: boolean }>({
    queryKey: ['listing-meta', listingId],
    queryFn: () => api.get(`/marketplace/${listingId}`).then((r) => r.data),
    enabled: !!listingId,
    staleTime: 30_000,
  })

  const updateAvailable = listingMeta?.updateAvailable === true

  const difficultyColor: Record<string, string> = {
    easy:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    hard:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" state={fromTab ? { tab: fromTab } : undefined} className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 transition-colors">
            ← {t('quiz_editor.back_to_dashboard')}
          </Link>
          {updateAvailable && (
            <button
              onClick={() => setUpdateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200 transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {t('dashboard.update_available')}
            </button>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 dark:border-gray-700 border-t-indigo-600" />
          </div>
        )}

        {isError && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-24">{t('quiz_editor.not_found')}</p>
        )}

        {quiz && (
          <div className="space-y-6">
            {/* Header */}
            <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm p-6">
              <div className="flex flex-wrap gap-2 mb-3">
                {quiz.category && (
                  <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {quiz.category}
                  </span>
                )}
                {quiz.difficulty && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyColor[quiz.difficulty] ?? ''}`}>
                    {t(`marketplace.difficulty_${quiz.difficulty}`, { defaultValue: quiz.difficulty })}
                  </span>
                )}
                {quiz.language && (
                  <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                    {quiz.language}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{quiz.title}</h1>

              {quiz.description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{quiz.description}</p>
              )}

              <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                {t('marketplace.questions_count', { count: quiz.questions.length })}
              </p>
            </div>

            {/* Questions */}
            <div className="space-y-3">
              {quiz.questions.map((q, i) => (
                <QuestionCard key={q.id} question={q} index={i} />
              ))}
            </div>
          </div>
        )}
      </main>

      {updateModalOpen && listingId && (
        <UpdateModal
          listingId={listingId}
          title={quiz?.title ?? ''}
          onClose={() => setUpdateModalOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['quiz-preview', listingId] })
            qc.invalidateQueries({ queryKey: ['listing-meta', listingId] })
          }}
        />
      )}
    </div>
  )
}
