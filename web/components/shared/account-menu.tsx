'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { Session } from 'next-auth'
import {
  CircleHelp,
  ExternalLink,
  LifeBuoy,
  LogOut,
  Moon,
  Sun,
  Laptop,
  UserCircle,
} from 'lucide-react'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Routes } from '@/config/routes'
import { cn } from '@/lib/utils'
import { helpLinks } from './help-links'
import { isSupportChatEnabled, openSupportChat } from './support-hq-widget'

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
] as const

export function UserAvatar({
  user,
  className,
}: {
  user?: Session['user']
  className?: string
}) {
  return (
    <Avatar className={cn('h-8 w-8', className)}>
      <AvatarImage src={user?.avatar ?? undefined} alt={user?.name ?? undefined} />
      <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
    </Avatar>
  )
}

/** Theme choice as a radio list, in its own submenu. */
export function ThemeMenuItems() {
  const { theme, setTheme } = useTheme()
  const Current = THEMES.find((t) => t.value === theme)?.icon ?? Moon
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Current className='h-4 w-4' />
        Theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme} aria-label='Color theme'>
          {THEMES.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon className='mr-2 h-4 w-4' />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

/** The setup guides, opened in a new tab. */
export function HelpMenuItems() {
  return (
    <>
      {helpLinks.map(({ label, href, icon: Icon }) => (
        <DropdownMenuItem key={href} asChild>
          <a href={href} target='_blank' rel='noopener noreferrer'>
            <Icon className='h-4 w-4' />
            <span className='flex-1'>{label}</span>
            <ExternalLink className='h-3 w-3 text-muted' />
          </a>
        </DropdownMenuItem>
      ))}
      {isSupportChatEnabled() && (
        <DropdownMenuItem onClick={openSupportChat}>
          <LifeBuoy className='h-4 w-4' />
          Help & support
        </DropdownMenuItem>
      )}
    </>
  )
}

/**
 * Account menu body, shared by the sidebar (desktop) and the header avatar
 * (mobile). Mobile has no sidebar, so it also carries the help links there.
 */
export function AccountMenuItems({
  user,
  withHelp = false,
}: {
  user?: Session['user']
  withHelp?: boolean
}) {
  const router = useRouter()
  return (
    <>
      <DropdownMenuLabel className='flex flex-col gap-0.5 py-2 text-sm font-normal text-foreground'>
        <span className='truncate font-medium'>{user?.name}</span>
        <span className='truncate text-xs text-muted'>{user?.email}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href='/dashboard/account/profile'>
          <UserCircle className='h-4 w-4' />
          Account settings
        </Link>
      </DropdownMenuItem>
      <ThemeMenuItems />
      {withHelp && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CircleHelp className='h-4 w-4' />
            Help & guides
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className='w-56'>
            <HelpMenuItems />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          signOut()
          router.push(Routes.login)
        }}
        className='text-danger focus:text-danger'
      >
        <LogOut className='h-4 w-4' />
        Log out
      </DropdownMenuItem>
    </>
  )
}
