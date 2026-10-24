import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * A numbered list of setup steps: each <li> gets a small numbered disc.
 * Shared so every "how to connect" panel reads the same way.
 */
export function Steps({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <ol
      className={cn(
        'space-y-3 text-sm text-muted [counter-reset:step]',
        '[&>li]:relative [&>li]:min-h-6 [&>li]:pl-9 [&>li]:leading-6 [&>li]:[counter-increment:step]',
        "[&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-0 [&>li]:before:flex [&>li]:before:size-6 [&>li]:before:items-center [&>li]:before:justify-center [&>li]:before:rounded-full [&>li]:before:bg-default [&>li]:before:text-xs [&>li]:before:font-semibold [&>li]:before:text-foreground [&>li]:before:content-[counter(step)]",
        className
      )}
    >
      {children}
    </ol>
  )
}
