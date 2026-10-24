import { ExecutionContext, HttpException } from '@nestjs/common'
import { SessionOnly } from './session-only.guard'

const contextFor = (request: any) =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext

describe('SessionOnly', () => {
  it('lets a dashboard session through', () => {
    expect(new SessionOnly().canActivate(contextFor({ user: { _id: 'u' } }))).toBe(true)
  })

  it('refuses a request authenticated with an API key', () => {
    expect(() =>
      new SessionOnly().canActivate(contextFor({ user: { _id: 'u' }, apiKey: { _id: 'k' } })),
    ).toThrow(HttpException)
  })
})
