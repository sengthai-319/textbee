import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { Routes } from '@/config/routes'
import { useToast } from '@/hooks/use-toast'
import { useGenerateApiKey } from '@/lib/api'
import { QrCode, Copy, AlertTriangle } from 'lucide-react'
import React, { forwardRef, useImperativeHandle, useState } from 'react'
import QRCode from 'react-qr-code'

export type GenerateApiKeyHandle = {
  // Asks first ("Create an API key"), then shows the key
  open: () => void
  // Skips the question, for flows where the person already chose to create one
  generate: () => void
}

type GenerateApiKeyProps = {
  showTrigger?: boolean
  // Lets a caller say "Generate another API key" where a key already exists.
  triggerLabel?: string
  triggerVariant?: 'default' | 'outline'
}

const GenerateApiKey = forwardRef<GenerateApiKeyHandle, GenerateApiKeyProps>(
  function GenerateApiKey(
    {
      showTrigger = true,
      triggerLabel = 'Generate API Key',
      triggerVariant = 'default',
    },
    ref
  ) {
    const [isGenerateKeyModalOpen, setIsGenerateKeyModalOpen] = useState(false)
    const [isConfirmGenerateKeyModalOpen, setIsConfirmGenerateKeyModalOpen] =
      useState(false)

    const handleConfirmGenerateKey = () => {
      setIsConfirmGenerateKeyModalOpen(true)
    }


    const {
      isPending: isGeneratingApiKey,
      mutateAsync: generateApiKeyMutation,
      data: generatedApiKey,
    } = useGenerateApiKey()

    const generateApiKey = () =>
      generateApiKeyMutation(undefined, {
        onSuccess: () => {
          setIsConfirmGenerateKeyModalOpen(false)
          setIsGenerateKeyModalOpen(true)
        },
      })

    useImperativeHandle(ref, () => ({
      open: () => setIsConfirmGenerateKeyModalOpen(true),
      generate: () => void generateApiKey(),
    }))

    const { toast } = useToast()

    const handleCopyKey = () => {
      if (!generatedApiKey?.data) return
      navigator.clipboard.writeText(generatedApiKey.data)
      toast({
        title: 'API key copied to clipboard',
      })
    }

    return (
      <>
        {showTrigger ? (
          <Button variant={triggerVariant} onClick={handleConfirmGenerateKey}>
            <QrCode />
            {triggerLabel}
          </Button>
        ) : null}

        <Dialog
          open={isConfirmGenerateKeyModalOpen}
          onOpenChange={setIsConfirmGenerateKeyModalOpen}
        >
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>Create an API key</DialogTitle>
              <DialogDescription>
                The key is shown once, right after you create it. Copy it or
                scan it into the app before you close the next window.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setIsConfirmGenerateKeyModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size='sm'
                onClick={() => generateApiKey()}
                disabled={isGeneratingApiKey}
              >
                {isGeneratingApiKey && (
                  <Spinner size='sm' className='text-accent-foreground' />
                )}
                Create key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isGenerateKeyModalOpen}
          onOpenChange={setIsGenerateKeyModalOpen}
        >
          <DialogContent className='sm:max-w-lg'>
            <DialogHeader>
              <DialogTitle>Your API key</DialogTitle>
              <DialogDescription>
                Scan the code with the CrossHub Android app, or copy the key
                into the Mac relay, the iPhone Shortcut or your own code.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4'>
              <div className='flex justify-center rounded-2xl bg-white p-5'>
                {generatedApiKey?.data && (
                  <QRCode value={generatedApiKey?.data} size={132} />
                )}
              </div>

              <div className='flex items-center gap-2 rounded-xl bg-surface-secondary py-1.5 pl-3 pr-1.5'>
                <code className='min-w-0 flex-1 break-all font-mono text-sm'>
                  {generatedApiKey?.data}
                </code>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-8 shrink-0 md:size-8'
                  aria-label='Copy API key'
                  title='Copy API key'
                  onClick={handleCopyKey}
                >
                  <Copy />
                </Button>
              </div>

              <div className='flex gap-3 rounded-2xl bg-warning-soft px-4 py-3 text-sm'>
                <AlertTriangle className='mt-0.5 size-4 shrink-0 text-warning' />
                <p className='text-foreground'>
                  You won&apos;t see this key again after you close this
                  window. No app yet?{' '}
                  <a
                    href={Routes.downloadAndroidApp}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='font-medium text-accent underline-offset-4 hover:underline'
                  >
                    Get the Android app
                  </a>
                  .
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button size='sm' onClick={() => setIsGenerateKeyModalOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  },
)

export default GenerateApiKey
