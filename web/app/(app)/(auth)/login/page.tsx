import { getAuthMethods } from '@/lib/auth-methods'
import LoginView from './login-view'

// Rendered per request so the sign-in options follow the server's settings.
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return <LoginView methods={getAuthMethods()} />
}
