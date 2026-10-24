'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ChevronsUpDown, CircleHelp } from 'lucide-react'
import Brand, { BrandMark } from '@/components/shared/brand'
import {
  AccountMenuItems,
  HelpMenuItems,
  UserAvatar,
} from '@/components/shared/account-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Routes } from '@/config/routes'
import { cn } from '@/lib/utils'
import SearchTrigger from './search/search-trigger'
import { isNavItemActive, navItems, type NavItem } from './nav-items'

export const SIDEBAR_WIDTH = 'w-60'
export const SIDEBAR_RAIL_WIDTH = 'w-[4.5rem]'

/**
 * Desktop sidebar, the full height of the window: brand, search and the
 * sections at the top; help and the signed-in account at the bottom. The
 * page footer and the theme switch used to sit in the corners of the page;
 * they now live in these two menus. Collapsed, it is a rail of icons with
 * their names as tooltips.
 */
export default function Sidebar({
  collapsed,
  pathname,
  onOpenSearch,
}: {
  collapsed: boolean
  pathname: string
  onOpenSearch: () => void
}) {
  const { data: session } = useSession()
  const user = session?.user

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        aria-label='Sidebar'
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-shell transition-[width] duration-200 md:flex',
          collapsed ? SIDEBAR_RAIL_WIDTH : SIDEBAR_WIDTH
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center',
            collapsed ? 'justify-center' : 'px-5'
          )}
        >
          <Link href={Routes.dashboard} aria-label='CrossHub home'>
            {collapsed ? <BrandMark className='h-8 w-8' /> : <Brand className='h-8' />}
          </Link>
        </div>

        <div className={cn('flex-1 overflow-y-auto pb-4', collapsed ? 'px-3' : 'px-4')}>
          <div className='mb-4'>
            {collapsed ? (
              <RailTooltip label='Search (⌘K)'>
                <SearchTrigger
                  variant='icon'
                  className='h-11 w-full rounded-xl'
                  onOpen={onOpenSearch}
                />
              </RailTooltip>
            ) : (
              <SearchTrigger onOpen={onOpenSearch} />
            )}
          </div>
          {/* Distinct labels: several nav landmarks on one page are otherwise
              indistinguishable in a screen reader's landmark list. */}
          <nav className='flex flex-col gap-1' aria-label='Main'>
            {navItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={isNavItemActive(item, pathname)}
              />
            ))}
          </nav>
        </div>

        <div className={cn('flex flex-col gap-1 py-3', collapsed ? 'px-3' : 'px-4')}>
          <DropdownMenu>
            <RailTooltip label='Help & guides' disabled={!collapsed}>
              <DropdownMenuTrigger
                className={cn(rowClass(collapsed), 'text-muted hover:text-foreground')}
              >
                <CircleHelp className='h-[18px] w-[18px] shrink-0 stroke-[1.75]' />
                {!collapsed && <span>Help & guides</span>}
              </DropdownMenuTrigger>
            </RailTooltip>
            <DropdownMenuContent side='right' align='end' sideOffset={12} className='w-60'>
              <DropdownMenuLabel className='text-xs font-medium text-muted'>
                Guides
              </DropdownMenuLabel>
              <HelpMenuItems />
              <DropdownMenuSeparator />
              <DropdownMenuLabel className='text-xs font-normal text-muted'>
                CrossHub · © {new Date().getFullYear()}
              </DropdownMenuLabel>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <RailTooltip label={user?.name ?? 'Account'} disabled={!collapsed}>
              <DropdownMenuTrigger
                aria-label='Account menu'
                className={cn(
                  rowClass(collapsed),
                  'h-auto py-2',
                  collapsed ? 'h-11' : 'gap-3'
                )}
              >
                <UserAvatar user={user} className='h-8 w-8 shrink-0' />
                {!collapsed && (
                  <>
                    <span className='min-w-0 flex-1 text-left'>
                      <span className='block truncate text-sm font-medium text-foreground'>
                        {user?.name}
                      </span>
                      <span className='block truncate text-xs text-muted'>
                        {user?.email}
                      </span>
                    </span>
                    <ChevronsUpDown className='h-4 w-4 shrink-0 text-muted' />
                  </>
                )}
              </DropdownMenuTrigger>
            </RailTooltip>
            <DropdownMenuContent side='right' align='end' sideOffset={12} className='w-60'>
              <AccountMenuItems user={user} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  )
}

// One row style for nav links and the two menu buttons, so the bottom of the
// sidebar lines up with the sections above it.
const rowClass = (collapsed: boolean) =>
  cn(
    'group relative flex h-10 w-full items-center gap-3 rounded-xl text-sm font-medium outline-none transition-colors hover:bg-default focus-visible:status-focused',
    collapsed ? 'justify-center px-0' : 'px-3'
  )

function RailTooltip({
  label,
  disabled = false,
  children,
}: {
  label: string
  disabled?: boolean
  children: React.ReactNode
}) {
  if (disabled) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side='right' sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function SidebarLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem
  isActive: boolean
  collapsed: boolean
}) {
  const Icon = item.icon
  return (
    <RailTooltip label={item.label} disabled={!collapsed}>
      <Link
        href={item.href}
        prefetch
        aria-current={isActive ? 'page' : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={cn(
          rowClass(collapsed),
          isActive
            ? 'bg-default text-foreground'
            : 'text-muted hover:text-foreground'
        )}
      >
        <Icon
          className={cn(
            'h-[18px] w-[18px] shrink-0 stroke-[1.75]',
            isActive && 'text-accent'
          )}
        />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    </RailTooltip>
  )
}
