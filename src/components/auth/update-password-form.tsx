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
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export function UpdatePasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error al actualizar contraseña')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <CardTitle className="text-xl text-zinc-100">¡Contraseña Actualizada!</CardTitle>
            <CardDescription className="text-zinc-400">
              Tu contraseña ha sido cambiada exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-zinc-400">
              Serás redirigido al inicio de sesión en un momento...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl text-zinc-100">Nueva Contraseña</CardTitle>
          <CardDescription className="text-zinc-400">
            Ingresa tu nueva contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-zinc-300">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
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
              {isLoading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
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
        </CardContent>
      </Card>
    </div>
  )
}
