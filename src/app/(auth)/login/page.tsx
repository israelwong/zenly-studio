import { LoginForm } from '@/components/forms/LoginForm'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthFooter } from '@/components/auth/auth-footer'

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-zinc-950">
      <div className="w-full max-w-sm">
        <AuthHeader subtitle="Ingresa a tu cuenta para acceder al panel de administración" />
        <LoginForm />
        <AuthFooter />
      </div>
    </div>
  )
}

