'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Brand from './brand'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Routes } from '@/config/routes'
import { Session } from 'next-auth'
import SearchTrigger from '@/app/(app)/dashboard/(components)/search/search-trigger'
import { OPEN_SEARCH_EVENT } from '@/lib/constants'
import { AccountMenuItems, UserAvatar } from './account-menu'
import { cn } from '@/lib/utils'

// Deliberately minimal: identity and brand only. Navigation lives in the
// sidebar (desktop) and the bottom tab bar (mobile), search in the command
// palette (opened from here on mobile), and the theme and help in the account
// menu. In the dashboard this bar is phone-only.
// Nullable: the root layout renders this for signed-out visitors too, and the
// body already guards with session?.user throughout.
export default function AppHeader({
  session: serverSession,
}: {
  session: Session | null
}) {
  const pathname = usePathname()
  // The palette is mounted by the dashboard layout, so only offer search there.
  const inDashboard = pathname?.startsWith(Routes.dashboard) ?? false
  const showMobileSearch = inDashboard
  // The (app) layout that renders this header stays mounted across client
  // navigation, so the server session prop goes stale after an in-app sign in
  // or sign out. The client session follows signIn/signOut immediately.
  const { data: clientSession, status } = useSession()
  const session = status === 'loading' ? serverSession : clientSession

  const isAuthenticated = useMemo(() => session?.user, [session?.user])

  // These pages render their own brand bar.
  const ownFrame = [
    Routes.login,
    Routes.register,
    Routes.resetPassword,
    Routes.verifyEmail,
  ]
  if (pathname && ownFrame.includes(pathname)) return null

  const AuthenticatedMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          aria-label='Account menu'
          className='relative h-11 gap-2 px-1.5 md:h-9'
        >
          <UserAvatar user={session?.user} />
          <span className='hidden text-sm font-medium md:block'>
            {session?.user?.name?.split(' ')[0]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-60' align='end' forceMount>
        {/* Phones have no sidebar, so the help links ride along here. */}
        <AccountMenuItems user={session?.user} withHelp />
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // Only unauthenticated visitors need a sheet: signed-in users already have
  // the bottom tab bar for navigation and the avatar menu for identity.
  const SignedOutMobileMenu = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='ghost' className='md:hidden' size='icon'>
          <Menu className='h-5 w-5' />
          <span className='sr-only'>Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side='right' className='w-[300px] sm:w-[400px]'>
        <nav aria-label='Account' className='flex flex-col gap-4'>
          <Button asChild variant='ghost' className='justify-start'>
            <Link href={Routes.login}>Log in</Link>
          </Button>
          <Button
            asChild
            className='rounded-full bg-primary text-primary-foreground hover:bg-primary/90'
          >
            <Link href={Routes.register}>Get started</Link>
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  )

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-shell/90 backdrop-blur-md supports-[backdrop-filter]:bg-shell/80',
        // On desktop the dashboard's sidebar carries the brand and the
        // account, so this bar is only for phones there.
        inDashboard && 'md:hidden'
      )}
    >
      {/* Gold hairline along the top edge, the one flourish in the chrome */}
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent'
      />
      <div className='flex h-14 items-center gap-2 px-4'>
        <Link href={Routes.landingPage} aria-label='CrossHub home'>
          <Brand className='h-8' />
        </Link>

        <div className='flex flex-1 items-center justify-end gap-2'>
          {isAuthenticated ? (
            <>
              {showMobileSearch && (
                <SearchTrigger
                  variant='icon'
                  className='-mr-2 h-11 w-11 md:hidden'
                  onOpen={() =>
                    window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))
                  }
                />
              )}
              <AuthenticatedMenu />
            </>
          ) : (
            <>
              <div className='hidden md:flex md:items-center md:gap-2'>
                <Button asChild variant='ghost'>
                  <Link href={Routes.login}>Log in</Link>
                </Button>
                <Button
                  asChild
                  className='rounded-full bg-primary text-primary-foreground hover:bg-primary/90'
                >
                  <Link href={Routes.register}>Get started</Link>
                </Button>
              </div>
              <SignedOutMobileMenu />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
