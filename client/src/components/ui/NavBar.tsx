import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import NavDropdown from './NavDropdown'
import LangToggle from './LangToggle'

export default function NavBar() {
  const { user, isLoading } = useAuth()
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 px-6 py-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" className="text-xl font-black text-indigo-600 hover:opacity-80 transition-opacity">
          QuizCraft
        </Link>
        {!isLoading && (
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <NavDropdown />
              </>
            ) : (
              <>
                <LangToggle />
                <Link
                  to="/login"
                  className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition"
                >
                  {t('nav.signup')}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
