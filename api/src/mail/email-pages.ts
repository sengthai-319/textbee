import { escapeHtml } from './email-render'


const page = (title: string, body: string) =>
  '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<meta name="robots" content="noindex">' +
  `<title>${escapeHtml(title)}</title>` +
  '<style>body{margin:0;background:#f3f4f6;font:16px/1.6 Arial,Helvetica,sans-serif;color:#1f2937}' +
  'main{max-width:480px;margin:48px auto;padding:28px;background:#fff;border-radius:8px}' +
  'h1{font-size:21px;line-height:1.3;margin:0 0 16px;color:#111827}p{margin:0 0 16px}' +
  'button{background:#EA580C;color:#fff;border:0;border-radius:6px;padding:12px 20px;font:bold 15px Arial,Helvetica,sans-serif;cursor:pointer}' +
  'a{color:#1d4ed8}</style></head>' +
  `<body><main><h1>${escapeHtml(title)}</h1>${body}</main></body></html>`

const form = (action: string, token: string, label: string) =>
  `<form method="post" action="${escapeHtml(action)}?t=${encodeURIComponent(token)}">` +
  `<button type="submit">${escapeHtml(label)}</button></form>`

const NOTICES =
  '<p>Notices about your account, usage and billing still arrive, because they are about your account.</p>'

export const unsubscribeConfirmPage = (token: string) =>
  page(
    'Unsubscribe from CrossHubSMS product emails?',
    '<p>You will stop getting product tips and offers from CrossHubSMS.</p>' +
      NOTICES +
      form('unsubscribe', token, 'Unsubscribe'),
  )

export const unsubscribedPage = (token: string) =>
  page(
    'You are unsubscribed',
    '<p>You will not get product emails from CrossHubSMS anymore.</p>' +
      NOTICES +
      '<p>Changed your mind?</p>' +
      form('resubscribe', token, 'Subscribe again'),
  )

export const resubscribedPage = () =>
  page(
    'You are subscribed again',
    '<p>You will get CrossHubSMS product emails again. You can unsubscribe with the link at the bottom of any of them.</p>',
  )

// Read per call so a change to the environment applies without a rebuild
const supportLine = () => {
  const support = process.env.MAIL_REPLY_TO || process.env.ADMIN_EMAIL
  return support
    ? `<p>If it still does not work, write to <a href="mailto:${support}">${support}</a> and we will update your email settings.</p>`
    : '<p>If it still does not work, ask the administrator of this server to update your email settings.</p>'
}

export const invalidLinkPage = () =>
  page(
    'This link does not work',
    '<p>The link may be incomplete or changed. Copy the whole link from the email and try again.</p>' +
      supportLine(),
  )
