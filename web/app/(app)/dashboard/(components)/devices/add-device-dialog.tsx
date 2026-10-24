'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Steps } from '@/components/shared/steps'
import { Routes } from '@/config/routes'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import GenerateApiKey, { type GenerateApiKeyHandle } from '../api-keys/generate-api-key'
import IphoneShortcutPanel, { useRegisterShortcutDevice } from './iphone-shortcut-panel'

type DeviceKind = 'android' | 'mac' | 'shortcut'

// One line under the tabs that says who each option is for, so nobody has
// to guess which one fits an iPhone with a Windows PC.
const SUMMARY: Record<DeviceKind, string> = {
  android: "The CrossHub app sends from the phone's SIM.",
  mac: 'A Mac on your Apple Account sends through Messages and your iPhone delivers. Runs around the clock while the Mac is on.',
  shortcut:
    'No Mac needed. An Apple Shortcut on your iPhone sends the waiting texts each time it runs.',
}

const linkClass = 'font-medium text-accent underline-offset-4 hover:underline'

export type AddDeviceHandle = {
  open: () => void
}

/**
 * The full "add a device" flow: what to do first, then the API key and QR.
 *
 * Extracted from device-list so the dashboard quick action can use the same
 * flow. That button opened the key-generation modal directly, which is
 * confusing for a first-time user: it asks them to create an API key when
 * what they wanted was to connect a phone, with no mention of installing the
 * app or granting SMS permissions first.
 *
 * Every option keeps its main action in the footer, so the dialog reads the
 * same whichever tab is open.
 */
const AddDeviceDialog = forwardRef<AddDeviceHandle>(function AddDeviceDialog(
  _props,
  ref
) {
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [kind, setKind] = useState<DeviceKind>('android')
  const apiKeyRef = useRef<GenerateApiKeyHandle>(null)
  const shortcut = useRegisterShortcutDevice()

  useImperativeHandle(ref, () => ({
    open: () => setInstructionsOpen(true),
  }))

  return (
    <>
      <GenerateApiKey ref={apiKeyRef} showTrigger={false} />

      <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Add a device</DialogTitle>
            <DialogDescription>
              Choose the phone that will send your messages.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={kind} onValueChange={(v) => setKind(v as DeviceKind)}>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='android'>Android</TabsTrigger>
              <TabsTrigger value='mac'>iPhone + Mac</TabsTrigger>
              <TabsTrigger value='shortcut'>iPhone + Windows</TabsTrigger>
            </TabsList>
            <p className='mt-3 text-sm text-muted'>{SUMMARY[kind]}</p>

            <TabsContent value='android' className='mt-4'>
              <Steps>
                <li>
                  Install the CrossHub app on your Android phone (see the{' '}
                  <a
                    href={Routes.downloadAndroidApp}
                    target='_blank'
                    rel='noreferrer'
                    className={linkClass}
                  >
                    Android setup guide
                  </a>
                  ).
                </li>
                <li>
                  Create an API key below to get a QR code for the app. If you
                  already have an active key, you can paste it in the app
                  instead.
                </li>
                <li>
                  In the app, scan the QR code or paste the key. The phone
                  appears in your device list once it links.
                </li>
                <li>
                  Allow the SMS permission when the app asks. On Android 15 and
                  newer, open App info, tap the menu (⋮), choose Allow
                  restricted settings, then allow SMS.
                </li>
              </Steps>
            </TabsContent>

            <TabsContent value='mac' className='mt-4'>
              <Steps>
                <li>
                  On the iPhone, turn on Text Message Forwarding for your Mac
                  (Settings › Apps › Messages).
                </li>
                <li>Download the Mac relay and run its setup with an API key.</li>
                <li>
                  Start the relay. It sends each message through Messages on
                  the Mac.
                </li>
              </Steps>
            </TabsContent>

            <TabsContent value='shortcut' className='mt-4'>
              <IphoneShortcutPanel
                device={shortcut.data}
                failed={shortcut.isError}
              />
            </TabsContent>
          </Tabs>
          <DialogFooter className='sm:justify-between'>
            <Button variant='ghost' size='sm' asChild>
              <a href={Routes.quickstart} target='_blank' rel='noreferrer'>
                Full setup guide
                <ExternalLink />
              </a>
            </Button>
            <div className='flex flex-col-reverse gap-2 sm:flex-row'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setInstructionsOpen(false)}
              >
                {kind === 'shortcut' && shortcut.data ? 'Done' : 'Cancel'}
              </Button>
              {kind === 'android' && (
                <Button
                  size='sm'
                  onClick={() => {
                    setInstructionsOpen(false)
                    apiKeyRef.current?.generate()
                  }}
                >
                  Create API key
                </Button>
              )}
              {kind === 'mac' && (
                <Button size='sm' asChild>
                  <a href={Routes.setupIphone} target='_blank' rel='noreferrer'>
                    Open the Mac relay guide
                    <ExternalLink />
                  </a>
                </Button>
              )}
              {kind === 'shortcut' &&
                (shortcut.data ? (
                  <Button size='sm' asChild>
                    <a href={Routes.setupShortcut} target='_blank' rel='noreferrer'>
                      Open the Shortcut guide
                      <ExternalLink />
                    </a>
                  </Button>
                ) : (
                  <Button
                    size='sm'
                    onClick={() => shortcut.mutate()}
                    disabled={shortcut.isPending}
                  >
                    {shortcut.isPending ? 'Registering…' : 'Register this iPhone'}
                  </Button>
                ))}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})

export default AddDeviceDialog
