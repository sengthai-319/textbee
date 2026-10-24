'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import AuthShell from '../(components)/auth-shell'
import RegisterForm from '../(components)/register-form'
import SignInWithOidc from '../(components)/sign-in-with-oidc'
import { Button } from '@/components/ui/button'
import { Routes } from '@/config/routes'
import type { AuthMethods } from '@/lib/auth-methods'

export default function RegisterView({ methods }: { methods: AuthMethods }) {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const loginHref = {
    pathname: Routes.login,
    query: { redirect: redirect ? decodeURIComponent(redirect) : undefined },
  }

  if (!methods.registration) {
    return (
      <AuthShell
        title='Sign-up is closed'
        description={
          methods.oidc
            ? `Accounts on this server come from ${methods.oidc.name}. Sign in with it to get started.`
            : 'Ask the administrator of this server for an account.'
        }
        switchPrompt='Already have an account?'
        switchLabel='Log in'
        switchHref={loginHref}
        showGoogle={false}
        before={
          methods.oidc ? (
            <SignInWithOidc name={methods.oidc.name} redirect={redirect} primary />
          ) : undefined
        }
      >
        <Button variant='outline' asChild>
          <Link href={loginHref}>Back to log in</Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title='Create your account'
      description='Send SMS from your own Android phone or iPhone, on your own server.'
      switchPrompt='Already have an account?'
      switchLabel='Log in'
      switchHref={loginHref}
      className='max-w-[440px]'
      before={
        methods.oidc ? (
          <SignInWithOidc name={methods.oidc.name} redirect={redirect} primary={false} />
        ) : undefined
      }
      separated={!!methods.oidc}
    >
      <RegisterForm />
    </AuthShell>
  )
}
