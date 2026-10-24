// Which ways to sign in this server offers. Read on the server at request
// time (never NEXT_PUBLIC_*, which is frozen into the build), from the same
// variables the API enforces, so the forms shown match what the API accepts.
// docker compose passes them to both containers from the top-level .env.

export type AuthMethods = {
  // Single sign-on through an OpenID Connect provider such as Authentik.
  oidc: { name: string } | null
  passwordLogin: boolean
  registration: boolean
}

const flag = (value: string | undefined, fallback: boolean) => {
  const v = value?.trim().toLowerCase()
  if (!v) return fallback
  return !['false', '0', 'no', 'off'].includes(v)
}

export function oidcClientConfig() {
  const issuer = process.env.OIDC_ISSUER?.trim()
  const clientId = process.env.OIDC_CLIENT_ID?.trim()
  const clientSecret = process.env.OIDC_CLIENT_SECRET?.trim()
  if (!issuer || !clientId || !clientSecret) return null
  return {
    issuer,
    clientId,
    clientSecret,
    name: process.env.OIDC_NAME?.trim() || 'Authentik',
  }
}

export function getAuthMethods(): AuthMethods {
  const oidc = oidcClientConfig()
  const passwordLogin = flag(process.env.PASSWORD_LOGIN, true)
  return {
    oidc: oidc ? { name: oidc.name } : null,
    // Never lock everyone out: with no provider configured, the password
    // form stays even if PASSWORD_LOGIN=false (the API still refuses it, and
    // the page says why).
    passwordLogin,
    registration: passwordLogin && flag(process.env.ALLOW_REGISTRATION, true),
  }
}
