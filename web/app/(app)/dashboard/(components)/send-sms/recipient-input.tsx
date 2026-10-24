'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { isPlausiblePhone, normalizePhone } from '@/lib/sms'
import { cn } from '@/lib/utils'

// Numbers commit on Enter, comma or blur, and paste splits on separators, so a
// list copied from a spreadsheet becomes chips in one action. Replaces a
// growing stack of full-width inputs, each with its own remove button.
export default function RecipientInput({
  recipients,
  onChange,
  error,
}: {
  recipients: string[]
  onChange: (next: string[]) => void
  error?: string
}) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const commit = (raw: string): boolean => {
    // Split only on unambiguous separators first. Splitting on whitespace up
    // front would shred "+1 (415) 555-0101" into three fragments, since spaces
    // are also formatting inside a single number.
    const candidates = raw
      .split(/[,;\n]+/)
      .map((v) => v.trim())
      .filter(Boolean)
      .flatMap((token) =>
        // Only a token that cannot be one number gets split on whitespace,
        // which is how "+14155550101 +16475550187" becomes two chips.
        isPlausiblePhone(token) ? [token] : token.split(/\s+/).filter(Boolean)
      )

    if (candidates.length === 0) return true

    const accepted: string[] = []
    for (const candidate of candidates) {
      if (!isPlausiblePhone(candidate)) {
        setLocalError(`"${candidate}" does not look like a phone number`)
        return false
      }
      // The API schema accepts digits with an optional leading plus, so
      // formatting is stripped before the value reaches the form.
      const normalized = normalizePhone(candidate)
      if (!recipients.includes(normalized) && !accepted.includes(normalized)) {
        accepted.push(normalized)
      }
    }

    setLocalError(null)
    if (accepted.length) onChange([...recipients, ...accepted])
    return true
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      if (commit(draft)) setDraft('')
      return
    }
    // Backspace on an empty field removes the last chip, as in every other
    // token input people have used.
    if (event.key === 'Backspace' && draft === '' && recipients.length > 0) {
      onChange(recipients.slice(0, -1))
    }
  }

  const remove = (value: string) =>
    onChange(recipients.filter((r) => r !== value))

  const shownError = localError ?? error

  return (
    <div className='space-y-1.5'>
      <Label htmlFor='sms-recipient'>To</Label>

      {/* One box holding the chips and the cursor, so it reads as a single
          field you keep typing into. Clicking anywhere in it focuses the
          input. */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-field border border-field-border bg-field px-2 py-1.5 shadow-field transition-colors focus-within:border-field-border-focus focus-within:status-focused-field md:min-h-9',
          shownError && 'border-danger'
        )}
      >
        {recipients.length > 0 && (
          <ul className='contents' aria-label='Recipients'>
            {recipients.map((recipient) => (
              <li key={recipient}>
                <span className='inline-flex items-center gap-1 rounded-full bg-default py-0.5 pl-2.5 pr-1 text-sm'>
                  {recipient}
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(recipient)
                    }}
                    aria-label={`Remove ${recipient}`}
                    className='rounded-full p-0.5 text-muted transition-colors hover:bg-background hover:text-foreground'
                  >
                    <X className='h-3 w-3' />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <input
          ref={inputRef}
          id='sms-recipient'
          type='tel'
          inputMode='tel'
          // Browsers offer saved phone numbers here; while that list is open,
          // Enter picks a suggestion instead of adding the number typed.
          autoComplete='off'
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (localError) setLocalError(null)
          }}
          onKeyDown={handleKeyDown}
          onPaste={(e) => {
            // A pasted list becomes chips at once, rather than one long
            // string to commit by hand.
            const text = e.clipboardData.getData('text')
            if (/[,;\n]/.test(text)) {
              e.preventDefault()
              if (commit(draft + text)) setDraft('')
            }
          }}
          // Commit on blur too: people type a number then click Send, and
          // losing it silently would be the worst possible outcome.
          onBlur={() => {
            if (commit(draft)) setDraft('')
          }}
          placeholder={recipients.length ? 'Add another number' : '+14155550101'}
          aria-describedby='sms-recipient-hint'
          aria-invalid={shownError ? true : undefined}
          className='h-7 min-w-[10rem] flex-1 bg-transparent px-1 text-base text-field-foreground outline-none placeholder:text-field-placeholder sm:text-sm'
        />
      </div>

      <p id='sms-recipient-hint' className='text-xs text-muted-foreground'>
        Press Enter or comma to add. Paste a list to add several at once.
      </p>

      {shownError && <p className='text-sm text-destructive'>{shownError}</p>}
    </div>
  )
}
