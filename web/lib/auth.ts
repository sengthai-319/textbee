import axios from 'axios'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { OAuthConfig } from 'next-auth/providers/oauth'
import { getServerSideBaseUrl, httpServerClient } from './httpServerClient'
import { oidcClientConfig } from './auth-methods'
import type { DefaultSession, NextAuthOptions } from 'next-auth'
import { ApiEndpoints } from '@/config/api'
import { Routes } from '@/config/routes'
import { clientContextFromHeaders } from '@/lib/analytics/client-context'

// add custom fields to the session and user interfaces
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string
      role?: string
      phone?: string
      avatar?: string
      accessToken?: string
      isNewUser?: boolean
    } & DefaultSession['user']
  }

  interface User {
    // The backend returns Mongo documents, so the id arrives as _id and is
    // copied onto the token below.
    _id?: string
    role?: string
    phone?: string
    avatar?: string
    accessToken?: string
    isNewUser?: boolean
  }
}

// The jwt/session callbacks read and write these, so the token has to declare
// them or every callback parameter falls back to an implicit any.
declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    phone?: string
    avatar?: string
    accessToken?: string
    isNewUser?: boolean
  }
}


// Credentials cross the wire as strings, so the attribution blob arrives as
// JSON. A bad value must not block a signup, so parsing failures are dropped.
function parseAttribution(raw: unknown) {
  if (typeof raw !== 'string' || !raw || raw === 'undefined') return undefined
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : undefined
  } catch {
    return undefined
  }
}

// Single sign-on (Authentik or any OpenID Connect provider), when the server
// is configured for it. Authorization code flow with PKCE and state; the ID
// token it returns is checked again by the API before anyone is signed in.
function oidcProvider(): OAuthConfig<Record<string, any>>[] {
  const config = oidcClientConfig()
  if (!config) return []
  return [
    {
      id: 'oidc',
      name: config.name,
      type: 'oauth',
      wellKnown: `${config.issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorization: { params: { scope: 'openid email profile' } },
      idToken: true,
      checks: ['pkce', 'state'],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.preferred_username,
          email: profile.email,
          image: profile.picture,
        }
      },
    },
  ]
}

// Without the session interceptor: this runs inside the sign-in callback,
// before there is a session to attach.
const apiClient = () => axios.create({ baseURL: getServerSideBaseUrl() })

export const authOptions: NextAuthOptions = {
  providers: [
    ...oidcProvider(),
    CredentialsProvider({
      id: 'email-password-login',
      name: 'email-password-login',
      credentials: {
        email: { label: 'email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        turnstileToken: { label: 'Turnstile Token', type: 'text' },
      },
      async authorize(credentials, req) {
        // NextAuth can invoke authorize with no credentials at all. There is
        // nothing to authenticate in that case, so refuse rather than posting
        // undefined fields to the login endpoint.
        if (!credentials) return null
        const { email, password, turnstileToken } = credentials
        try {
          const res = await httpServerClient.post(ApiEndpoints.auth.login(), {
            email,
            password,
            turnstileToken,
            client: clientContextFromHeaders(req?.headers),
          })

          const user = res.data.data.user
          const accessToken = res.data.data.accessToken

          return {
            ...user,
            accessToken,
          }
        } catch (e) {
          console.log(e)

          return null
        }
      },
    }),
    CredentialsProvider({
      id: 'email-password-register',
      name: 'email-password-register',
      credentials: {
        email: { label: 'email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' },
        phone: { label: 'Phone', type: 'text' },
        marketingOptIn: { label: 'Marketing Opt In', type: 'text' },
        attribution: { label: 'Attribution', type: 'text' },
        turnstileToken: { label: 'Turnstile Token', type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials) return null
        const { email, password, name, phone, turnstileToken } = credentials
        try {
          const res = await httpServerClient.post(
            ApiEndpoints.auth.register(),
            {
              email,
              password,
              name,
              phone,
              // Arrives as a string, and Boolean('false') is true.
              marketingOptIn: credentials.marketingOptIn === 'true',
              attribution: parseAttribution(credentials.attribution),
              // Without this the API would record this server's address and
              // user agent instead of the visitor's.
              client: clientContextFromHeaders(req?.headers),
              turnstileToken,
            }
          )

          const user = res.data.data.user
          const accessToken = res.data.data.accessToken

          return {
            ...user,
            accessToken,
          }
        } catch (e) {
          console.log(e)
          return null
        }
      },
    }),
    CredentialsProvider({
      id: 'google-id-token-login',
      name: 'google-id-token-login',
      credentials: {
        idToken: { label: 'idToken', type: 'text' },
        attribution: { label: 'Attribution', type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials) return null
        const { idToken } = credentials
        try {
          const res = await httpServerClient.post(
            ApiEndpoints.auth.signInWithGoogle(),
            {
              idToken,
              attribution: parseAttribution(credentials.attribution),
              client: clientContextFromHeaders(req?.headers),
            }
          )

          const user = res.data.data.user
          const accessToken = res.data.data.accessToken

          return {
            ...user,
            accessToken,
            isNewUser: res.data.data.isNewUser === true,
          }
        } catch (e) {
          console.log(e)

          return null
        }
      },
    }),
  ],
  pages: {
    signIn: Routes.login,
    // Provider errors come back to the login page, which explains them.
    error: Routes.login,
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    // For single sign-on, exchange the provider's ID token for a CrossHub
    // session. The API verifies the token and decides which account it is;
    // its answer becomes the user the jwt callback below stores.
    async signIn({ user, account }) {
      if (account?.provider !== 'oidc') return true
      try {
        const res = await apiClient().post(ApiEndpoints.auth.oidcLogin(), {
          idToken: account.id_token,
        })
        const data = res.data.data
        Object.assign(user, data.user, {
          accessToken: data.accessToken,
          isNewUser: data.isNewUser === true,
        })
        return true
      } catch (e: any) {
        const code = e?.response?.data?.code ?? 'failed'
        console.log('Single sign-on refused by the API:', code, e?.response?.data?.error)
        return `${Routes.login}?error=oidc_${encodeURIComponent(code)}`
      }
    },
    async jwt({ token, user, trigger, session }) {
      if (trigger === 'update') {
        if (session.name !== token.name) {
          token.name = session.name
        }
        if (session.phone !== token.phone) {
          token.phone = session.phone
        }
        // A password change ends every older session, so the API hands the
        // changing browser a new token to carry on with.
        if (typeof session.accessToken === 'string' && session.accessToken) {
          token.accessToken = session.accessToken
        }
        return token
      }

      if (user) {
        token.id = user._id
        token.role = user.role
        token.accessToken = user.accessToken
        token.avatar = user.avatar
        token.phone = user.phone
        token.isNewUser = user.isNewUser
      }
      return token
    },
    async session({ session, token }): Promise<any> {
      session.user.id = token.id
      session.user.role = token.role
      session.user.accessToken = token.accessToken
      session.user.avatar = token.avatar
      session.user.phone = token.phone
      session.user.isNewUser = token.isNewUser
      return session
    },
  },
}
