import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { useQueryClient } from '@tanstack/react-query'

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const clearUser = useAuthStore((s) => s.clearUser)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  async function handleLogout() {
    await api.post('/auth/logout')
    clearUser()
    queryClient.clear()
    navigate('/login')
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
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Your quizzes</h1>
        <p className="text-gray-500">No quizzes yet — create one to get started.</p>
      </main>
    </div>
  )
}
