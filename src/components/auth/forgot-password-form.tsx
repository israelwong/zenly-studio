'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/shadcn/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card'
import { Input } from '@/components/ui/shadcn/input'
import { Label } from '@/components/ui/shadcn/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (resetError) {
        // Nunca mostrar "User not found" ni otro error en UI (evitar enumeración de usuarios)
        console.warn('[ForgotPassword] resetPasswordForEmail:', resetError.message)
      }
      // Siempre mostrar el mismo mensaje de éxito (registrado o no)
      setSuccess(true)
    } catch (err: unknown) {
      console.error('[ForgotPassword] Error:', err)
      setSuccess(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      {success ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <CardTitle className="text-xl text-zinc-100">Revisa tu Correo</CardTitle>
            <CardDescription className="text-zinc-400">
              Instrucciones de recuperación enviadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-400 text-center">
              Si el correo {email || 'indicado'} está registrado, recibirás las instrucciones para recuperar tu contraseña en breve.
            </p>

            <div className="pt-2 space-y-3">
              <Link href="/login" className="block">
                <Button className="w-full bg-emerald-700 hover:bg-emerald-600 text-white">
                  Volver a Iniciar Sesión
                </Button>
              </Link>

              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="w-full bg-transparent border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                Volver al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-zinc-100">Recuperar Contraseña</CardTitle>
            <CardDescription className="text-zinc-400">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-950/20 p-3 rounded border border-red-900/20">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Enviando...' : 'Enviar Correo de Recuperación'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="w-full bg-transparent border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-zinc-400">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-emerald-500 hover:text-emerald-400 underline underline-offset-4">
                Inicia sesión aquí
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
