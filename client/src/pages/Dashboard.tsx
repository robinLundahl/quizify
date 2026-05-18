import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useQuizzes, useCreateQuiz, useDeleteQuiz } from '../hooks/useQuizzes'

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const clearUser = useAuthStore((s) => s.clearUser)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: quizzes, isLoading } = useQuizzes()
  const createQuiz = useCreateQuiz()
  const deleteQuiz = useDeleteQuiz()
  const [hostingId, setHostingId] = useState<string | null>(null)

  async function handleLogout() {
    await api.post('/auth/logout')
    clearUser()
    queryClient.clear()
    navigate('/login')
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-lg font-bold text-indigo-600">Quizify</span>
          <div className="flex items-center gap-3">
            {user?.avatar && (
              <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full" />
            )}
            <span className="text-sm font-medium text-gray-700">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100"
            >
              Log out
            </button>
          </div>
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
                    onClick={() => {
                      if (confirm(`Delete "${quiz.title}"?`)) deleteQuiz.mutate(quiz.id)
                    }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
