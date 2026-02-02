'use client'

import Link from 'next/link'
import { ZenButton } from '@/components/ui/zen'
import { Construction } from 'lucide-react'

export default function SetupStudioPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-zinc-950">
      <div className="w-full max-w-md text-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <Construction className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100">
            En construcción
          </h1>
          <p className="mt-3 text-zinc-400">
            La creación de nuevos estudios no está disponible en este momento.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Si ya tienes cuenta, inicia sesión para acceder a tu estudio.
          </p>
          <div className="mt-8">
            <ZenButton asChild variant="primary" className="w-full">
              <Link href="/login">Ir a Iniciar sesión</Link>
            </ZenButton>
          </div>
        </div>
      </div>
    </div>
  )
}
