const SMS_PERMISSION_GUIDE =
  'https://textbee.dev/blog/android-15-send-sms-permission-guide'

export function smsPermissionGuideUrl(source: string): string {
  return `${SMS_PERMISSION_GUIDE}?utm_source=${source}&utm_medium=app&utm_campaign=sms_permission`
}

export const ExternalLinks = {
  github: 'https://github.com/sengthai-319/textbee',
  issues: 'https://github.com/sengthai-319/textbee/issues',
}
