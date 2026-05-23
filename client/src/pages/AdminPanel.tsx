import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import NavDropdown from '../components/ui/NavDropdown'
import { useAuthStore } from '../store/authStore'

interface AdminUser {
  id: string
  name: string
  email: string
  avatar: string | null
  plan: 'FREE' | 'PRO'
  isAdmin: boolean
  createdAt: string
}

export default function AdminPanel() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null)

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users', search],
    queryFn: () =>
      api.get('/admin/users', { params: search ? { search } : undefined }).then((r) => r.data),
    enabled: !!user?.isAdmin,
  })

  const setPlan = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: 'FREE' | 'PRO' }) =>
      api.patch(`/admin/users/${id}/plan`, { plan }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      setConfirmDelete(null)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  if (user && !user.isAdmin) {
    navigate('/dashboard', { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xl font-black text-indigo-600 hover:opacity-80 transition-opacity"
            >
              Quizify
            </button>
            <span className="text-sm text-gray-400 dark:text-gray-500">/</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('nav.admin')}</span>
          </div>
          <NavDropdown />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('admin.users')}</h1>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.search_placeholder')}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
          />
        </div>

        {isLoading && (
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('common.loading')}</p>
        )}

        {users && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            {users.length === 0 ? (
              <p className="p-5 text-sm text-gray-500 dark:text-gray-400">{t('admin.no_users')}</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((u) => (
                  <li key={u.id} className="flex items-center gap-4 px-5 py-4">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="h-9 w-9 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-sm font-semibold text-indigo-600">
                        {u.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {u.name}
                        </span>
                        {u.isAdmin && (
                          <span className="rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {t('nav.admin')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.email}</p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold flex-shrink-0 ${
                        u.plan === 'PRO'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {u.plan === 'PRO' ? t('admin.plan_pro') : t('admin.plan_free')}
                    </span>

                    {u.plan === 'FREE' ? (
                      <button
                        onClick={() => setPlan.mutate({ id: u.id, plan: 'PRO' })}
                        disabled={setPlan.isPending}
                        className="bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex-shrink-0"
                      >
                        {t('admin.make_pro')}
                      </button>
                    ) : (
                      <button
                        onClick={() => setPlan.mutate({ id: u.id, plan: 'FREE' })}
                        disabled={setPlan.isPending || u.isAdmin}
                        className="border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg px-3 py-1.5 text-sm hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition flex-shrink-0"
                      >
                        {t('admin.make_free')}
                      </button>
                    )}

                    {!u.isAdmin && (
                      <button
                        onClick={() => setConfirmDelete(u)}
                        className="rounded-lg px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition flex-shrink-0"
                      >
                        {t('admin.delete_user')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl mx-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t('admin.delete_user_confirm_title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t('admin.delete_user_confirm_body', { name: confirmDelete.name })}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleteUser.isPending}
                className="rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteUser.mutate(confirmDelete.id)}
                disabled={deleteUser.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleteUser.isPending ? t('admin.deleting_user') : t('admin.delete_user_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
