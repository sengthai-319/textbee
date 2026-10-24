import { createServer, Server } from 'http'
import { AddressInfo } from 'net'
import { SignJWT, exportJWK, generateKeyPair, type KeyLike } from 'jose'
import { OidcError, OidcVerifier, oidcSettings, passwordAuthSettings } from './oidc'

// A minimal provider: discovery document plus a key set, on a local port.
// jose fetches the keys over HTTP itself, so the test serves them for real.
async function startProvider() {
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' }
  let issuer = ''
  const server: Server = createServer((req, res) => {
    res.setHeader('content-type', 'application/json')
    if (req.url?.endsWith('/.well-known/openid-configuration')) {
      res.end(JSON.stringify({ issuer, jwks_uri: `${issuer}jwks` }))
    } else if (req.url?.endsWith('/jwks')) {
      res.end(JSON.stringify({ keys: [jwk] }))
    } else {
      res.statusCode = 404
      res.end('{}')
    }
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  // Authentik's issuer ends in a slash, so the test's does too.
  issuer = `http://127.0.0.1:${port}/application/o/crosshub/`
  return { server, issuer, privateKey }
}

const sign = (
  key: KeyLike | Uint8Array,
  claims: Record<string, unknown>,
  { issuer, audience, alg = 'RS256', exp = '5m' }: { issuer: string; audience: string; alg?: string; exp?: string | number },
) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg, kid: 'k1' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(String(claims.sub ?? 'user-123'))
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key)

describe('OidcVerifier', () => {
  let provider: Awaited<ReturnType<typeof startProvider>>
  const clientId = 'crosshub-client'

  beforeAll(async () => {
    provider = await startProvider()
  })
  afterAll(() => provider.server.close())

  const verifier = (extra: Record<string, string> = {}) =>
    new OidcVerifier(
      oidcSettings({ OIDC_ISSUER: provider.issuer, OIDC_CLIENT_ID: clientId, ...extra }),
    )

  it('accepts a token signed by the provider for this client', async () => {
    const token = await sign(
      provider.privateKey,
      { sub: 'user-123', email: 'Ada@Example.com', email_verified: true, name: 'Ada', groups: ['crosshub'] },
      { issuer: provider.issuer, audience: clientId },
    )

    await expect(verifier().verify(token)).resolves.toEqual({
      issuer: provider.issuer,
      subject: 'user-123',
      email: 'ada@example.com',
      emailVerified: true,
      name: 'Ada',
      picture: undefined,
      groups: ['crosshub'],
    })
  })

  it('rejects a token issued for another client', async () => {
    const token = await sign(provider.privateKey, {}, { issuer: provider.issuer, audience: 'other-app' })
    await expect(verifier().verify(token)).rejects.toMatchObject({ code: 'invalid_token' })
  })

  it('rejects a token from another issuer', async () => {
    const token = await sign(provider.privateKey, {}, { issuer: 'https://evil.example/', audience: clientId })
    await expect(verifier().verify(token)).rejects.toMatchObject({ code: 'invalid_token' })
  })

  it('rejects a token signed by a different key', async () => {
    const { privateKey: stranger } = await generateKeyPair('RS256')
    const token = await sign(stranger, {}, { issuer: provider.issuer, audience: clientId })
    await expect(verifier().verify(token)).rejects.toMatchObject({ code: 'invalid_token' })
  })

  it('rejects an expired token', async () => {
    const token = await sign(provider.privateKey, {}, {
      issuer: provider.issuer,
      audience: clientId,
      exp: Math.floor(Date.now() / 1000) - 3600,
    })
    await expect(verifier().verify(token)).rejects.toMatchObject({ code: 'invalid_token' })
  })

  it('accepts a client-secret (HS256) token only when the API has the secret', async () => {
    const secret = 'a-long-client-secret-from-authentik'
    const token = await sign(new TextEncoder().encode(secret), { email: 'ada@example.com' }, {
      issuer: provider.issuer,
      audience: clientId,
      alg: 'HS256',
    })

    await expect(verifier().verify(token)).rejects.toMatchObject({ code: 'invalid_token' })
    await expect(verifier({ OIDC_CLIENT_SECRET: secret }).verify(token)).resolves.toMatchObject({
      subject: 'user-123',
    })
  })

  it('reports an unreachable provider as a discovery failure', async () => {
    const offline = new OidcVerifier(
      oidcSettings({ OIDC_ISSUER: 'http://127.0.0.1:1/', OIDC_CLIENT_ID: clientId }),
    )
    await expect(offline.verify('a.b.c')).rejects.toBeInstanceOf(OidcError)
    await expect(offline.verify('a.b.c')).rejects.toMatchObject({ code: 'discovery_failed' })
  })
})

describe('settings', () => {
  it('is off until an issuer and client id are set', () => {
    expect(oidcSettings({}).enabled).toBe(false)
    expect(oidcSettings({ OIDC_ISSUER: 'https://auth.example/' }).enabled).toBe(false)
    expect(
      oidcSettings({ OIDC_ISSUER: 'https://auth.example/', OIDC_CLIENT_ID: 'x' }).enabled,
    ).toBe(true)
  })

  it('reads the allowed groups as a comma list', () => {
    expect(oidcSettings({ OIDC_ALLOWED_GROUPS: ' crosshub , admins,' }).allowedGroups).toEqual([
      'crosshub',
      'admins',
    ])
  })

  it('keeps password sign-in and sign-up on unless turned off', () => {
    expect(passwordAuthSettings({})).toEqual({ passwordLogin: true, registration: true })
    expect(passwordAuthSettings({ PASSWORD_LOGIN: 'false', ALLOW_REGISTRATION: 'no' })).toEqual({
      passwordLogin: false,
      registration: false,
    })
  })
})
