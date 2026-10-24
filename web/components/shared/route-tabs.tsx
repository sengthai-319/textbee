'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { segmentedItem, segmentedList } from '@/components/ui/tabs'

export type RouteTab = {
  href: string
  label: string
  // Exact-match only (used for index routes like /dashboard/messaging so they
  // don't stay active on sibling subroutes).
  exact?: boolean
}

function isTabActive(tab: RouteTab, pathname: string): boolean {
  if (tab.exact) return pathname === tab.href
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`)
}

// Link-based segmented control: tabs are real routes, so the active tab
// survives refresh and deep links are shareable. Mobile: horizontally
// scrollable pills; the active pill scrolls into view on load. Links opt into
// full prefetch because these routes are dynamic (session cookie in the app
// layout), which the router's default prefetch skips.
export default function RouteTabs({
  tabs,
  className,
}: {
  tabs: RouteTab[]
  className?: string
}) {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement | null>(null)
  const activeRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    // Deep links must land with the selected pill visible on small screens.
    // Strip only: scrollIntoView also scrolled the page past the breadcrumbs.
    const nav = navRef.current
    const active = activeRef.current
    if (!nav || !active) return
    const navBox = nav.getBoundingClientRect()
    const activeBox = active.getBoundingClientRect()
    nav.scrollLeft +=
      activeBox.left + activeBox.width / 2 - (navBox.left + navBox.width / 2)
  }, [pathname])

  return (
    <nav
      ref={navRef}
      className={cn(
        segmentedList,
        'overflow-x-auto',
        'scrollbar-none w-full sm:w-fit',
        className
      )}
      aria-label='Section navigation'
    >
      {tabs.map((tab) => {
        const active = isTabActive(tab, pathname)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch
            ref={active ? activeRef : undefined}
            aria-current={active ? 'page' : undefined}
            className={segmentedItem(active)}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
