'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card'
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react'

export default function UnauthorizedPage() {
    const router = useRouter()

    const handleGoBack = () => {
        router.back()
    }

    const handleGoHome = () => {
        router.push('/')
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-red-600">
                        Acceso No Autorizado
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        No tienes permisos para acceder a esta sección de la plataforma.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="text-center text-sm text-gray-500">
                        <p>Tu rol actual no te permite acceder a esta área.</p>
                        <p>Contacta al administrador si crees que esto es un error.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Button
                            onClick={handleGoBack}
                            variant="outline"
                            className="w-full"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Volver Atrás
                        </Button>

                        <Button
                            onClick={handleGoHome}
                            className="w-full"
                        >
                            <Home className="h-4 w-4 mr-2" />
                            Ir al Inicio
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
