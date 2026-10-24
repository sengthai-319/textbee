import type { ComponentType, ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  icon?: ComponentType<{ className?: string }>
  actions?: ReactNode
}

/**
 * Section heading shared by the dashboard's route layouts.
 *
 * The same icon plus heading plus description block was written out four
 * times, and community/page.tsx had drifted: it kept an unconditional
 * text-3xl and no mobile padding step while every other section had moved to
 * a responsive size. One definition makes that class of drift impossible.
 */
export default function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: PageHeaderProps) {
  return (
    <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
      <div className='flex items-start gap-3'>
        {Icon && (
          <span className='mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary'>
            <Icon className='h-5 w-5' />
          </span>
        )}
        <div className='space-y-1'>
          <h2 className='text-2xl font-semibold tracking-tight'>{title}</h2>
          {description && (
            <p className='text-sm text-muted-foreground'>{description}</p>
          )}
        </div>
      </div>
      {actions}
    </div>
  )
}
