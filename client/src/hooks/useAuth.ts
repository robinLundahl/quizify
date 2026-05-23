import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import api from '../lib/api'
import { useAuthStore, type AuthUser } from '../store/authStore'
import { useThemeStore, PRO_ONLY_THEMES } from '../store/themeStore'

export function useAuth() {
  const { setUser, clearUser } = useAuthStore()
  const { theme, setTheme } = useThemeStore()

  const { data, isLoading } = useQuery<AuthUser>({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (data) {
      setUser(data)
      const storedTheme = localStorage.getItem('theme')
      if (data.isAdmin && (!storedTheme || storedTheme === 'light' || storedTheme === 'forest')) {
        setTheme('ocean')
      } else if (data.plan === 'FREE' && PRO_ONLY_THEMES.includes(theme)) {
        setTheme('light')
      }
    } else if (!isLoading) {
      clearUser()
    }
  }, [data, isLoading, setUser, clearUser, theme, setTheme])

  // Return data directly from React Query so user and isLoading are always
  // in sync — previously user came from Zustand which updated one render late,
  // causing a flash where isLoading=false and user=null, triggering a redirect.
  return { user: data ?? null, isLoading }
}
