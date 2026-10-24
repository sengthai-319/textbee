import { Types } from 'mongoose'
import { envInt } from './device-config'
import { MAX_DISPATCH_ATTEMPTS, RECOVERY_WINDOW_MS } from './pending-recovery'
import { SMSType } from './sms-type.enum'

// Devices that cannot receive a push, such as the macOS client, register with
// transport 'pull'. The server never pushes to them: their messages stay
// pending until the device claims them from /messages/pending.
export const DEVICE_TRANSPORTS = ['fcm', 'pull'] as const
export type DeviceTransport = (typeof DEVICE_TRANSPORTS)[number]

export const PULL_QUEUED_MESSAGE_ID = 'PULL_QUEUED'

export function isPullDevice(
  device: { transport?: string | null } | null | undefined,
): boolean {
  return device?.transport === 'pull'
}

// Pull devices poll as their only way to get work, so they get a short
// cooldown instead of the recovery path's five minutes
export function pullPollCooldownMs(): number {
  return envInt('PULL_POLL_COOLDOWN_MS', 5000)
}

export function pullClaimLimit(): number {
  return envInt('PULL_CLAIM_LIMIT', 25)
}

// Everything still waiting for this device, oldest first. 'unknown' is
// included because the stale-status cron relabels messages the device has not
// collected yet, and because a claim the device never reported on ends up
// there; the client keeps its own record of what it sent, so a repeat claim is
// reported again rather than sent twice.
export function pullPendingFilter(deviceId: string, now: Date = new Date()) {
  const windowStart = new Date(now.getTime() - RECOVERY_WINDOW_MS)
  return {
    device: Types.ObjectId.isValid(deviceId) ? new Types.ObjectId(deviceId) : deviceId,
    type: SMSType.SENT,
    status: { $in: ['pending', 'unknown'] },
    requestedAt: { $gte: windowStart },
    $and: [
      { $or: [{ dispatchDueAt: { $exists: false } }, { dispatchDueAt: { $lte: now } }] },
      {
        $or: [
          { dispatchAttempts: { $exists: false } },
          { dispatchAttempts: { $lt: MAX_DISPATCH_ATTEMPTS } },
        ],
      },
    ],
  }
}
