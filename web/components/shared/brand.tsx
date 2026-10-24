import { useId } from 'react'
import { cn } from '@/lib/utils'

// The CrossHubSMS mark: a gold cross-G on a charcoal tile, the same artwork as
// the app icon. The tile keeps the mark legible on light and dark surfaces.
export function BrandMark({ className }: { className?: string }) {
  // Each mark on a page needs its own mask id, or the second one renders blank.
  const maskId = `brand-gap-${useId().replace(/:/g, '')}`

  return (
    <svg
      // Cropped to the mark so it stays legible at icon sizes
      viewBox='66 67 366 366'
      aria-hidden='true'
      className={cn('h-7 w-7 shrink-0', className)}
    >
      <rect x='66' y='67' width='366' height='366' rx='84' fill='#2E2E2E' />
      <mask id={maskId}>
        <rect width='500' height='500' fill='#fff' />
        <path d='M226 247 L473 0 H500 V247 Z' fill='#000' />
      </mask>
      <g fill='#C89B3C'>
        <circle
          cx='250'
          cy='233'
          r='119'
          fill='none'
          stroke='#C89B3C'
          strokeWidth='34'
          mask={`url(#${maskId})`}
        />
        <rect x='159' y='212' width='107' height='35' />
        <rect x='277' y='212' width='74' height='35' />
        <rect x='234' y='140' width='32' height='263' />
      </g>
    </svg>
  )
}

export function BrandName({ className }: { className?: string }) {
  return (
    <span className={cn('font-semibold tracking-tight', className)}>
      CrossHub<span className='text-primary'>SMS</span>
    </span>
  )
}

export default function Brand({
  className,
  markClassName,
}: {
  className?: string
  markClassName?: string
}) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <BrandMark className={markClassName} />
      <BrandName />
    </span>
  )
}
