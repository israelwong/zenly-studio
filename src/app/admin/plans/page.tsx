import React from 'react';
import { prisma } from '@/lib/prisma';
import { SectionNavigation } from '@/components/ui/shadcn/section-navigation';
import { PlansPageClient } from './components';
import { Plan } from './types';

// Función para obtener planes desde la base de datos
async function getPlans(): Promise<Plan[]> {
    try {
        // En build time, retornar array vacío para evitar errores de conexión
        if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
            return [];
        }

        const plans = await prisma.platform_plans.findMany({
            include: {
                _count: {
                    select: {
                        studios: true,
                        subscriptions: true,
                    }
                }
            },
            orderBy: [
                { active: 'desc' },
                { order: 'asc' },
                { name: 'asc' }
            ]
        });

        return plans.map(plan => ({
            ...plan,
            price_monthly: plan.price_monthly ? Number(plan.price_monthly) : null,
            price_yearly: plan.price_yearly ? Number(plan.price_yearly) : null,
            features: Array.isArray(plan.features) ? plan.features as string[] : null,
            limits: plan.limits as Record<string, unknown> | null
        })) as Plan[];
    } catch (error) {
        console.error('Error fetching plans:', error);

        // En build time, retornar array vacío en lugar de lanzar error
        if (process.env.NODE_ENV === 'production') {
            return [];
        }

        let errorMessage = 'Error de conexión a la base de datos';

        if (error instanceof Error) {
            if (error.message.includes('permission denied')) {
                errorMessage = 'Permisos insuficientes para acceder a los datos de planes.';
            } else if (error.message.includes('Tenant or user not found')) {
                errorMessage = 'Credenciales de base de datos incorrectas.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Tiempo de espera agotado al cargar los planes.';
            } else {
                errorMessage = `Error de base de datos: ${error.message}`;
            }
        }

        throw new Error(errorMessage);
    }
}

export default async function PlansPage() {
    let plans: Plan[] = [];
    let error: string | null = null;

    try {
        plans = await getPlans();
    } catch (err) {
        error = err instanceof Error ? err.message : 'Error desconocido al cargar los planes';
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Gestión de Planes</h1>
                        <p className="text-muted-foreground">
                            Administra los planes de suscripción de la plataforma
                        </p>
                    </div>
                </div>

                {/* Error State */}
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-red-400 font-medium mb-2">Error al cargar planes</h3>
                            <p className="text-red-300 text-sm mb-3">{error}</p>
                            <div className="text-red-300 text-sm space-y-1">
                                <p><strong>Posibles soluciones:</strong></p>
                                <ul className="list-disc list-inside ml-4 space-y-1">
                                    <li>Verifica que las variables de entorno estén configuradas correctamente</li>
                                    <li>Confirma que el modelo plans existe en la base de datos</li>
                                    <li>Revisa las políticas RLS en la tabla plans</li>
                                    <li>Intenta recargar la página</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <SectionNavigation
                title="Gestión de Planes"
                description="Administra los planes de suscripción de la plataforma"
                actionButton={{
                    label: "Nuevo Plan",
                    href: "/admin/plans/new",
                    icon: "Plus"
                }}
            />

            {/* Client Components */}
            <PlansPageClient initialPlans={plans} />
        </div>
    );
}
