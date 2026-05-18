import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import api from '../lib/api'
import { useAuthStore, type AuthUser } from '../store/authStore'

export function useAuth() {
  const { user, setUser, clearUser } = useAuthStore()

  const { data, isLoading } = useQuery<AuthUser>({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (data) setUser(data)
    else if (!isLoading) clearUser()
  }, [data, isLoading, setUser, clearUser])

  return { user, isLoading }
}
