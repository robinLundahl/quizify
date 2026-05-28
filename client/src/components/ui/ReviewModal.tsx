import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'

interface Props {
  listingId: string
  quizTitle: string
  onClose: () => void
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value
  return (
    <span className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
          aria-label={`${i} star`}
        >
          <svg
            className={`h-7 w-7 transition-colors ${i <= display ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </span>
  )
}

export default function ReviewModal({ listingId, quizTitle, onClose }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const dismiss = useMutation({
    mutationFn: () => api.post(`/marketplace/${listingId}/dismiss-review-prompt`),
    onSettled: onClose,
  })

  const submit = useMutation({
    mutationFn: () => api.post(`/marketplace/${listingId}/review`, { rating, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-listing', listingId] })
      setSubmitted(true)
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6">

        {submitted ? (
          <div className="text-center py-4 space-y-3">
            <div className="flex justify-center">
              <svg className="h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
              {t('review_modal.thanks')}
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-sm font-semibold text-white transition"
            >
              {t('review_modal.close')}
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => dismiss.mutate()}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              aria-label="Dismiss"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 pr-6">
              {t('review_modal.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate">{quizTitle}</p>

            <StarPicker value={rating} onChange={setRating} />

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('review_modal.placeholder')}
              rows={3}
              className="mt-4 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />

            {submit.isError && (
              <p className="mt-1 text-xs text-red-500">{t('marketplace.review_error')}</p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => submit.mutate()}
                disabled={rating === 0 || submit.isPending}
                className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition"
              >
                {submit.isPending ? t('marketplace.submitting_review') : t('marketplace.submit_review')}
              </button>
              <button
                onClick={() => dismiss.mutate()}
                disabled={dismiss.isPending}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                {t('review_modal.skip')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
