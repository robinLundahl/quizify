import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSessionResults } from '../hooks/useQuizzes'

const MEDAL = ['🥇', '🥈', '🥉']

export default function ResultsView() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const fromTab = (location.state as { fromTab?: string } | null)?.fromTab
  const { t } = useTranslation()
  const { data, isLoading, isError } = useSessionResults(sessionId ?? '')

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-400 dark:text-gray-500">{t('results.loading')}</div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">{t('results.not_found')}</div>
      </div>
    )
  }

  const finishedDate = data.finishedAt
    ? new Date(data.finishedAt).toLocaleString()
    : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{data.quizTitle}</h1>
            {finishedDate && (
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">{t('results.finished', { date: finishedDate })}</p>
            )}
          </div>
          <button
            onClick={() => navigate('/dashboard', { state: fromTab ? { tab: fromTab } : undefined })}
            className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            {t('results.back')}
          </button>
        </div>

        {/* Leaderboard */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-gray-100">{t('results.final_leaderboard')}</h2>
          <div className="space-y-2">
            {data.leaderboard.map((p) => (
              <div
                key={p.nickname}
                className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                  p.rank === 1
                    ? 'bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30'
                    : p.rank === 2
                    ? 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                    : p.rank === 3
                    ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30'
                    : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'
                }`}
              >
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {MEDAL[p.rank - 1] ?? `${p.rank}.`} {p.nickname}
                </span>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {p.score.toLocaleString()} {t('common.pts')}
                </span>
              </div>
            ))}
            {data.leaderboard.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t('results.no_participants')}</p>
            )}
          </div>
        </div>

        {/* Per-question breakdown */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('results.question_breakdown')}</h2>
          {data.questions.map((q, i) => {
            const pct =
              q.totalAnswers > 0
                ? Math.round((q.correctAnswers / q.totalAnswers) * 100)
                : 0

            return (
              <div key={q.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Q{i + 1} · {t(`results.question_types.${q.type}`, { defaultValue: q.type.replace('_', ' ') })}
                    </span>
                    <p className="mt-0.5 font-medium text-gray-800 dark:text-gray-100">{q.text}</p>
                    {q.correctAnswerText && (
                      <p className="mt-1 text-sm text-green-600">
                        {t('results.correct_prefix')} {q.correctAnswerText}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{pct}%</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t('results.correct_count', { correct: q.correctAnswers, total: q.totalAnswers })}
                    </p>
                  </div>
                </div>

                {/* Correct rate bar */}
                <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Player answers */}
                {q.answers.length > 0 && (
                  <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                            {t('results.player')}
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                            {t('results.answer')}
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                            {t('results.points')}
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                            {t('results.time')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {q.answers
                          .sort((a, b) => b.pointsEarned - a.pointsEarned)
                          .map((a) => (
                            <tr key={a.nickname} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">
                                {a.nickname}
                              </td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                                {q.type === 'MAP'
                                  ? t('results.map_pin')
                                  : a.answer.length > 40
                                  ? a.answer.slice(0, 40) + '…'
                                  : a.answer}
                              </td>
                              <td
                                className={`px-3 py-2 text-right font-semibold ${
                                  a.pointsEarned > 0 ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'
                                }`}
                              >
                                {a.pointsEarned > 0 ? `+${a.pointsEarned}` : '0'}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-400 dark:text-gray-500">
                                {(a.responseTimeMs / 1000).toFixed(1)}s
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {q.totalAnswers === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">{t('results.no_answers')}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
