import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/api'
import LangToggle from './LangToggle'

export default function NavDropdown() {
  const user = useAuthStore((s) => s.user)
  const clearUser = useAuthStore((s) => s.clearUser)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    await api.post('/auth/logout')
    clearUser()
    queryClient.clear()
    navigate('/login')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-sm font-semibold text-indigo-600">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.name}</span>
        <svg
          className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm z-50">
          <div className="p-1">
            <button
              onClick={() => { setOpen(false); navigate('/dashboard') }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t('nav.dashboard')}
            </button>
            <button
              onClick={() => { setOpen(false); navigate('/settings') }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t('nav.settings')}
            </button>
            <div className="mx-3 my-1.5 flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">{t('nav.language')}</span>
              <LangToggle />
            </div>
            <div className="my-1 h-px bg-gray-100 dark:bg-gray-700" />
            <button
              onClick={handleLogout}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t('nav.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
