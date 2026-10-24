// Pure onboarding step definitions and completion logic for the Get Started
// card. Kept free of React so the checkDone rules are unit-testable.

export type StatsShape = {
  totalApiKeyCount?: number
  totalDeviceCount?: number
  totalSentSMSCount?: number
}

export type UserShape = {
  email?: string
  emailVerifiedAt?: string | Date | null
  createdAt?: string | Date
  onboarding?: {
    completedAt?: string | Date | null
    currentStepId?: string
    skippedStepIds?: string[]
  }
}

export type StepDef = {
  id: string
  label: string
  description: string
  // Shown instead of `description` when the step is already done and the user
  // has reopened it, so the copy does not tell them to do what they have done.
  doneDescription?: string
  optional: boolean
  // Shown as a small chip; sets expectations and reduces abandonment.
  timeEstimate: string
  checkDone: (
    user: UserShape | undefined,
    stats: StatsShape | undefined,
    skipped: string[]
  ) => boolean
}

export const STEPS: StepDef[] = [
  {
    id: 'verify_email',
    label: 'Verify your email',
    description: 'Required before you can send SMS.',
    optional: false,
    timeEstimate: '~1 min',
    checkDone: (user) => !!user?.emailVerifiedAt,
  },
  {
    id: 'download_app',
    label: 'Set up your phone',
    description:
      'Android: install the CrossHub app on the phone that will send your SMS. iPhone: use the Mac relay, or without a Mac, the iPhone Shortcut (Add device › iPhone only).',
    doneDescription: 'Your phone is set up. Follow the same guide to add another.',
    optional: true,
    timeEstimate: '~1 min',
    checkDone: (_u, stats, skipped) =>
      (stats?.totalDeviceCount ?? 0) > 0 || skipped.includes('download_app'),
  },
  {
    id: 'api_key',
    label: 'Generate an API key',
    description: 'Your key connects the app and authenticates API calls.',
    doneDescription:
      'You already have a key. Generate another if you need to replace it or set up a second device.',
    optional: false,
    timeEstimate: '~10 sec',
    checkDone: (_u, stats) => (stats?.totalApiKeyCount ?? 0) > 0,
  },
  {
    id: 'register_device',
    label: 'Register your device',
    description:
      'Turn your phone into your SMS gateway: scan the QR code below with the CrossHub app, then allow the SMS permission when the app asks.',
    doneDescription: 'Device registered. Register another the same way.',
    optional: false,
    timeEstimate: '~1 min',
    checkDone: (_u, stats) => (stats?.totalDeviceCount ?? 0) > 0,
  },
  {
    id: 'first_message',
    label: 'Send your first message',
    description: 'The moment it all works: send an SMS from the dashboard.',
    doneDescription: 'You have sent your first message. Send another any time.',
    optional: false,
    timeEstimate: '~30 sec',
    checkDone: (_u, stats) => (stats?.totalSentSMSCount ?? 0) > 0,
  },
]

export type StepState = StepDef & { isDone: boolean }

export function computeStepStates(
  user: UserShape | undefined,
  stats: StatsShape | undefined,
  skipped: string[]
): StepState[] {
  return STEPS.map((s) => ({
    ...s,
    isDone: s.checkDone(user, stats, skipped),
  }))
}
