import { invalidLinkPage } from './email-pages'

describe('invalidLinkPage', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('names the configured support address', () => {
    process.env.MAIL_REPLY_TO = 'help@example.com'
    expect(invalidLinkPage()).toContain('mailto:help@example.com')
  })

  it('points to the server administrator when no address is set', () => {
    delete process.env.MAIL_REPLY_TO
    delete process.env.ADMIN_EMAIL
    const html = invalidLinkPage()
    expect(html).toContain('administrator of this server')
    expect(html).not.toContain('mailto:')
  })
})
