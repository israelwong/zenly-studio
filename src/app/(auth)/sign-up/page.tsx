import { SignupFormWithRole } from '@/components/auth/signup-form-with-role'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthFooter } from '@/components/auth/auth-footer'

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-zinc-950">
      <div className="w-full max-w-md">
        <AuthHeader subtitle="Crea tu cuenta para gestionar tu estudio fotográfico" />
        <SignupFormWithRole />
        <AuthFooter />
      </div>
    </div>
  )
}
