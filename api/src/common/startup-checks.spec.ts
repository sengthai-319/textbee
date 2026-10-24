import { jwtSecretProblem, trustedProxyHops } from './startup-checks'

describe('jwtSecretProblem', () => {
  it('rejects a missing secret', () => {
    expect(jwtSecretProblem(undefined)).toMatch(/not set/)
    expect(jwtSecretProblem('   ')).toMatch(/not set/)
  })

  it('rejects the example value from .env.example', () => {
    expect(jwtSecretProblem('secret')).toMatch(/example/)
    expect(jwtSecretProblem('SECRET')).toMatch(/example/)
  })

  it('rejects an example line read with its inline comment', () => {
    expect(
      jwtSecretProblem('secret # change this to a secure random string'),
    ).toMatch(/spaces/)
  })

  it('rejects a short secret', () => {
    expect(jwtSecretProblem('a'.repeat(31))).toMatch(/too short/)
  })

  it('accepts a generated secret', () => {
    // openssl rand -hex 32
    expect(jwtSecretProblem('9f'.repeat(32))).toBeUndefined()
  })
})

describe('trustedProxyHops', () => {
  it('trusts nothing by default, so a sent X-Forwarded-For is ignored', () => {
    expect(trustedProxyHops({})).toBe(0)
  })

  it('reads TRUST_PROXY_HOPS', () => {
    expect(trustedProxyHops({ TRUST_PROXY_HOPS: '2' })).toBe(2)
  })

  it('ignores a value that is not a positive whole number', () => {
    expect(trustedProxyHops({ TRUST_PROXY_HOPS: 'yes' })).toBe(0)
    expect(trustedProxyHops({ TRUST_PROXY_HOPS: '-1' })).toBe(0)
  })

  it('trusts one hop behind Cloudflare', () => {
    expect(trustedProxyHops({ TRUSTED_PROXY: 'cloudflare' })).toBe(1)
  })
})
