import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import NavBar from '../components/ui/NavBar'

export default function Landing() {
  const { user, isLoading } = useAuth()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <main className="mx-auto max-w-5xl px-6 py-24 flex flex-col items-center text-center">
        <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 mb-4">
          {t('landing.headline')}
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-xl">
          {t('landing.subheadline')}
        </p>
        {!isLoading && (
          <div className="flex flex-wrap gap-3 justify-center">
            {user ? (
              <Link
                to="/dashboard"
                className="bg-indigo-600 text-white rounded-lg px-6 py-3 text-sm font-medium hover:bg-indigo-700 transition"
              >
                {t('nav.dashboard')}
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="bg-indigo-600 text-white rounded-lg px-6 py-3 text-sm font-medium hover:bg-indigo-700 transition"
                >
                  {t('landing.get_started')}
                </Link>
                <Link
                  to="/login"
                  className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg px-6 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  {t('nav.login')}
                </Link>
              </>
            )}
          </div>
        )}
        <div className="mt-8">
          <Link to="/join" className="text-sm text-indigo-600 hover:underline">
            {t('landing.join_game')}
          </Link>
        </div>
      </main>
    </div>
  )
}
