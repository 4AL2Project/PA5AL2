'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const themes = [
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'system', label: 'Systeme', icon: Monitor },
  { value: 'dark', label: 'Sombre', icon: Moon },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="inline-flex h-8 items-center rounded-md bg-muted p-0.5 gap-0.5">
        {themes.map((t) => (
          <div key={t.value} className="h-7 w-20 rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className="inline-flex items-center rounded-md bg-muted p-0.5 gap-0.5">
      {themes.map((t) => {
        const Icon = t.icon
        const isActive = theme === t.value
        return (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={`
              inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium
              transition-all duration-200 cursor-pointer
              ${isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
