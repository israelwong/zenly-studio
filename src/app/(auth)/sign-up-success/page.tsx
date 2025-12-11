import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card'
import { Button } from '@/components/ui/shadcn/button'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthFooter } from '@/components/auth/auth-footer'
import { CheckCircle2 } from 'lucide-react'

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-zinc-950">
      <div className="w-full max-w-md">
        <AuthHeader subtitle="Tu cuenta ha sido creada exitosamente" />

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <CardTitle className="text-xl text-zinc-100">¡Registro Exitoso!</CardTitle>
            <CardDescription className="text-zinc-400">
              Revisa tu correo para confirmar tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-400 text-center">
              Te hemos enviado un enlace de confirmación a tu correo electrónico.
              Por favor, verifica tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
            </p>

            <div className="pt-2 space-y-3">
              <Link href="/login" className="block">
                <Button className="w-full bg-emerald-700 hover:bg-emerald-600 text-white">
                  Ir a Iniciar Sesión
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
