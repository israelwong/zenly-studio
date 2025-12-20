import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthFooter } from '@/components/auth/auth-footer'

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-zinc-950">
      <div className="w-full max-w-md">
        <AuthHeader subtitle="Recupera el acceso a tu cuenta" />
        <ForgotPasswordForm />
        <AuthFooter />
      </div>
    </div>
  )
}
