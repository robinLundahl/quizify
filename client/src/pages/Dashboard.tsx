import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import { useQuizzes, useCreateQuiz, useDeleteQuiz, useDeleteSession, useActiveSessions } from '../hooks/useQuizzes'
import NavDropdown from '../components/ui/NavDropdown'
import { useThemeStore } from '../store/themeStore'

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: quizzes, isLoading } = useQuizzes()
  const { data: activeSessions } = useActiveSessions()
  const createQuiz = useCreateQuiz()
  const deleteQuiz = useDeleteQuiz()
  const deleteSession = useDeleteSession()
  const [hostingId, setHostingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  function handleRejoin(sessionId: string, code: string, status: 'ACTIVE' | 'WAITING') {
    if (status === 'ACTIVE') {
      localStorage.setItem('quizify_active_host_session', sessionId)
    }
    navigate(`/host/${sessionId}`, { state: { code, rejoin: true, status } })
  }

  async function handleCreate() {
    const quiz = await createQuiz.mutateAsync({ title: 'Untitled quiz' })
    navigate(`/quiz/${quiz.id}`)
  }

  async function handleHost(quizId: string) {
    setHostingId(quizId)
    try {
      const res = await api.post<{ sessionId: string; code: string }>('/sessions', { quizId })
      navigate(`/host/${res.data.sessionId}`, { state: { code: res.data.code } })
    } finally {
      setHostingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-xl font-black text-indigo-600 hover:opacity-80 transition-opacity">
              Quizify
            </Link>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as Parameters<typeof setTheme>[0])}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="light">{t('host.themes.light')}</option>
              <option value="dark">{t('host.themes.dark')}</option>
              <option value="sunset">{t('host.themes.sunset')}</option>
              <option value="forest">{t('host.themes.forest')}</option>
              <option value="rose">{t('host.themes.rose')}</option>
              <option value="peach">{t('host.themes.peach')}</option>
            </select>
          </div>
          <NavDropdown />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {activeSessions && activeSessions.length > 0 && (
          <div className="mb-8 rounded-2xl bg-white dark:bg-gray-800 shadow-sm p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {t('dashboard.active_sessions')}
            </p>
            <div className="space-y-2">
              {activeSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-700/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 font-mono text-sm font-bold tracking-widest text-indigo-700 dark:text-indigo-300">
                      {s.code}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{s.quizTitle}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        s.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {s.status === 'ACTIVE' ? t('dashboard.in_progress') : t('dashboard.waiting')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleRejoin(s.id, s.code, s.status)}
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      {t('dashboard.rejoin')}
                    </button>
                    <button
                      onClick={() => deleteSession.mutate(s.id)}
                      disabled={deleteSession.isPending}
                      className="text-sm text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('dashboard.your_quizzes')}</h1>
          <button
            onClick={handleCreate}
            disabled={createQuiz.isPending}
            className="rounded-xl bg-indigo-600 themed:bg-indigo-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {createQuiz.isPending ? t('common.creating') : t('dashboard.new_quiz')}
          </button>
        </div>

        {isLoading && <p className="text-gray-400 dark:text-gray-500 text-sm">{t('common.loading')}</p>}

        {!isLoading && quizzes?.length === 0 && (
          <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-2xl">
              📝
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.no_quizzes')}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('dashboard.no_quizzes_hint')}</p>
            <button
              onClick={handleCreate}
              disabled={createQuiz.isPending}
              className="mt-6 rounded-xl bg-indigo-600 themed:bg-indigo-900 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {t('dashboard.new_quiz')}
            </button>
          </div>
        )}

        {quizzes && quizzes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="h-1 w-full bg-indigo-600" />
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">{quiz.title}</h2>
                  {quiz.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{quiz.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {t('dashboard.question_count', { count: quiz._count?.questions ?? 0 })}
                  </p>
                  <div className="mt-auto pt-4">
                    <div className="flex gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                      <button
                        onClick={() => navigate(`/quiz/${quiz.id}`)}
                        className="rounded-xl bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleHost(quiz.id)}
                        disabled={hostingId === quiz.id}
                        className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {hostingId === quiz.id ? t('common.creating') : t('dashboard.host')}
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: quiz.id, title: quiz.title })}
                        className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>

                  {quiz.sessions && quiz.sessions.length > 0 && (
                    <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('dashboard.past_sessions')}</p>
                      {quiz.sessions.map((s) => (
                        <div key={s.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 font-mono text-xs font-semibold text-gray-600 dark:text-gray-300">
                              {s.code}
                            </span>
                            {s.finishedAt && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {new Date(s.finishedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/results/${s.id}`}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                            >
                              {t('dashboard.results')}
                            </Link>
                            <button
                              onClick={() => deleteSession.mutate(s.id)}
                              disabled={deleteSession.isPending}
                              className="cursor-pointer text-gray-300 dark:text-gray-600 transition hover:text-red-500 disabled:opacity-40"
                              title={t('common.delete')}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.delete_quiz_title')}</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('dashboard.delete_quiz_body', { title: confirmDelete.title })}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleteQuiz.isPending}
                className="rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  deleteQuiz.mutate(confirmDelete.id, { onSettled: () => setConfirmDelete(null) })
                }}
                disabled={deleteQuiz.isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleteQuiz.isPending ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
