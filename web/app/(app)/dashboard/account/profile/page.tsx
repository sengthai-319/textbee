import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import EditProfileForm from '../../(components)/account/edit-profile-form'
import { FORM_WIDTH } from '@/lib/layout'

export default function ProfilePage() {
  return (
    <div className={FORM_WIDTH}>
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <EditProfileForm />
        </CardContent>
      </Card>
    </div>
  )
}
