import { describe, expect, it } from 'vitest'
import { buildBreadcrumbs } from './breadcrumbs'

const labels = (pathname: string) =>
  buildBreadcrumbs(pathname).map((crumb) => crumb.label)

describe('buildBreadcrumbs', () => {
  it('names every dashboard route after its tab', () => {
    expect(labels('/dashboard')).toEqual(['Dashboard'])
    expect(labels('/dashboard/messaging')).toEqual([
      'Dashboard',
      'Messaging',
      'Send',
    ])
    expect(labels('/dashboard/messaging/history')).toEqual([
      'Dashboard',
      'Messaging',
      'History',
    ])
    expect(labels('/dashboard/webhooks/deliveries')).toEqual([
      'Dashboard',
      'Webhooks',
      'Deliveries',
    ])
    expect(labels('/dashboard/account/profile')).toEqual([
      'Dashboard',
      'Account',
      'Profile',
    ])
  })

  it('links a redirecting section root to where it lands', () => {
    const account = buildBreadcrumbs('/dashboard/account/security')[1]
    expect(account).toEqual({
      href: '/dashboard/account/profile',
      label: 'Account',
    })
  })

  it('ignores a trailing slash', () => {
    expect(labels('/dashboard/webhooks/')).toEqual(['Dashboard', 'Webhooks'])
  })

  it('title-cases a route it does not know', () => {
    expect(labels('/dashboard/some-new-page')).toEqual([
      'Dashboard',
      'Some New Page',
    ])
  })

  it('returns nothing outside the dashboard', () => {
    expect(buildBreadcrumbs('/login')).toEqual([])
    expect(buildBreadcrumbs('/dashboardx')).toEqual([])
  })
})
