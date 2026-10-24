'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { NotificationProvider } from '@/components/notifications/notification-provider'
import { NotificationTileStack } from '@/components/notifications/notification-tile-stack'
import { NotificationModalHost } from '@/components/notifications/notification-modal-host'
import BreadcrumbNav from './(components)/breadcrumb-nav'
import { buildBreadcrumbs } from './(components)/breadcrumbs'
import Sidebar from './(components)/sidebar'
import CommandMenu from './(components)/search/command-menu'
import SearchTrigger from './(components)/search/search-trigger'
import {
  isNavItemActive,
  mobileNavItems,
  type NavItem,
} from './(components)/nav-items'
import { cn } from '@/lib/utils'
import { CONTENT_COLUMN } from '@/lib/layout'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  // Owned here, not inside the palette, so both the sidebar trigger (desktop)
  // and the app header search button (mobile) open the same dialog.
  const [searchOpen, setSearchOpen] = useState(false)
  const hasTrail = buildBreadcrumbs(pathname).length > 1
  const [collapsed, toggleCollapsed] = useSidebarCollapsed()

  return (
    // One feed query, shared by the tile slot and the modal host, so they cannot
    // disagree about which implementation is live.
    <NotificationProvider>
    <div className='min-h-svh'>
      {/* Visible only on focus. Without it, keyboard users tab through the
          whole sidebar on every page before reaching the content. */}
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
      >
        Skip to content
      </a>
      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} />

      <Sidebar
        collapsed={collapsed}
        pathname={pathname}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* Main content, offset for the fixed sidebar on desktop. */}
      <div
        className={cn(
          'min-h-svh pb-16 transition-[padding] duration-200 md:pb-0',
          collapsed ? 'md:pl-[4.5rem]' : 'md:pl-60'
        )}
      >
        {/* One centered column with one gutter, so the breadcrumb, banners
            and page content all share a left edge. */}
        <div className={CONTENT_COLUMN}>
          {/* The sidebar toggle sits beside the breadcrumb, where the page
              starts. On phones there is no sidebar, so the row only shows
              when there is a trail to show. */}
          <div
            className={cn(
              'items-center gap-2 md:flex md:h-14',
              hasTrail ? 'flex pt-6 sm:pt-8 md:pt-0' : 'hidden'
            )}
          >
            <button
              type='button'
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              className='-ml-2 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-default hover:text-foreground focus-visible:status-focused md:inline-flex'
            >
              {collapsed ? (
                <PanelLeftOpen className='h-[18px] w-[18px] stroke-[1.75]' />
              ) : (
                <PanelLeftClose className='h-[18px] w-[18px] stroke-[1.75]' />
              )}
            </button>
            {hasTrail && (
              <span aria-hidden className='hidden h-4 w-px bg-separator md:block' />
            )}
            <BreadcrumbNav className='pt-0 sm:pt-0' />
          </div>
          <NotificationTileStack />
          <main id='main-content' tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom tab bar (max 4 items; the rest are desktop/palette only). */}
      <nav
        aria-label='Primary (mobile)'
        className='fixed inset-x-0 bottom-0 z-40 border-t border-border bg-shell/95 backdrop-blur supports-[backdrop-filter]:bg-shell/85 md:hidden'
      >
        <div className='flex h-16 items-center justify-around'>
          {mobileNavItems.map((item) => (
            <MobileNavLink
              key={item.href}
              item={item}
              isActive={isNavItemActive(item, pathname)}
            />
          ))}
        </div>
      </nav>

      <NotificationModalHost />
    </div>
    </NotificationProvider>
  )
}

const COLLAPSED_KEY = 'crosshub:sidebar-collapsed'
const COLLAPSED_EVENT = 'crosshub:sidebar-collapsed-change'

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    // Storage can be blocked (private mode); the sidebar just starts open.
    return false
  }
}

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener(COLLAPSED_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(COLLAPSED_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

// Remembered per browser. The server render (and so hydration) is always
// expanded; the saved choice applies right after.
function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    readCollapsed,
    () => false
  )
  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, readCollapsed() ? '0' : '1')
    } catch {}
    window.dispatchEvent(new Event(COLLAPSED_EVENT))
  }, [])
  return [collapsed, toggle]
}

function MobileNavLink({
  item,
  isActive,
}: {
  item: NavItem
  isActive: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      prefetch
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors',
        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className='h-5 w-5 stroke-[1.75]' />
      <span>{item.label}</span>
    </Link>
  )
}
