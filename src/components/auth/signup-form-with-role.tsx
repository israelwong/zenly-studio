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
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl text-green-600">¡Registro Exitoso!</CardTitle>
                        <CardDescription>
                            Revisa tu email para confirmar tu cuenta
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-gray-600 mb-4">
                            Te hemos enviado un enlace de confirmación a tu email.
                        </p>
                        <Button onClick={() => router.push('/login')} className="w-full">
                            Ir a Iniciar Sesión
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Registrarse</CardTitle>
                    <CardDescription>
                        Crea tu cuenta en ProSocial Platform
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup}>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="fullName">Nombre Completo</Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="Juan Pérez"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="juan@ejemplo.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="role">Tipo de Cuenta</Label>
                                <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona tu tipo de cuenta" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={UserRole.SUSCRIPTOR}>
                                            📸 Suscriptor (Estudio de Fotografía)
                                        </SelectItem>
                                        <SelectItem value={UserRole.AGENTE}>
                                            💼 Agente ProSocial
                                        </SelectItem>
                                        <SelectItem value={UserRole.SUPER_ADMIN}>
                                            🔧 Super Administrador
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Contraseña</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                            </Button>
                        </div>
                        <div className="mt-4 text-center text-sm">
                            ¿Ya tienes cuenta?{' '}
                            <Link href="/login" className="underline underline-offset-4">
                                Inicia sesión aquí
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
