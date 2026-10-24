import { Skeleton } from '@/components/ui/skeleton'
import { FORM_WIDTH } from '@/lib/layout'
import { cn } from '@/lib/utils'

// Shown in the content slot while a tab's page segment streams in; the
// section header and tabs from the layout stay mounted above it. FORM_WIDTH
// matches the account pages (billing, profile, security, support).
export default function Loading() {
  return (
    <div role='status' className={cn(FORM_WIDTH, 'space-y-4')}>
      <span className='sr-only'>Loading</span>
      <Skeleton className='h-8 w-48' />
      <Skeleton className='h-28 w-full rounded-lg' />
      <Skeleton className='h-28 w-full rounded-lg' />
    </div>
  )
}
