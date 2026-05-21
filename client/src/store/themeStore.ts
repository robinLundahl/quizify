import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'sunset' | 'forest' | 'rose' | 'peach' | 'ocean'

export const PRO_ONLY_THEMES: Theme[] = ['sunset', 'forest', 'rose', 'peach', 'ocean']

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: (localStorage.getItem('theme') as Theme) ?? 'forest',
  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    set({ theme })
  },
}))
