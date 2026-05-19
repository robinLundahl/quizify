import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'

async function registerRequest(name: string, email: string, password: string) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Registration failed.')
  return data
}

export default function Register() {
  const { user, isLoading } = useAuth()
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [confirmError, setConfirmError] = useState('')

  const mutation = useMutation({
    mutationFn: () => registerRequest(name, email, password),
    onSuccess: (data) => {
      setUser(data)
      navigate('/dashboard', { replace: true })
    },
  })

  if (isLoading) return null
  if (user) return <Navigate to="/dashboard" replace />

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setConfirmError('Passwords do not match.')
      return
    }
    setConfirmError('')
    mutation.mutate()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">Create an account</h1>
        <p className="mb-8 text-center text-sm text-gray-500">Join Quizify to create and host quizzes</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="password"
            placeholder="Password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div>
            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setConfirmError('') }}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {confirmError && <p className="mt-1 text-xs text-red-600">{confirmError}</p>}
          </div>

          {mutation.isError && (
            <p className="text-xs text-red-600">{(mutation.error as Error).message}</p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {mutation.isPending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
