import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import NavDropdown from '../components/ui/NavDropdown'

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const clearUser = useAuthStore((s) => s.clearUser)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      await api.delete('/auth/account')
      clearUser()
      queryClient.clear()
      navigate('/login', { replace: true })
    } catch {
      setError('Something went wrong. Please try again.')
      setDeleting(false)
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

      <main className="mx-auto max-w-xl px-6 py-12 space-y-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Account</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">Name</p>
              <p className="text-sm text-gray-700">{user?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Email</p>
              <p className="text-sm text-gray-700">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Danger zone</h2>
          <p className="text-sm text-gray-500">
            Permanently delete your account and all your quizzes. This cannot be undone.
          </p>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="border border-gray-200 text-gray-500 rounded-lg px-3 py-1.5 text-sm hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition"
            >
              Delete account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-600">
                Are you sure? This cannot be undone.
              </p>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirming(false); setError('') }}
                  disabled={deleting}
                  className="border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {deleting ? 'Deleting…' : 'Confirm delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
