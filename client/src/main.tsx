import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'
import { useThemeStore } from './store/themeStore'

const COLOR_THEMES = ['sunset', 'forest', 'rose', 'peach']

const applyTheme = (theme: string) => {
  const root = document.documentElement
  root.classList.remove('dark', ...COLOR_THEMES.map(t => `theme-${t}`))
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (COLOR_THEMES.includes(theme)) {
    root.classList.add('dark', `theme-${theme}`)
  }
}
applyTheme(useThemeStore.getState().theme)
useThemeStore.subscribe((state) => applyTheme(state.theme))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
