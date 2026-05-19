import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useQuizzes, useCreateQuiz, useDeleteQuiz, useDeleteSession } from '../hooks/useQuizzes'
import NavDropdown from '../components/ui/NavDropdown'

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: quizzes, isLoading } = useQuizzes()
  const createQuiz = useCreateQuiz()
  const deleteQuiz = useDeleteQuiz()
  const deleteSession = useDeleteSession()
  const [hostingId, setHostingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null)

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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/dashboard" className="text-lg font-bold text-indigo-600 hover:opacity-80 transition-opacity">Quizify</Link>
          <NavDropdown />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Your quizzes</h1>
          <button
            onClick={handleCreate}
            disabled={createQuiz.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {createQuiz.isPending ? 'Creating...' : '+ New quiz'}
          </button>
        </div>

        {isLoading && <p className="text-gray-500">Loading...</p>}

        {!isLoading && quizzes?.length === 0 && (
          <p className="text-gray-500">No quizzes yet — create one to get started.</p>
        )}

        {quizzes && quizzes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <h2 className="truncate font-semibold text-gray-900">{quiz.title}</h2>
                {quiz.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{quiz.description}</p>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  {quiz._count?.questions ?? 0} question{quiz._count?.questions !== 1 ? 's' : ''}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => navigate(`/quiz/${quiz.id}`)}
                    className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleHost(quiz.id)}
                    disabled={hostingId === quiz.id}
                    className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {hostingId === quiz.id ? 'Creating…' : 'Host'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: quiz.id, title: quiz.title })}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>

                {quiz.sessions && quiz.sessions.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-3 space-y-1.5">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Past sessions</p>
                    {quiz.sessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-gray-600">
                            {s.code}
                          </span>
                          {s.finishedAt && (
                            <span className="text-xs text-gray-400">
                              {new Date(s.finishedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/results/${s.id}`}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            Results →
                          </Link>
                          <button
                            onClick={() => deleteSession.mutate(s.id)}
                            disabled={deleteSession.isPending}
                            className="cursor-pointer text-gray-300 transition hover:text-red-500 disabled:opacity-40"
                            title="Delete session"
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
            ))}
          </div>
        )}
      </main>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <h2 className="font-semibold text-gray-900">Delete quiz?</h2>
            <p className="mt-2 text-sm text-gray-500">
              <span className="font-medium text-gray-700">"{confirmDelete.title}"</span> will be permanently deleted. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleteQuiz.isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteQuiz.mutate(confirmDelete.id, { onSettled: () => setConfirmDelete(null) })
                }}
                disabled={deleteQuiz.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleteQuiz.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
