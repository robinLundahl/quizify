import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import NavDropdown from '../components/ui/NavDropdown'
import AvatarCropper from '../components/ui/AvatarCropper'

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const clearUser = useAuthStore((s) => s.clearUser)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarRemoving, setAvatarRemoving] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError('')
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleCropSave(blob: Blob) {
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append('avatar', blob, 'avatar.jpg')
      const res = await api.patch<{ avatar: string }>('/auth/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (user) setUser({ ...user, avatar: res.data.avatar })
      if (cropSrc) URL.revokeObjectURL(cropSrc)
      setCropSrc(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setAvatarError(msg ?? 'Upload failed. Please try again.')
    } finally {
      setAvatarUploading(false)
    }
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    setAvatarError('')
  }

  async function handleAvatarRemove() {
    setAvatarError('')
    setAvatarRemoving(true)
    try {
      await api.delete('/auth/avatar')
      if (user) setUser({ ...user, avatar: null })
    } catch {
      setAvatarError('Failed to remove photo. Please try again.')
    } finally {
      setAvatarRemoving(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete('/auth/account')
      clearUser()
      queryClient.clear()
      navigate('/login', { replace: true })
    } catch {
      setDeleteError('Something went wrong. Please try again.')
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

        {/* Avatar */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Photo</h2>
          <div className="flex items-center gap-4">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-semibold text-indigo-600">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading || avatarRemoving || !!cropSrc}
                className="border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100 transition disabled:opacity-50"
              >
                Upload photo
              </button>
              {user?.avatar && !cropSrc && (
                <button
                  onClick={handleAvatarRemove}
                  disabled={avatarUploading || avatarRemoving}
                  className="text-sm text-gray-400 hover:text-red-500 transition disabled:opacity-50 text-left"
                >
                  {avatarRemoving ? 'Removing…' : 'Remove photo'}
                </button>
              )}
            </div>
          </div>

          {cropSrc && (
            <AvatarCropper
              imageSrc={cropSrc}
              onSave={handleCropSave}
              onCancel={handleCropCancel}
              saving={avatarUploading}
            />
          )}

          {avatarError && <p className="text-xs text-red-600">{avatarError}</p>}
          {!cropSrc && <p className="text-xs text-gray-400">JPEG, PNG, WebP or GIF · max 2 MB</p>}
        </div>

        {/* Account info */}
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

        {/* Danger zone */}
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
              {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirming(false); setDeleteError('') }}
                  disabled={deleting}
                  className="border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
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
