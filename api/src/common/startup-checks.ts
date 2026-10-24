// Configuration checks run before the API starts. Kept apart from main.ts so
// they can be unit tested without booting the app.

// Values from examples and tutorials. A secret anyone can look up signs
// login tokens for every account.
const EXAMPLE_SECRETS = new Set([
  'secret',
  'changeme',
  'change-me',
  'your-secret',
  'your_jwt_secret',
  'jwt_secret',
])

const MIN_SECRET_LENGTH = 32

/** Why JWT_SECRET is unusable, or undefined when it is fine. */
export function jwtSecretProblem(secret: string | undefined): string | undefined {
  const value = secret?.trim() ?? ''
  if (!value) return 'JWT_SECRET is not set.'
  if (EXAMPLE_SECRETS.has(value.toLowerCase())) {
    return 'JWT_SECRET is still the example value.'
  }
  // A generated secret has no spaces. One that does is usually an example
  // line read with its inline comment ("secret # change this ..."), which is
  // long enough to pass the length check below.
  if (/\s/.test(value)) {
    return 'JWT_SECRET contains spaces (an inline comment?).'
  }
  if (value.length < MIN_SECRET_LENGTH) {
    return `JWT_SECRET is too short (${value.length} characters, need at least ${MIN_SECRET_LENGTH}).`
  }
  return undefined
}

/**
 * How many reverse proxies to trust for the client address: TRUST_PROXY_HOPS,
 * or 1 when TRUSTED_PROXY names one (cloudflare). 0 means the API is reached
 * directly and forwarded headers are ignored.
 */
export function trustedProxyHops(env: Record<string, string | undefined>): number {
  const raw = env.TRUST_PROXY_HOPS?.trim()
  if (raw) {
    const hops = Number(raw)
    return Number.isInteger(hops) && hops > 0 ? hops : 0
  }
  return env.TRUSTED_PROXY ? 1 : 0
}
