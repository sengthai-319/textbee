'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Github } from 'lucide-react'
import { ExternalLinks } from '@/config/external-links'
import Link from 'next/link'

export default function CommunitySupportCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report a problem</CardTitle>
        <CardDescription>
          Found a bug or need a feature? Open an issue on the project's GitHub
          page, with what you did and what you expected to happen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant='outline'>
          <Link
            href={ExternalLinks.issues}
            prefetch={false}
            target='_blank'
            rel='noopener noreferrer'
          >
            <Github className='mr-2 h-4 w-4' />
            Open an issue
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
