'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import type { RateLimitErrorData } from '@/lib/utils/errorHandler'

interface RateLimitErrorProps {
  errorData?: RateLimitErrorData
  variant?: 'alert' | 'inline'
  className?: string
}

const FALLBACK_MESSAGE = 'Too many requests.'
const RETRY_HINT = 'Wait a moment and try again.'

/**
 * Component for displaying rate limit (429) errors
 */
export function RateLimitError({
  errorData,
  variant = 'alert',
  className,
}: RateLimitErrorProps) {
  const message = errorData?.message || FALLBACK_MESSAGE

  if (variant === 'inline') {
    return (
      <div className={`flex flex-col gap-1 ${className || ''}`}>
        <p className="text-sm text-destructive">{message}</p>
        <p className="text-xs text-muted-foreground">{RETRY_HINT}</p>
      </div>
    )
  }

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Slow down</AlertTitle>
      <AlertDescription className="mt-2 flex flex-col gap-1">
        <p>{message}</p>
        <p className="text-xs text-muted-foreground">{RETRY_HINT}</p>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Formats a rate limit error message for use in toast notifications
 * Since toasts can't contain interactive components, this returns a plain message
 */
export function formatRateLimitMessageForToast(
  errorData?: RateLimitErrorData
): string {
  return `${errorData?.message || FALLBACK_MESSAGE} ${RETRY_HINT}`
}
