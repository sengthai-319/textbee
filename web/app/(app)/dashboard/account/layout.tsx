import type { PropsWithChildren } from 'react'
import { UserIcon } from 'lucide-react'
import RouteTabs from '@/components/shared/route-tabs'
import PageHeader from '@/components/shared/page-header'

// Account is one settings experience: sections are route-based tabs (same
// interaction grammar as messaging/webhooks).
export default function AccountLayout({ children }: PropsWithChildren) {
  return (
    <div className='flex-1 py-6 sm:py-8'>
      <PageHeader
        icon={UserIcon}
        title='Account'
        description='Manage your profile and security'
      />

      <RouteTabs
        className='mb-6'
        tabs={[
          { href: '/dashboard/account/profile', label: 'Profile' },
          { href: '/dashboard/account/security', label: 'Security' },
          { href: '/dashboard/account/support', label: 'Support' },
        ]}
      />

      {children}
    </div>
  )
}
