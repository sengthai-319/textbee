// Sign-in through an OpenID Connect provider such as Authentik.
//
// The dashboard runs the browser side of the flow (NextAuth, authorization
// code with PKCE) and hands the provider's ID token to the API. The API checks
// that token itself against the provider's published keys, so a forged or
// replayed token from anywhere else is refused, then signs the person in.

import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose'

export type OidcSettings = {
  enabled: boolean
  issuer: string
  clientId: string
  clientSecret?: string
  // Members of at least one of these groups may sign in. Empty: anyone the
  // provider lets through (Authentik can also restrict this per application).
  allowedGroups: string[]
  // Create an account on first sign-in. Off: only existing accounts.
  allowSignup: boolean
  // Treat the provider's email as confirmed even when it doesn't say so.
  // Only for a provider you run, whose users cannot pick arbitrary emails.
  trustEmail: boolean
}

const flag = (value: string | undefined, fallback: boolean) => {
  const v = value?.trim().toLowerCase()
  if (!v) return fallback
  return !['false', '0', 'no', 'off'].includes(v)
}

export function oidcSettings(env: Record<string, string | undefined>): OidcSettings {
  const issuer = env.OIDC_ISSUER?.trim() ?? ''
  const clientId = env.OIDC_CLIENT_ID?.trim() ?? ''
  return {
    enabled: !!issuer && !!clientId,
    issuer,
    clientId,
    clientSecret: env.OIDC_CLIENT_SECRET?.trim() || undefined,
    allowedGroups: (env.OIDC_ALLOWED_GROUPS ?? '')
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean),
    allowSignup: flag(env.OIDC_ALLOW_SIGNUP, true),
    trustEmail: flag(env.OIDC_TRUST_EMAIL, false),
  }
}

/** Email and password sign-in and sign-up, which a provider-only setup turns off. */
export function passwordAuthSettings(env: Record<string, string | undefined>) {
  return {
    passwordLogin: flag(env.PASSWORD_LOGIN, true),
    registration: flag(env.ALLOW_REGISTRATION, true),
  }
}

export type OidcIdentity = {
  issuer: string
  subject: string
  email?: string
  emailVerified: boolean
  name?: string
  picture?: string
  groups: string[]
}

export class OidcError extends Error {
  constructor(
    readonly code:
      | 'not_configured'
      | 'invalid_token'
      | 'discovery_failed'
      | 'group_denied'
      | 'signup_closed'
      | 'email_unconfirmed'
      | 'no_email',
    message: string,
  ) {
    super(message)
  }
}

type Discovery = { issuer: string; jwks_uri: string }

const normalize = (url: string) => url.replace(/\/+$/, '')

/**
 * Verifies ID tokens for one provider. Discovery and keys are fetched once
 * and cached; jose refreshes the key set itself when the provider rotates.
 */
export class OidcVerifier {
  private discovery?: Promise<Discovery>
  private jwks?: ReturnType<typeof createRemoteJWKSet>
  private keysRefreshedAt = 0

  constructor(
    private readonly settings: OidcSettings,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private loadDiscovery(): Promise<Discovery> {
    if (!this.discovery) {
      const url = `${normalize(this.settings.issuer)}/.well-known/openid-configuration`
      this.discovery = this.fetchImpl(url)
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const doc = (await res.json()) as Discovery
          if (!doc?.issuer || !doc?.jwks_uri) throw new Error('missing issuer or jwks_uri')
          // The document must describe the issuer we were configured with,
          // or a redirect could swap in someone else's keys.
          if (normalize(doc.issuer) !== normalize(this.settings.issuer)) {
            throw new Error(`issuer mismatch: ${doc.issuer}`)
          }
          return doc
        })
        .catch((e) => {
          this.discovery = undefined // retry on the next sign-in
          throw new OidcError(
            'discovery_failed',
            `Could not read the identity provider's settings from ${url}: ${e.message}`,
          )
        })
    }
    return this.discovery
  }

  async verify(idToken: unknown): Promise<OidcIdentity> {
    if (typeof idToken !== 'string' || !idToken) {
      throw new OidcError('invalid_token', 'Missing ID token')
    }
    const discovery = await this.loadDiscovery()

    let alg: string | undefined
    try {
      alg = decodeProtectedHeader(idToken).alg
    } catch {
      throw new OidcError('invalid_token', 'Malformed ID token')
    }

    const options = {
      issuer: discovery.issuer,
      audience: this.settings.clientId,
      // A minute of slack for clock drift between the two servers.
      clockTolerance: 60,
    }

    let payload: Record<string, unknown>
    try {
      if (alg?.startsWith('HS')) {
        // Authentik signs with the client secret when the provider has no
        // signing key. Only accepted when the API was given that secret.
        if (!this.settings.clientSecret) {
          throw new Error('token is signed with the client secret, but OIDC_CLIENT_SECRET is not set')
        }
        const key = new TextEncoder().encode(this.settings.clientSecret)
        payload = (await jwtVerify(idToken, key, { ...options, algorithms: ['HS256', 'HS384', 'HS512'] })).payload
      } else {
        const algorithms = ['RS256', 'RS384', 'RS512', 'PS256', 'ES256', 'ES384', 'EdDSA']
        const check = () => {
          this.jwks ??= createRemoteJWKSet(new URL(discovery.jwks_uri))
          return jwtVerify(idToken, this.jwks, { ...options, algorithms })
        }
        try {
          payload = (await check()).payload
        } catch (e) {
          // jose refetches keys only for an unknown key id. A provider that
          // replaces a key but keeps its id fails here instead, so drop the
          // cached set and try once more, at most every 30 seconds so forged
          // tokens can't make us hammer the provider.
          const signatureFailed = (e as { code?: string }).code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED'
          if (!signatureFailed || Date.now() - this.keysRefreshedAt < 30_000) throw e
          this.keysRefreshedAt = Date.now()
          this.jwks = undefined
          payload = (await check()).payload
        }
      }
    } catch (e) {
      throw new OidcError('invalid_token', `ID token rejected: ${(e as Error).message}`)
    }

    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
    const groups = Array.isArray(payload.groups)
      ? payload.groups.filter((g): g is string => typeof g === 'string')
      : []
    const subject = str(payload.sub)
    if (!subject) throw new OidcError('invalid_token', 'ID token has no subject')

    return {
      issuer: discovery.issuer,
      subject,
      email: str(payload.email)?.toLowerCase(),
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      name: str(payload.name) ?? str(payload.preferred_username),
      picture: str(payload.picture),
      groups,
    }
  }
}
