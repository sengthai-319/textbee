import { BookOpen, Github, Smartphone, Laptop, Apple } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Routes } from '@/config/routes'
import { ExternalLinks } from '@/config/external-links'

export type HelpLink = { label: string; href: string; icon: LucideIcon }

// The guides the old page footer linked to. They live in the Help menu now
// (sidebar on desktop, account menu on mobile) so no page carries a footer.
export const helpLinks: HelpLink[] = [
  { label: 'Setup guide', href: Routes.quickstart, icon: BookOpen },
  { label: 'Android phones', href: Routes.downloadAndroidApp, icon: Smartphone },
  { label: 'iPhone with a Mac', href: Routes.setupIphone, icon: Laptop },
  { label: 'iPhone with Windows', href: Routes.setupShortcut, icon: Apple },
  { label: 'GitHub', href: ExternalLinks.github, icon: Github },
]
