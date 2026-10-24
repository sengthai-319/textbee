import { Types } from 'mongoose'
import { MAX_DISPATCH_ATTEMPTS } from './pending-recovery'
import {
  isPullDevice,
  pullClaimLimit,
  pullPendingFilter,
  pullPollCooldownMs,
} from './pull-transport'

describe('pull transport', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('treats only an explicit pull device as one', () => {
    expect(isPullDevice({ transport: 'pull' })).toBe(true)
    expect(isPullDevice({ transport: 'fcm' })).toBe(false)
    expect(isPullDevice({})).toBe(false)
    expect(isPullDevice(null)).toBe(false)
  })

  it('polls every five seconds and claims 25 by default', () => {
    delete process.env.PULL_POLL_COOLDOWN_MS
    delete process.env.PULL_CLAIM_LIMIT
    expect(pullPollCooldownMs()).toBe(5000)
    expect(pullClaimLimit()).toBe(25)
  })

  it('reads the cooldown and claim limit from the environment', () => {
    process.env.PULL_POLL_COOLDOWN_MS = '1000'
    process.env.PULL_CLAIM_LIMIT = '5'
    expect(pullPollCooldownMs()).toBe(1000)
    expect(pullClaimLimit()).toBe(5)
  })

  describe('pending filter', () => {
    const now = new Date('2026-09-20T12:00:00Z')
    const deviceId = new Types.ObjectId().toHexString()
    const filter = pullPendingFilter(deviceId, now) as any

    it('offers waiting outbound messages without the 30 minute push grace', () => {
      expect(filter.type).toBe('SENT')
      expect(filter.device).toEqual(new Types.ObjectId(deviceId))
      expect(filter.status).toEqual({ $in: ['pending', 'unknown'] })
      expect(JSON.stringify(filter)).not.toContain('dispatchedAt')
    })

    it('does not require an Android build', () => {
      expect(filter['metadata.appVersionCode']).toBeUndefined()
    })

    it('keeps messages requested in the last 72 hours', () => {
      expect(filter.requestedAt.$gte).toEqual(new Date('2026-09-17T12:00:00Z'))
    })

    it('never offers a message scheduled for the future', () => {
      const [due] = filter.$and
      expect(due.$or[1].dispatchDueAt.$lte).toEqual(now)
    })

    it('caps the number of dispatch attempts', () => {
      const [, attempts] = filter.$and
      expect(attempts.$or[1].dispatchAttempts.$lt).toBe(MAX_DISPATCH_ATTEMPTS)
    })
  })
})
