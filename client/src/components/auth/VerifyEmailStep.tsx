import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  email: string
  userId: string
  onSuccess: () => void
}

async function verifyCode(userId: string, code: string) {
  const res = await fetch('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, code }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Verification failed.')
  return data
}

async function resendCode(userId: string) {
  const res = await fetch('/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Resend failed.')
}

export default function VerifyEmailStep({ email, userId, onSuccess }: Props) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(30)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    setIsVerifying(true)
    setError('')
    try {
      await verifyCode(userId, code)
      onSuccess()
    } catch {
      setError(t('register.invalid_code'))
      setCode('')
    } finally {
      setIsVerifying(false)
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || isResending) return
    setIsResending(true)
    setError('')
    try {
      await resendCode(userId)
      setResendCooldown(30)
    } catch {
      setError(t('register.invalid_code'))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('register.check_email_title')}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('register.check_email_hint', { email })}</p>
      </div>

      <form onSubmit={handleVerify} className="flex flex-col gap-3">
        <input
          type="text"
          inputMode="numeric"
          placeholder={t('register.enter_code')}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          maxLength={6}
          className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg px-3 py-2 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isVerifying || code.length !== 6}
          className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {isVerifying ? t('register.verifying') : t('register.verify')}
        </button>
      </form>

      <button
        type="button"
        onClick={handleResend}
        disabled={resendCooldown > 0 || isResending}
        className="text-sm text-indigo-600 hover:underline disabled:text-gray-400 disabled:no-underline transition"
      >
        {resendCooldown > 0 ? t('register.resend_in', { s: resendCooldown }) : t('register.resend_code')}
      </button>
    </div>
  )
}
