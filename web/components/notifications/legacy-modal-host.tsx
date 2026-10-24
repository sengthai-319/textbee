'use client'

import UpdateAppModal from '@/app/(app)/dashboard/(components)/devices/update-app-modal'

// The dashboard's original load-time dialogs, unchanged. Mounted only while the
// engine is off. See LegacyAlertStack.
export function LegacyModalHost() {
  return (
    <>
      <UpdateAppModal />
    </>
  )
}
