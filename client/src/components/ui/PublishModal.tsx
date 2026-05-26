import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePublishQuiz } from '../../hooks/useQuizzes'
import { useAuthStore } from '../../store/authStore'
import { COLOR_THEMES } from '../../lib/theme'

interface Props {
  quizId: string
  quizTitle: string
  category?: string | null
  language?: string | null
  onClose: () => void
  onSuccess: () => void
}

const INPUT_CLS =
  'rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500'

const THEME_ACCENT: Record<string, string> = {
  sunset: '#eb7f86',
  forest: '#4da284',
  rose:   '#cc607d',
  peach:  '#fac484',
  ocean:  '#63a6a0',
}

const ERROR_CODES: Record<string, string> = {
  stripe_required: 'publish_modal.stripe_required',
  free_limit:      'publish_modal.free_limit',
  price_too_low:   'publish_modal.price_error',
  rental_too_low:  'publish_modal.rental_min_error',
  rental_too_high: 'publish_modal.rental_max_error',
}

export default function PublishModal({ quizId, quizTitle, category, language, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const publish = usePublishQuiz()
  const user = useAuthStore((s) => s.user)
  const isPro = user?.plan === 'PRO'

  const [price, setPrice] = useState('1.99')
  const [currency, setCurrency] = useState('USD')
  const [rentalEnabled, setRentalEnabled] = useState(false)
  const [rentalPrice, setRentalPrice] = useState('0.99')
  const [themeColor, setThemeColor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const missingMeta = !category || !language

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const priceCents = Math.round(parseFloat(price) * 100)
    if (isNaN(priceCents) || priceCents < 99) {
      setError(t('publish_modal.price_error'))
      return
    }

    let rentalCents: number | undefined
    if (rentalEnabled) {
      rentalCents = Math.round(parseFloat(rentalPrice) * 100)
      if (isNaN(rentalCents) || rentalCents < 50) {
        setError(t('publish_modal.rental_min_error'))
        return
      }
      if (rentalCents > Math.floor(priceCents * 0.8)) {
        setError(t('publish_modal.rental_max_error'))
        return
      }
    }

    publish.mutate(
      { quizId, price: priceCents, currency, rentalPrice: rentalCents, themeColor: themeColor ?? undefined },
      {
        onSuccess: () => onSuccess(),
        onError: (err: unknown) => {
          const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          const i18nKey = code ? ERROR_CODES[code] : undefined
          setError(i18nKey ? t(i18nKey) : t('common.error'))
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">

        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('publish_modal.title')}
        </h2>
        <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">{quizTitle}</p>

        {missingMeta && (
          <div className="mt-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            {t('publish_modal.no_category')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">

          {/* Price */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {t('publish_modal.price_label')}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.99"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className={`flex-1 ${INPUT_CLS}`}
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="USD">USD ($)</option>
                <option value="SEK">SEK (kr)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{t('publish_modal.price_hint')}</p>
          </div>

          {/* Rental */}
          <div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={rentalEnabled}
                onChange={(e) => setRentalEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-indigo-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('publish_modal.rental_toggle')}</span>
            </label>
            {rentalEnabled && (
              <div className="mt-2">
                <input
                  type="number"
                  min="0.50"
                  step="0.01"
                  value={rentalPrice}
                  onChange={(e) => setRentalPrice(e.target.value)}
                  className={`w-full ${INPUT_CLS}`}
                />
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{t('publish_modal.rental_hint')}</p>
              </div>
            )}
          </div>

          {/* Theme color — Pro only */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {t('publish_modal.theme_color')}
              {!isPro && (
                <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 normal-case tracking-normal">
                  Pro
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              {/* None swatch */}
              <button
                type="button"
                disabled={!isPro}
                onClick={() => setThemeColor(null)}
                title={t('publish_modal.theme_none')}
                className={`h-7 w-7 rounded-full border-2 bg-indigo-500 transition disabled:cursor-not-allowed disabled:opacity-40 ${themeColor === null ? 'border-indigo-600 ring-2 ring-indigo-400 ring-offset-2' : 'border-transparent'}`}
              />
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme}
                  type="button"
                  disabled={!isPro}
                  onClick={() => setThemeColor(theme)}
                  title={theme}
                  style={{ backgroundColor: THEME_ACCENT[theme] }}
                  className={`h-7 w-7 rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${themeColor === theme ? 'border-gray-700 dark:border-gray-200 ring-2 ring-offset-2 dark:ring-offset-gray-800' : 'border-transparent'}`}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={publish.isPending}
              className="rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={publish.isPending}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {publish.isPending ? t('common.saving') : t('publish_modal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
