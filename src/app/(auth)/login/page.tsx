import { Suspense } from 'react'
import { LoginForm } from '@/components/forms/LoginForm'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthFooter } from '@/components/auth/auth-footer'

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-zinc-950">
      <div className="w-full max-w-sm">
        <AuthHeader subtitle="Ingresa a tu cuenta para acceder al panel de administración" />
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
        <AuthFooter />
      </div>
    </div>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-32 bg-zinc-800 rounded" />
        <div className="h-4 w-48 bg-zinc-800 rounded" />
      </div>
      <div className="space-y-4">
        <div className="h-10 w-full bg-zinc-800 rounded" />
        <div className="h-10 w-full bg-zinc-800 rounded" />
        <div className="h-10 w-full bg-zinc-800 rounded" />
      </div>
    </div>
  )
}

