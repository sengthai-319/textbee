'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Check, Copy } from 'lucide-react'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import php from 'react-syntax-highlighter/dist/esm/languages/prism/php'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Prism, registering only the languages the guide uses. The bare
// react-syntax-highlighter entry is the highlight.js build with every language
// compiled in, and it emits hljs-* class names that the Prism themes below do
// not style, so this both shrinks the chunk and makes the theme apply.
// The languages come from LANGUAGES in snippets.ts plus json for responses.
for (const [name, definition] of [
  ['bash', bash],
  ['go', go],
  ['javascript', javascript],
  ['json', json],
  ['php', php],
  ['python', python],
] as const) {
  SyntaxHighlighter.registerLanguage(name, definition)
}

// The previous guide hardcoded a dark slate background regardless of theme, so
// code blocks were the only dark thing on a light page.
export default function CodeBlock({
  code,
  language,
  className,
}: {
  code: string
  language: string
  className?: string
}) {
  const { resolvedTheme } = useTheme()
  const [copied, setCopied] = useState(false)

  // Follows the class next-themes puts on <html>, the same signal the CSS
  // uses, so the code colors can never disagree with the page around them.
  // resolvedTheme alone was seen reporting light on a dark page. Starts
  // light on the server and the first client render, so hydration matches.
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setIsDark(root.classList.contains('dark'))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [resolvedTheme])

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('group relative', className)}>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className='absolute right-2 top-2 z-10 h-7 w-7 bg-background/70 backdrop-blur hover:bg-background'
      >
        {copied ? (
          <Check className='h-3.5 w-3.5 text-success' />
        ) : (
          <Copy className='h-3.5 w-3.5' />
        )}
      </Button>

      <SyntaxHighlighter
        language={language}
        style={isDark ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          borderRadius: '1rem',
          background: 'var(--surface-secondary)',
          padding: '1rem',
          paddingRight: '2.75rem',
          fontSize: '0.8125rem',
          lineHeight: 1.6,
          // Long lines scroll inside the block rather than widening the page.
          overflowX: 'auto',
          maxWidth: '100%',
        }}
        codeTagProps={{ style: { fontFamily: 'var(--font-mono, ui-monospace, monospace)' } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
