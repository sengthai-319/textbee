import { FAILED_LOGIN_WINDOW_MS, LoginAttempts, MAX_FAILED_LOGINS } from './login-attempts'

describe('LoginAttempts', () => {
  let now = 1_000_000
  const attempts = () => new LoginAttempts(() => now)

  it(`allows ${MAX_FAILED_LOGINS} failures, then makes the account wait`, () => {
    const a = attempts()
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) a.recordFailure('ada@example.com')
    expect(a.retryAfterMs('ada@example.com')).toBe(0)
    a.recordFailure('ADA@example.com ') // same account, other spelling
    expect(a.retryAfterMs('ada@example.com')).toBe(FAILED_LOGIN_WINDOW_MS)
  })

  it('lets the account try again once the window has passed', () => {
    const a = attempts()
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) a.recordFailure('ada@example.com')
    now += FAILED_LOGIN_WINDOW_MS
    expect(a.retryAfterMs('ada@example.com')).toBe(0)
  })

  it('clears on a successful sign-in, and keeps accounts apart', () => {
    const a = attempts()
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) a.recordFailure('ada@example.com')
    expect(a.retryAfterMs('bob@example.com')).toBe(0)
    a.recordSuccess('ada@example.com')
    expect(a.retryAfterMs('ada@example.com')).toBe(0)
  })
})
