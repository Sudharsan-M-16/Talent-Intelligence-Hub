import { create } from 'zustand'

interface ThemeStore {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('tih-theme') as 'light' | 'dark' | null
    if (stored) return stored
  }
  // Default strictly to the premium dark aesthetic
  return 'dark'
}

export const useThemeStore = create<ThemeStore>()((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('tih-theme', newTheme)
    return { theme: newTheme }
  }),
  setTheme: (theme) => {
    localStorage.setItem('tih-theme', theme)
    set({ theme })
  },
}))
