import { describe, expect, it } from 'vitest'
import {
  formatAppVersion,
  formatDeviceVersion,
  formatDeviceVersionShort,
  isDeviceOutdated,
} from './update-app-helpers'

describe('formatAppVersion', () => {
  it('shows the name with the build number', () => {
    expect(formatAppVersion('2.9.0', 20)).toBe('2.9.0 (build 20)')
  })

  it('falls back to whichever part is known', () => {
    expect(formatAppVersion('2.9.0', null)).toBe('2.9.0')
    expect(formatAppVersion(null, 17)).toBe('build 17')
    expect(formatAppVersion('  ', 17)).toBe('build 17')
    expect(formatAppVersion(null, null)).toBeNull()
  })
})

describe('formatDeviceVersion', () => {
  const base = { _id: 'd1', brand: 'samsung', model: 'SM-A346E' }

  it('uses the version the heartbeat reported', () => {
    expect(
      formatDeviceVersion({
        ...base,
        appVersionCode: 18,
        appVersionName: '2.8.0',
        appVersionInfo: { versionCode: 20, versionName: '2.9.0' },
      })
    ).toBe('2.9.0 (build 20)')
  })

  it('never pairs a stale registration name with a heartbeat code', () => {
    expect(
      formatDeviceVersion({
        ...base,
        appVersionName: '2.8.0',
        appVersionInfo: { versionCode: 20 },
      })
    ).toBe('build 20')
  })

  it('uses the registration version before the first heartbeat', () => {
    expect(
      formatDeviceVersion({ ...base, appVersionCode: 18, appVersionName: '2.8.0' })
    ).toBe('2.8.0 (build 18)')
  })

  it('returns null when nothing was reported', () => {
    expect(formatDeviceVersion(base)).toBeNull()
  })
})

describe('formatDeviceVersionShort', () => {
  const base = { _id: 'd1', brand: 'samsung', model: 'SM-A346E' }

  it('drops the build number when the name is known', () => {
    expect(
      formatDeviceVersionShort({
        ...base,
        appVersionInfo: { versionCode: 20, versionName: '2.9.0' },
      })
    ).toBe('2.9.0')
    expect(
      formatDeviceVersionShort({
        ...base,
        appVersionCode: 18,
        appVersionName: '2.8.0',
      })
    ).toBe('2.8.0')
  })

  it('keeps the heartbeat as the single source', () => {
    expect(
      formatDeviceVersionShort({
        ...base,
        appVersionName: '2.8.0',
        appVersionInfo: { versionCode: 20 },
      })
    ).toBe('build 20')
  })

  it('returns null when nothing is known', () => {
    expect(formatDeviceVersionShort(base)).toBeNull()
  })
})

describe('isDeviceOutdated', () => {
  const base = { _id: 'd1', brand: 'Google', model: 'Pixel 8' }

  it('flags an Android build older than the latest', () => {
    expect(isDeviceOutdated({ ...base, appVersionCode: 1 }, 20)).toBe(true)
    expect(isDeviceOutdated({ ...base, appVersionCode: 20 }, 20)).toBe(false)
  })

  it('never flags the Mac relay, which has no Android app to update', () => {
    expect(
      isDeviceOutdated(
        { ...base, brand: 'Apple', model: 'Mac14,15', appVersionCode: 1, transport: 'pull' },
        20
      )
    ).toBe(false)
  })
})
