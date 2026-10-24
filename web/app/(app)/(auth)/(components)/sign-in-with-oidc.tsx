'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Routes } from '@/config/routes'
import { authButtonClass } from './auth-styles'

/** Starts single sign-on: off to the provider (Authentik), then back here. */
export default function SignInWithOidc({
  name,
  redirect,
  primary,
}: {
  name: string
  redirect?: string | null
  // The main button when it is the only way in; otherwise one option of two.
  primary: boolean
}) {
  const [pending, setPending] = useState(false)
  return (
    <Button
      type='button'
      variant={primary ? 'default' : 'outline'}
      className={authButtonClass}
      disabled={pending}
      onClick={() => {
        setPending(true)
        void signIn('oidc', {
          callbackUrl: redirect ? decodeURIComponent(redirect) : Routes.dashboard,
        })
      }}
    >
      {pending ? <Loader2 className='animate-spin' /> : <KeyRound />}
      Continue with {name}
    </Button>
  )
}
