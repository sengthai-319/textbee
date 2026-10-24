import { Routes } from '@/config/routes'
import { ExternalLinks } from '@/config/external-links'
import Link from 'next/link'
import { BrandMark } from './brand'
import { CONTENT_COLUMN } from '@/lib/layout'
import { cn } from '@/lib/utils'

// A single slim bar: brand on the left, the setup docs on the right.
const links = [
  { label: 'Setup guide', href: Routes.quickstart },
  { label: 'Android', href: Routes.downloadAndroidApp },
  { label: 'iPhone', href: Routes.setupIphone },
  { label: 'GitHub', href: ExternalLinks.github },
]

const linkClass =
  'text-sm text-muted-foreground transition-colors hover:text-foreground'

export default function Footer() {
  return (
    <footer className='border-t border-border bg-shell/60'>
      {/* Left-aligned on mobile: centred links in a single column read as a
          ragged stack with no common edge to scan down. */}
      <div className={cn(CONTENT_COLUMN, 'flex flex-col items-start gap-4 py-5 sm:items-center md:flex-row md:justify-between')}>
        <div className='flex items-center gap-2'>
          <BrandMark className='h-5 w-5' />
          <span className='text-sm text-muted-foreground'>
            © {new Date().getFullYear()} CrossHub
          </span>
        </div>

        {/* Stacked on mobile: wrapped inline links produced a ragged two-line
            block that was hard to scan and gave small tap targets. */}
        <nav
          aria-label='Footer'
          className='flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-5 sm:gap-y-2'
        >
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              target='_blank'
              rel='noopener noreferrer'
              className={linkClass}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
