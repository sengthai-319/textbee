// Failed password sign-ins, counted per account.
//
// Per-IP limits can't stop password guessing here on their own: dashboard
// logins reach the API from the dashboard's server, so every visitor shares
// that address, and a direct attacker can spread across many addresses. A
// cap per account bounds the guesses at any one password, wherever they
// come from. Held in memory: a restart clears it, which is acceptable for a
// limit measured in minutes.

export const MAX_FAILED_LOGINS = 10
export const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000
const MAX_TRACKED = 10_000

type Entry = { failures: number; firstAt: number }

export class LoginAttempts {
  private readonly entries = new Map<string, Entry>()

  constructor(private readonly now: () => number = Date.now) {}

  private key(email: string) {
    return email.trim().toLowerCase()
  }

  private live(email: string): Entry | undefined {
    const entry = this.entries.get(this.key(email))
    if (entry && this.now() - entry.firstAt >= FAILED_LOGIN_WINDOW_MS) {
      this.entries.delete(this.key(email))
      return undefined
    }
    return entry
  }

  /** Milliseconds until this account may try again, or 0 when it may now. */
  retryAfterMs(email: string): number {
    const entry = this.live(email)
    if (!entry || entry.failures < MAX_FAILED_LOGINS) return 0
    return entry.firstAt + FAILED_LOGIN_WINDOW_MS - this.now()
  }

  recordFailure(email: string) {
    const entry = this.live(email)
    if (entry) {
      entry.failures += 1
      return
    }
    if (this.entries.size >= MAX_TRACKED) {
      // Oldest first: Map keeps insertion order.
      const oldest = this.entries.keys().next().value
      if (oldest !== undefined) this.entries.delete(oldest)
    }
    this.entries.set(this.key(email), { failures: 1, firstAt: this.now() })
  }

  recordSuccess(email: string) {
    this.entries.delete(this.key(email))
  }
}
