import { AlertCircle } from 'lucide-react'

// Why single sign-on failed, from the ?error= the sign-in callback or
// NextAuth adds. The API's codes are prefixed oidc_; the rest are NextAuth's.
const MESSAGES: Record<string, string> = {
  oidc_group_denied:
    'Your account is not in a group that is allowed to use CrossHub. Ask the administrator to add you.',
  oidc_signup_closed:
    'You do not have a CrossHub account yet, and new accounts are not created automatically. Ask the administrator.',
  oidc_email_unconfirmed:
    'An account with your email already exists, but your identity provider did not confirm the email, so it was not linked.',
  oidc_no_email:
    'Your identity provider did not share an email address. The administrator needs to add the email scope.',
  oidc_invalid_token: 'The sign-in could not be verified. Please try again.',
  oidc_discovery_failed:
    'CrossHub could not reach the identity provider. Check that the server can reach it.',
  oidc_not_configured: 'Single sign-on is not set up on this server.',
  OAuthSignin: 'Could not start single sign-on. Check the provider settings.',
  OAuthCallback: 'The identity provider sent back an answer CrossHub could not use. Please try again.',
  AccessDenied: 'Sign-in was cancelled or refused.',
}

export function signInErrorMessage(code: string | null): string | null {
  if (!code) return null
  return MESSAGES[code] ?? (code.startsWith('oidc_') || code.startsWith('OAuth')
    ? 'Single sign-on did not complete. Please try again.'
    : null)
}

export default function SignInError({ message }: { message: string }) {
  return (
    <div role='alert' className='flex gap-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm'>
      <AlertCircle className='mt-0.5 size-4 shrink-0 text-danger' />
      <p className='text-foreground'>{message}</p>
    </div>
  )
}
