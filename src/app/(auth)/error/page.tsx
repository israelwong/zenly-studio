import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card'
import { Button } from '@/components/ui/shadcn/button'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthFooter } from '@/components/auth/auth-footer'
import { AlertTriangle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-zinc-950">
      <div className="w-full max-w-md">
        <AuthHeader subtitle="Ocurrió un problema con la autenticación" />

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <CardTitle className="text-xl text-zinc-100">Error de Autenticación</CardTitle>
            <CardDescription className="text-zinc-400">
              Hubo un problema al confirmar tu cuenta. Esto puede deberse a:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-zinc-400 space-y-2">
              <li>• El enlace de confirmación ha expirado</li>
              <li>• El enlace ya ha sido utilizado</li>
              <li>• El enlace es inválido o está malformado</li>
            </ul>

            <div className="pt-2 space-y-3">
              <Link href="/login" className="block">
                <Button className="w-full bg-emerald-700 hover:bg-emerald-600 text-white">
                  Ir al Login
                </Button>
              </Link>

              <Link href="/sign-up" className="block">
                <Button
                  variant="outline"
                  className="w-full bg-transparent border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  Crear Nueva Cuenta
                </Button>
              </Link>

              <Link href="/" className="block">
                <Button
                  variant="outline"
                  className="w-full bg-transparent border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  Volver al inicio
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <AuthFooter />
      </div>
    </div>
  )
}