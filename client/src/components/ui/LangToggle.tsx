import { useTranslation } from 'react-i18next'

export default function LangToggle({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? i18n.language

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      <button
        onClick={() => i18n.changeLanguage('en')}
        className={`rounded px-1.5 py-0.5 text-xs font-semibold transition ${
          lang === 'en'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => i18n.changeLanguage('sv')}
        className={`rounded px-1.5 py-0.5 text-xs font-semibold transition ${
          lang === 'sv'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
      >
        SV
      </button>
    </div>
  )
}
