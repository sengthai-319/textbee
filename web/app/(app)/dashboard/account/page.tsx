import { redirect } from 'next/navigation'

// Account is a settings section with subroutes; Profile is the default view.
export default function AccountPage() {
  redirect('/dashboard/account/profile')
}
