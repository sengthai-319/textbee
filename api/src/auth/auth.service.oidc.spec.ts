import { AuthService } from './auth.service'
import { oidcSettings } from './oidc'

// loginWithOidc with the token check stubbed: the verifier has its own spec
// (oidc.spec.ts). This covers which account a verified identity lands on.
const ISSUER = 'https://auth.example/application/o/crosshub/'

const build = (env: Record<string, string> = {}) => {
  const usersService = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    touchClient: jest.fn(),
  }
  const jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') }
  const analyticsService = { userRegistered: jest.fn() }
  const service = new AuthService(
    usersService as any,
    {} as any,
    jwtService as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    analyticsService as any,
  )
  const verify = jest.fn()
  ;(service as any).oidc = {
    settings: oidcSettings({ OIDC_ISSUER: ISSUER, OIDC_CLIENT_ID: 'crosshub', ...env }),
    verifier: { verify },
  }
  return { service, usersService, verify, analyticsService }
}

const identity = (over: Record<string, unknown> = {}) => ({
  issuer: ISSUER,
  subject: 'ak-user-1',
  email: 'ada@example.com',
  emailVerified: true,
  name: 'Ada Lovelace',
  groups: ['crosshub'],
  ...over,
})

const userDoc = (over: Record<string, unknown> = {}) => ({
  _id: 'user_1',
  email: 'ada@example.com',
  save: jest.fn().mockResolvedValue(undefined),
  toObject() {
    return { _id: 'user_1', email: 'ada@example.com' }
  },
  ...over,
})

describe('AuthService.loginWithOidc', () => {
  it('signs in the account already linked to this provider user', async () => {
    const { service, usersService, verify } = build()
    verify.mockResolvedValue(identity())
    const linked = userDoc({ oidcIssuer: ISSUER, oidcSubject: 'ak-user-1' })
    usersService.findOne.mockResolvedValueOnce(linked)

    const result = await service.loginWithOidc('token')

    expect(usersService.findOne).toHaveBeenCalledWith({ oidcIssuer: ISSUER, oidcSubject: 'ak-user-1' })
    expect(result).toMatchObject({ accessToken: 'signed-jwt', isNewUser: false })
    expect(linked.save).toHaveBeenCalled()
  })

  it('links an existing password account when the provider confirms the email', async () => {
    const { service, usersService, verify } = build()
    verify.mockResolvedValue(identity())
    const existing: any = userDoc()
    usersService.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing)

    await service.loginWithOidc('token')

    expect(existing.oidcSubject).toBe('ak-user-1')
    expect(existing.oidcIssuer).toBe(ISSUER)
    expect(existing.emailVerifiedAt).toBeInstanceOf(Date)
  })

  it('refuses to link on an email the provider did not confirm', async () => {
    const { service, usersService, verify } = build()
    verify.mockResolvedValue(identity({ emailVerified: false }))
    const existing: any = userDoc()
    usersService.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing)

    await expect(service.loginWithOidc('token')).rejects.toMatchObject({ status: 409 })
    expect(existing.save).not.toHaveBeenCalled()
  })

  it('links on an unconfirmed email when OIDC_TRUST_EMAIL is on', async () => {
    const { service, usersService, verify } = build({ OIDC_TRUST_EMAIL: 'true' })
    verify.mockResolvedValue(identity({ emailVerified: false }))
    const existing: any = userDoc()
    usersService.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing)

    await service.loginWithOidc('token')
    expect(existing.oidcSubject).toBe('ak-user-1')
  })

  it('creates the account on first sign-in', async () => {
    const { service, usersService, verify, analyticsService } = build()
    verify.mockResolvedValue(identity())
    const created: any = userDoc()
    usersService.create.mockResolvedValue(created)

    const result = await service.loginWithOidc('token')

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ada Lovelace', email: 'ada@example.com' }),
    )
    expect(created.oidcSubject).toBe('ak-user-1')
    expect(created.emailVerifiedAt).toBeInstanceOf(Date)
    expect(result.isNewUser).toBe(true)
    expect(analyticsService.userRegistered).toHaveBeenCalled()
  })

  it("treats a new account from Authentik's default mapping (email_verified false) as verified", async () => {
    const { service, usersService, verify } = build()
    verify.mockResolvedValue(identity({ emailVerified: false }))
    const created: any = userDoc()
    usersService.create.mockResolvedValue(created)

    await service.loginWithOidc('token')
    expect(created.emailVerifiedAt).toBeInstanceOf(Date)
  })

  it('does not create accounts when OIDC_ALLOW_SIGNUP is off', async () => {
    const { service, usersService, verify } = build({ OIDC_ALLOW_SIGNUP: 'false' })
    verify.mockResolvedValue(identity())

    await expect(service.loginWithOidc('token')).rejects.toMatchObject({ status: 403 })
    expect(usersService.create).not.toHaveBeenCalled()
  })

  it('turns away users outside the allowed groups', async () => {
    const { service, usersService, verify } = build({ OIDC_ALLOWED_GROUPS: 'crosshub-admins' })
    verify.mockResolvedValue(identity({ groups: ['everyone'] }))

    await expect(service.loginWithOidc('token')).rejects.toMatchObject({ status: 403 })
    expect(usersService.findOne).not.toHaveBeenCalled()
  })

  it('answers 404 when single sign-on is not set up', async () => {
    const { service } = build()
    ;(service as any).oidc.settings = oidcSettings({})

    await expect(service.loginWithOidc('token')).rejects.toMatchObject({ status: 404 })
  })
})

describe('password sign-in switches', () => {
  const env = process.env
  afterEach(() => {
    process.env = env
  })

  it('refuses password login when PASSWORD_LOGIN=false', async () => {
    process.env = { ...env, PASSWORD_LOGIN: 'false' }
    const { service } = build()
    await expect(
      service.login({ email: 'ada@example.com', password: 'x' }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('refuses sign-up when ALLOW_REGISTRATION=false', async () => {
    process.env = { ...env, ALLOW_REGISTRATION: 'false' }
    const { service } = build()
    await expect(
      service.register({ email: 'ada@example.com', password: 'a-long-password' }),
    ).rejects.toMatchObject({ status: 403 })
  })
})
