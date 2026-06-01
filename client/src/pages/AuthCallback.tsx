import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    // Send token to backend to set httpOnly cookie
    api.post('/auth/set-token', { token })
      .then(() => api.get('/auth/me'))
      .then((res) => {
        setUser(res.data)
        navigate('/dashboard', { replace: true })
      })
      .catch(() => {
        navigate('/login', { replace: true })
      })
  }, [searchParams, navigate, setUser])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Logging in...</p>
    </div>
  )
}
