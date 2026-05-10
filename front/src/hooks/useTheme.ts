import { useEffect, useState } from 'react'

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // Vérifier d'abord la préférence stockée
    const stored = localStorage.getItem('theme')
    if (stored !== null) {
      return stored === 'dark'
    }
    // Sinon, utiliser la préférence système
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    // Appliquer la classe au root
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
    // Sauvegarder la préférence
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => {
    setIsDark(prev => !prev)
  }

  return { isDark, toggleTheme }
}
