'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/shadcn/button'
import { Input } from '@/components/ui/shadcn/input'
import { Label } from '@/components/ui/shadcn/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthFooter } from '@/components/auth/auth-footer'
import { CheckCircle2 } from 'lucide-react'

export default function SignUpPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            setLoading(false)
            return
        }

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        role: 'admin' // Por defecto, los nuevos usuarios son admin
                    }
                }
            })

            if (error) {
                setError(error.message)
                setLoading(false)
            } else {
                setSuccess(true)
                setLoading(false)
            }
        } catch (err) {
            setError('Error al crear la cuenta')
            setLoading(false)
        }
    }

    if (success) {
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
                                <Button
                                    onClick={() => router.push('/login')}
                                    className="w-full bg-emerald-700 hover:bg-emerald-600 text-white"
                                >
                                    Ir a Iniciar Sesión
                                </Button>

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

                    <AuthFooter />
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-zinc-950">
            <div className="w-full max-w-md">
                <AuthHeader subtitle="Crea tu cuenta para gestionar tu estudio fotográfico" />

                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-xl text-zinc-100">Crear Cuenta</CardTitle>
                        <CardDescription className="text-zinc-400">
                            Completa los datos para registrarte
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="text-sm text-red-400 bg-red-950/20 p-3 rounded border border-red-900/20">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    required
                                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-zinc-300">Confirmar Contraseña</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white"
                                disabled={loading}
                            >
                                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                className="w-full bg-transparent border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                                disabled={loading}
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

                <AuthFooter />
            </div>
        </div>
    )
}
