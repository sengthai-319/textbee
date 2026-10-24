import { getAuthMethods } from '@/lib/auth-methods'
import RegisterView from './register-view'

export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  return <RegisterView methods={getAuthMethods()} />
}
