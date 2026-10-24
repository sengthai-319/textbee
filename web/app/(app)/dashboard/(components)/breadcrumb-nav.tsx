'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { buildBreadcrumbs } from './breadcrumbs'

export default function BreadcrumbNav() {
  const crumbs = buildBreadcrumbs(usePathname())
  // A lone crumb only repeats the page the sidebar already highlights
  if (crumbs.length <= 1) return null

  return (
    <nav aria-label='Breadcrumb' className='pt-6 sm:pt-8'>
      <ol className='flex min-w-0 items-center gap-1 text-sm text-muted-foreground'>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <li
              key={crumb.href + crumb.label}
              className='flex min-w-0 items-center gap-1'
            >
              {index > 0 && (
                <ChevronRight
                  className='h-3.5 w-3.5 shrink-0 opacity-60'
                  aria-hidden
                />
              )}
              {isLast ? (
                <span
                  aria-current='page'
                  className='truncate font-medium text-foreground'
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className='truncate rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
