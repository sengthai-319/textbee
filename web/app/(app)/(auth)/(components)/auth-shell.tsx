import Brand from '@/components/shared/brand'
import Link, { type LinkProps } from 'next/link'

import { Card, CardContent } from '@/components/ui/card'
import { Routes } from '@/config/routes'
import { cn } from '@/lib/utils'
import { CONTENT_COLUMN } from '@/lib/layout'

import LoginWithGoogle from './login-with-google'

type AuthShellProps = {
  title: string
  description: string
  switchPrompt: string
  switchLabel: string
  switchHref: LinkProps['href']
  className?: string
  children: React.ReactNode
}

// The card every sign-in page uses, so login, register, password reset and
// email verification read as one flow.
export const AUTH_CARD =
  'w-full max-w-[420px] p-2'

// Page frame for every sign-in route: the logo, an optional prompt on the
// right (below the card on phones), and the card centered on a dotted ground.
// The app header is hidden on these routes.
export function AuthFrame({
  aside,
  children,
}: {
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className='flex min-h-svh flex-col bg-background sm:bg-[radial-gradient(var(--border)_1px,transparent_1px)] sm:[background-size:22px_22px]'>
      {/* Same column as the footer, so the logo and footer share a left edge */}
      <header className={cn(CONTENT_COLUMN, 'flex h-14 items-center justify-between gap-4 sm:h-auto sm:py-5')}>
        <Link href={Routes.landingPage} aria-label='CrossHub home'>
          <Brand className='h-10' />
        </Link>
        {aside && (
          <p className='hidden text-sm text-muted-foreground sm:block'>{aside}</p>
        )}
      </header>

      <div className='flex flex-1 flex-col items-center px-4 pb-10 pt-3 sm:justify-center sm:pt-4'>
        {children}
        {aside && (
          <p className='mt-5 flex min-h-11 items-center gap-1.5 text-[15px] text-muted-foreground sm:hidden'>
            {aside}
          </p>
        )}
      </div>
    </div>
  )
}

// Login and register: the frame with a titled card and optional Google sign-in.
export default function AuthShell({
  title,
  description,
  switchPrompt,
  switchLabel,
  switchHref,
  className,
  children,
}: AuthShellProps) {
  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)

  const switchLink = (
    <Link
      href={switchHref}
      className='font-medium text-primary underline-offset-4 hover:underline'
    >
      {switchLabel}
    </Link>
  )

  return (
    <AuthFrame aside={<>{switchPrompt} {switchLink}</>}>
        <Card className={cn(AUTH_CARD, className)}>
          <CardContent className='flex flex-col gap-5 rounded-xl px-5 py-6 sm:px-7 sm:py-8'>
            <div className='space-y-1.5'>
              <h1 className='text-[26px] font-semibold leading-8 tracking-tight sm:text-2xl'>
                {title}
              </h1>
              <p className='text-[15px] leading-[22px] text-muted-foreground sm:text-sm'>
                {description}
              </p>
            </div>

            {googleEnabled && (
              <>
                <LoginWithGoogle />
                <div className='flex items-center gap-3'>
                  <span className='h-px flex-1 bg-border' />
                  <span className='text-xs text-muted-foreground'>
                    or
                  </span>
                  <span className='h-px flex-1 bg-border' />
                </div>
              </>
            )}

            {children}
          </CardContent>
        </Card>
    </AuthFrame>
  )
}
