'use client'

import { Card, CardContent } from '@/components/ui/card'
import GetStartedCard from './get-started'
import { useApiKeys, useDevices, useGatewayStats } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

// Compact totals. Deliberately no trend indicators: the stats endpoint
// returns running totals, so there is nothing to compare against and any
// arrow would be invented.
function Stat({
  label,
  value,
  caption,
  className,
}: {
  label: string
  value: string | number | undefined
  caption: string
  className?: string
}) {
  return (
    <div className={`min-w-0 bg-surface px-5 py-4 ${className ?? ''}`}>
      <p className='truncate text-sm text-muted'>{label}</p>
      <div className='num mt-1.5 text-2xl font-semibold leading-8 tracking-tight'>
        {value !== undefined ? value : <Skeleton className='h-7 w-14' />}
      </div>
      {caption && <p className='truncate text-xs text-muted'>{caption}</p>}
    </div>
  )
}

export function Totals() {
  const { data: stats } = useGatewayStats()
  const { data: devices } = useDevices()
  const { data: apiKeys } = useApiKeys('active')

  // The stats endpoint counts every device, enabled or not, so "enabled" has
  // to be derived from the device list we already fetch.
  const enabledDevices = devices?.filter((d) => d.enabled).length
  const totalDevices = devices?.length ?? stats?.totalDeviceCount

  return (
    <>
      <Stat
        label='Sent today'
        caption='since midnight'
        value={stats?.todaySentSMSCount?.toLocaleString()}
        className='max-lg:col-span-2'
      />
      <Stat
        label='SMS sent'
        caption='all time'
        value={stats?.totalSentSMSCount?.toLocaleString()}
      />
      <Stat
        label='SMS received'
        caption='all time'
        value={stats?.totalReceivedSMSCount?.toLocaleString()}
      />
      <Stat
        label='Devices'
        caption={
          enabledDevices !== undefined ? `${enabledDevices} enabled` : ''
        }
        value={totalDevices}
      />
      <Stat
        label='API keys'
        caption='active'
        value={apiKeys?.length ?? stats?.totalApiKeyCount}
      />
    </>
  )
}

export default function Overview() {
  return (
    <div className='space-y-6'>
      <GetStartedCard />
      {/* One row of totals from lg up; a 2-column grid below, with today's
          count spanning the full width. Hairlines come from the 1px gaps. */}
      <Card className='overflow-hidden'>
        <CardContent className='grid grid-cols-2 gap-px bg-separator p-0 lg:grid-cols-5'>
          <Totals />
        </CardContent>
      </Card>
    </div>
  )
}
