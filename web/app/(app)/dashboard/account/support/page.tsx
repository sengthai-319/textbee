import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import SupportForm from '../../(components)/account/support-form'
import CommunitySupportCard from '../../(components)/account/community-support-card'
import { FORM_WIDTH } from '@/lib/layout'
import { cn } from '@/lib/utils'

export default function SupportPage() {
  return (
    <div className={cn(FORM_WIDTH, 'space-y-4')}>
      <CommunitySupportCard />
      <Card>
        <CardHeader>
          <CardTitle>Contact Support</CardTitle>
          <CardDescription>
            Fill out the form below and we'll get back to you as soon as
            possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupportForm />
        </CardContent>
      </Card>
    </div>
  )
}
