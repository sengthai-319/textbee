'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Laptop } from 'lucide-react'
import { cn } from '@/lib/utils'
import { segmentedItem, segmentedList } from '@/components/ui/tabs'

const options = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
] as const

// Three-way segmented control. It lives in the sidebar footer rather than the
// top bar, where it has room to show all three states at once instead of
// hiding them behind a dropdown.
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // The active theme is unknown during SSR, so selection is only rendered
  // after mount to avoid a hydration mismatch.
  useEffect(() => setMounted(true), [])

  return (
    <div
      className={cn(segmentedList, 'flex')}
      role='group'
      aria-label='Color theme'
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value
        return (
          <button
            key={value}
            type='button'
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={cn(segmentedItem(active), 'flex-1 px-0')}
          >
            <Icon className='h-4 w-4' />
          </button>
        )
      })}
    </div>
  )
}
