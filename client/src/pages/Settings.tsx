import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

  const [nameInput, setNameInput] = useState(user?.name ?? '')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameSaved, setNameSaved] = useState(false)

  const nameDirty = nameInput.trim() !== (user?.name ?? '')

  async function handleNameSave() {
    if (!nameInput.trim()) {
      setNameError(t('settings_page.name') + ' cannot be empty.')
      return
    }
    setNameSaving(true)
    setNameError('')
    setNameSaved(false)
    try {
      const res = await api.patch<{ id: string; name: string; email: string; avatar: string | null }>('/auth/me', { name: nameInput.trim() })
      if (user) setUser({ ...user, name: res.data.name })
      setNameInput(res.data.name)
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setNameError(msg ?? 'Failed to save. Please try again.')
    } finally {
      setNameSaving(false)
    }
  }

  const [showDeleteModal, setShowDeleteModal] = useState(false)
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

  function handleCloseDeleteModal() {
    if (deleting) return
    setShowDeleteModal(false)
    setDeleteError('')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/dashboard" className="text-lg font-bold text-indigo-600 hover:opacity-80 transition-opacity">Quizify</Link>
          <NavDropdown />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-12 space-y-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings_page.title')}</h1>

        {/* Avatar */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('settings_page.photo')}</h2>
          <div className="flex items-center gap-4">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-2xl font-semibold text-indigo-600">
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
                className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
              >
                {t('settings_page.upload_photo')}
              </button>
              {user?.avatar && !cropSrc && (
                <button
                  onClick={handleAvatarRemove}
                  disabled={avatarUploading || avatarRemoving}
                  className="text-sm text-gray-400 dark:text-gray-500 hover:text-red-500 transition disabled:opacity-50 text-left"
                >
                  {avatarRemoving ? t('settings_page.removing') : t('settings_page.remove_photo')}
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
          {!cropSrc && <p className="text-xs text-gray-400 dark:text-gray-500">{t('settings_page.file_hint')}</p>}
        </div>

        {/* Account info */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('settings_page.account')}</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t('settings_page.name')}</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => { setNameInput(e.target.value); setNameError(''); setNameSaved(false) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && nameDirty) handleNameSave() }}
                  disabled={nameSaving}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                />
                {nameDirty && (
                  <>
                    <button
                      onClick={handleNameSave}
                      disabled={nameSaving}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      {nameSaving ? t('common.saving') : t('common.save')}
                    </button>
                    <button
                      onClick={() => { setNameInput(user?.name ?? ''); setNameError('') }}
                      disabled={nameSaving}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
                    >
                      {t('common.cancel')}
                    </button>
                  </>
                )}
                {nameSaved && !nameDirty && (
                  <span className="text-xs text-green-600 dark:text-green-400">{t('common.saved')}</span>
                )}
              </div>
              {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t('settings_page.email')}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('settings_page.danger_zone')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('settings_page.danger_hint')}
          </p>

          <button
            onClick={() => { setDeleteError(''); setShowDeleteModal(true) }}
            className="border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg px-3 py-1.5 text-sm hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition"
          >
            {t('settings_page.delete_account')}
          </button>
        </div>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings_page.delete_account_title')}</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('settings_page.delete_account_body')}
            </p>
            {deleteError && <p className="mt-3 text-xs text-red-600">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleCloseDeleteModal}
                disabled={deleting}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? t('common.deleting') : t('settings_page.delete_account')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
