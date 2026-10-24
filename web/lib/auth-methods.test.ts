import { afterEach, describe, expect, it } from 'vitest'
import { getAuthMethods } from './auth-methods'
import { signInErrorMessage } from '@/app/(app)/(auth)/(components)/sign-in-error'

const env = { ...process.env }
afterEach(() => {
  process.env = { ...env }
})

const withEnv = (vars: Record<string, string>) => {
  process.env = { ...env, OIDC_ISSUER: '', OIDC_CLIENT_ID: '', OIDC_CLIENT_SECRET: '', ...vars }
}

const oidc = {
  OIDC_ISSUER: 'https://auth.example/application/o/crosshub/',
  OIDC_CLIENT_ID: 'crosshub',
  OIDC_CLIENT_SECRET: 'secret',
}

describe('getAuthMethods', () => {
  it('offers email and password only, by default', () => {
    withEnv({})
    expect(getAuthMethods()).toEqual({ oidc: null, passwordLogin: true, registration: true })
  })

  it('offers single sign-on once issuer, client id and secret are all set', () => {
    withEnv({ OIDC_ISSUER: oidc.OIDC_ISSUER, OIDC_CLIENT_ID: 'crosshub' })
    expect(getAuthMethods().oidc).toBeNull()

    withEnv({ ...oidc, OIDC_NAME: 'Company login' })
    expect(getAuthMethods().oidc).toEqual({ name: 'Company login' })
  })

  it('turns off sign-up together with password sign-in', () => {
    withEnv({ ...oidc, PASSWORD_LOGIN: 'false' })
    expect(getAuthMethods()).toMatchObject({ passwordLogin: false, registration: false })
  })

  it('can close sign-up alone', () => {
    withEnv({ ALLOW_REGISTRATION: 'false' })
    expect(getAuthMethods()).toMatchObject({ passwordLogin: true, registration: false })
  })
})

describe('signInErrorMessage', () => {
  it('explains the API refusals', () => {
    expect(signInErrorMessage('oidc_group_denied')).toMatch(/not in a group/)
    expect(signInErrorMessage('oidc_email_unconfirmed')).toMatch(/already exists/)
  })

  it('falls back for unknown sign-on errors and ignores other params', () => {
    expect(signInErrorMessage('oidc_something_new')).toMatch(/did not complete/)
    expect(signInErrorMessage(null)).toBeNull()
    expect(signInErrorMessage('unrelated')).toBeNull()
  })
})
