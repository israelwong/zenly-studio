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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/shadcn/select'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { UserRole } from '@/types/auth'

export function SignupFormWithRole({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [role, setRole] = useState<UserRole>(UserRole.SUSCRIPTOR)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        const supabase = createClient()
        setIsLoading(true)
        setError(null)

        // Validaciones
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
            // Crear usuario en Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role,
                    }
                }
            })

            if (authError) throw authError

            if (authData.user) {
                // Crear perfil de usuario
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .insert([{
                        id: authData.user.id,
                        email: email,
                        fullName: fullName,
                        role: role,
                    }])

                if (profileError) {
                    console.error('Error creating user profile:', profileError)
                    // No lanzar error aquí, el usuario ya se creó en auth
                }

                setSuccess(true)
            }
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className={cn('flex flex-col gap-6', className)} {...props}>
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-xl text-emerald-400">¡Registro Exitoso!</CardTitle>
                        <CardDescription className="text-zinc-400">
                            Revisa tu email para confirmar tu cuenta
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-zinc-400 mb-4">
                            Te hemos enviado un enlace de confirmación a tu email.
                        </p>
                        <Button
                            onClick={() => router.push('/login')}
                            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white"
                        >
                            Ir a Iniciar Sesión
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-xl text-zinc-100">Crear Cuenta</CardTitle>
                    <CardDescription className="text-zinc-400">
                        Completa los datos para registrarte
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup}>
                        <div className="flex flex-col gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="fullName" className="text-zinc-300">Nombre Completo</Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="Juan Pérez"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="juan@ejemplo.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="confirmPassword" className="text-zinc-300">Confirmar Contraseña</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
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
                                {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
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
                        </div>
                        <div className="mt-4 text-center text-sm text-zinc-400">
                            ¿Ya tienes cuenta?{' '}
                            <Link href="/login" className="text-emerald-500 hover:text-emerald-400 underline underline-offset-4">
                                Inicia sesión aquí
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
