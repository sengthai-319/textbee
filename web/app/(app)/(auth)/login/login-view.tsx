'use client'

import { useSearchParams } from 'next/navigation'

import AuthShell from '../(components)/auth-shell'
import LoginForm from '../(components)/login-form'
import SignInWithOidc from '../(components)/sign-in-with-oidc'
import SignInError, { signInErrorMessage } from '../(components)/sign-in-error'
import { Routes } from '@/config/routes'
import type { AuthMethods } from '@/lib/auth-methods'

export default function LoginView({ methods }: { methods: AuthMethods }) {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const error = signInErrorMessage(searchParams.get('error'))
  // Password sign-in is only hidden when there is another way in.
  const showPassword = methods.passwordLogin || !methods.oidc

  return (
    <AuthShell
      title='Welcome back'
      description={
        showPassword
          ? 'Log in to manage your devices and messages.'
          : `Sign in with ${methods.oidc!.name} to manage your devices and messages.`
      }
      switchPrompt={methods.registration ? 'New to CrossHub?' : undefined}
      switchLabel={methods.registration ? 'Create an account' : undefined}
      switchHref={{
        pathname: Routes.register,
        query: {
          redirect: redirect ? decodeURIComponent(redirect) : undefined,
        },
      }}
      showGoogle={showPassword}
      before={
        <>
          {error && <SignInError message={error} />}
          {methods.oidc && (
            <SignInWithOidc
              name={methods.oidc.name}
              redirect={redirect}
              primary={!showPassword}
            />
          )}
        </>
      }
      separated={!!methods.oidc && showPassword}
    >
      {showPassword && <LoginForm />}
    </AuthShell>
  )
}
