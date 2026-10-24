'use client'

import { Card, CardContent } from '@/components/ui/card'
import { BarChart3, Clock, Smartphone, Key, MessageSquare } from 'lucide-react'
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
  icon: Icon,
  className,
}: {
  label: string
  value: string | number | undefined
  caption: string
  icon: typeof MessageSquare
  className?: string
}) {
  return (
    <div className={`min-w-0 bg-card px-4 py-4 ${className ?? ''}`}>
      <div className='flex items-center justify-between gap-3'>
        <p className='label-mono truncate'>{label}</p>
        <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
          <Icon className='h-3.5 w-3.5' />
        </span>
      </div>
      <div className='num mt-2.5 text-[1.75rem] font-semibold leading-none tracking-tight'>
        {value !== undefined ? value : <Skeleton className='h-6 w-14' />}
      </div>
      {caption && (
        <p className='mt-1.5 truncate text-xs text-muted-foreground'>{caption}</p>
      )}
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
        icon={Clock}
        className='max-lg:col-span-2'
      />
      <Stat
        label='SMS sent'
        caption='all time'
        value={stats?.totalSentSMSCount?.toLocaleString()}
        icon={MessageSquare}
      />
      <Stat
        label='SMS received'
        caption='all time'
        value={stats?.totalReceivedSMSCount?.toLocaleString()}
        icon={BarChart3}
      />
      <Stat
        label='Devices'
        caption={
          enabledDevices !== undefined ? `${enabledDevices} enabled` : ''
        }
        value={totalDevices}
        icon={Smartphone}
      />
      <Stat
        label='API keys'
        caption='active'
        value={apiKeys?.length ?? stats?.totalApiKeyCount}
        icon={Key}
      />
    </>
  )
}

export default function Overview() {
  return (
    <div className='space-y-6'>
      <GetStartedCard />
      {/* One row of totals from lg up; a 2-column grid below, with today's
          count spanning the full width. Below md the outer shell is dropped
          and the grid is the only surface. */}
      <Card className='max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0'>
        <CardContent className='grid grid-cols-2 gap-px overflow-hidden bg-border p-0 max-md:rounded-xl lg:grid-cols-5'>
          <Totals />
        </CardContent>
      </Card>
    </div>
  )
}
