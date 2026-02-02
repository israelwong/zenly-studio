'use client'

import Link from 'next/link'
import { ZenButton } from '@/components/ui/zen'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthFooter } from '@/components/auth/auth-footer'
import { Construction, ArrowLeft } from 'lucide-react'

export default function SignupPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-zinc-950">
      <div className="w-full max-w-md text-center">
        <AuthHeader subtitle="Registro de nuevos estudios" />

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <Construction className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Próximamente
          </h1>
          <p className="mt-3 text-zinc-400">
            El registro de nuevos estudios está en desarrollo. Por ahora solo
            pueden iniciar sesión usuarios con cuenta existente.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Te avisaremos cuando esté disponible.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <ZenButton
              asChild
              variant="primary"
              className="w-full"
            >
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ir a Iniciar sesión
              </Link>
            </ZenButton>
            <ZenButton asChild variant="outline" className="w-full">
              <Link href="/">Volver al inicio</Link>
            </ZenButton>
          </div>
        </div>

        <AuthFooter />
      </div>
    </div>
  )
}
