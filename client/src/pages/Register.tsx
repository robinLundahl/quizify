import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'
import LangToggle from '../components/ui/LangToggle'
import VerifyEmailStep from '../components/auth/VerifyEmailStep'

async function registerRequest(name: string, email: string, password: string) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Registration failed.')
  return data as { pending: true; userId: string }
}

export default function Register() {
  const { user, isLoading } = useAuth()
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? '/dashboard'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [pendingUserId, setPendingUserId] = useState('')

  const mutation = useMutation({
    mutationFn: () => registerRequest(name, email, password),
    onSuccess: (data) => {
      if (data.pending) {
        setPendingUserId(data.userId)
        setStep('verify')
        return
      }
      setUser(data as never)
      navigate(returnTo, { replace: true })
    },
  })

  if (isLoading) return null
  if (user) return <Navigate to={returnTo} replace />

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setConfirmError(t('register.passwords_no_match'))
      return
    }
    setConfirmError('')
    mutation.mutate()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg">
        <div className="mb-6 flex justify-end">
          <LangToggle />
        </div>

        {step === 'verify' ? (
          <VerifyEmailStep
            email={email}
            userId={pendingUserId}
            onSuccess={() => navigate(returnTo, { replace: true })}
          />
        ) : (
          <>
            <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">{t('register.title')}</h1>
            <p className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">{t('register.subtitle')}</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder={t('register.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="email"
                placeholder={t('register.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="password"
                placeholder={t('register.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div>
                <input
                  type="password"
                  placeholder={t('register.confirm_password')}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setConfirmError('') }}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                {mutation.isPending ? t('register.creating') : t('register.create')}
              </button>
            </form>

            <div className="mt-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>

            <a
              href="/api/auth/google"
              className="mt-3 flex items-center justify-center gap-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <GoogleIcon />
              {t('login.continue_with_google')}
            </a>

            <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
              {t('register.have_account')}{' '}
              <Link to="/login" className="text-indigo-600 hover:underline">
                {t('register.sign_in')}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
