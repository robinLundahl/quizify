export const COLOR_THEMES = ['sunset', 'forest', 'rose', 'peach']

const THEME_CHROME_COLORS: Record<string, string> = {
  light: '#ffffff',
  dark: '#111827',
  sunset: '#5c53a5',
  forest: '#1d4f60',
  rose: '#672044',
  peach: '#ffa679',
}

export function applyTheme(theme: string) {
  const root = document.documentElement
  root.classList.remove('dark', ...COLOR_THEMES.map(t => `theme-${t}`))
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (COLOR_THEMES.includes(theme)) {
    root.classList.add('dark', `theme-${theme}`)
  }

  // Keep iOS Safari browser chrome (status bar + address bar) in sync with theme
  const color = THEME_CHROME_COLORS[theme] ?? '#111827'
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = color
}
