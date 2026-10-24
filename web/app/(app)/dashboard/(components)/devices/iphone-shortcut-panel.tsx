'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, ExternalLink, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiEndpoints } from '@/config/api'
import { Routes } from '@/config/routes'
import httpBrowserClient from '@/lib/httpBrowserClient'
import { queryKeys } from '@/lib/api/query-keys'
import { API_BASE_URL } from '../../messaging/(components)/api-guide/snippets'

type RegisteredDevice = { _id: string; name?: string }

// The values the Shortcut needs, each with its own copy button.
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className='space-y-1'>
      <p className='label-mono'>{label}</p>
      <div className='flex items-center gap-2 rounded-lg border bg-muted/40 py-1.5 pl-3 pr-1.5'>
        <code className='min-w-0 flex-1 truncate font-mono text-xs'>{value}</code>
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7 shrink-0'
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }}
        >
          {copied ? <Check className='h-3.5 w-3.5' /> : <Copy className='h-3.5 w-3.5' />}
        </Button>
      </div>
    </div>
  )
}

/**
 * Registers an iPhone that sends with an Apple Shortcut, for people with no
 * Mac. The iPhone collects its messages from the server whenever the
 * Shortcut runs, like the Mac relay, so it is registered as a pull device.
 */
export default function IphoneShortcutPanel() {
  const queryClient = useQueryClient()
  const {
    mutate: register,
    data: device,
    isPending,
    error,
  } = useMutation({
    mutationFn: () =>
      httpBrowserClient
        .post(ApiEndpoints.gateway.registerDevice(), {
          transport: 'pull',
          brand: 'Apple',
          manufacturer: 'Apple',
          model: 'iPhone',
          name: 'iPhone (Shortcut)',
          os: 'iOS',
          // Unique per registration, so each iPhone is its own device
          buildId: `shortcut-${crypto.randomUUID()}`,
          appVersionName: 'Shortcut',
          appVersionCode: 1,
        })
        .then((res) => res.data.data as RegisteredDevice),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.devices })
    },
  })

  if (!device) {
    return (
      <div className='space-y-4 text-left text-sm text-muted-foreground'>
        <p>
          No Mac? Your iPhone can send by itself with an Apple Shortcut. Each
          time the Shortcut runs (when you tap it, or at times you schedule),
          it collects the waiting messages and sends them from your number.
        </p>
        <ol className='list-decimal space-y-2 pl-5'>
          <li>Register this iPhone below to get its device ID.</li>
          <li>
            Build the Shortcut on the iPhone by following the{' '}
            <a
              href={Routes.setupShortcut}
              target='_blank'
              rel='noreferrer'
              className='font-medium text-primary underline-offset-4 hover:underline'
            >
              iPhone Shortcut guide
            </a>
            . It takes about 10 minutes, once.
          </li>
        </ol>
        {error && (
          <p className='text-destructive'>
            Could not register the iPhone. Check your connection and try again.
          </p>
        )}
        <Button className='w-full' onClick={() => register()} disabled={isPending}>
          <Smartphone className='h-4 w-4' />
          {isPending ? 'Registering…' : 'Register this iPhone'}
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-4 text-left text-sm'>
      <p className='text-muted-foreground'>
        Registered as <span className='font-medium text-foreground'>{device.name}</span>.
        Put these into the Shortcut, with one of your API keys:
      </p>
      <CopyRow label='Server' value={API_BASE_URL} />
      <CopyRow label='Device ID' value={device._id} />
      <p className='text-xs text-muted-foreground'>
        The server address must be reachable from the iPhone: use your
        computer&apos;s network address instead of localhost (see the guide).
      </p>
      <Button variant='outline' className='w-full' asChild>
        <a href={Routes.setupShortcut} target='_blank' rel='noreferrer'>
          Open the Shortcut guide
          <ExternalLink className='h-3.5 w-3.5' />
        </a>
      </Button>
    </div>
  )
}
