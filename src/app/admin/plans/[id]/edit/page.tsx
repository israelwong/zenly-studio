'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/shadcn/button';
import { ZenInput } from '@/components/ui/zen';
import { Label } from '@/components/ui/shadcn/label';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Switch } from '@/components/ui/shadcn/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Separator } from '@/components/ui/shadcn/separator';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PlanMigrationModal } from './components/PlanMigrationModal';
import { SimpleLimitsModal } from './components/SimpleLimitsModal';
import { PlanServicesList } from './components/PlanServicesList';
import { Plan as PlanType } from '../../types';
import { ServiceWithPlanConfig } from '../../types/plan-services';

// Interfaz para límites del plan
interface PlanLimit {
    limite: number | null;
    descripcion: string;
    unidad?: string;
}

// Schema de validación
const planSchema = z.object({
    name: z.string()
        .min(1, 'El nombre del plan es requerido')
        .max(100, 'El nombre no puede tener más de 100 caracteres'),

    slug: z.string()
        .min(1, 'El slug es requerido')
        .max(50, 'El slug no puede tener más de 50 caracteres')
        .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones'),

    description: z.string().optional(),

    price_monthly: z.string()
        .refine((val) => {
            if (val === '' || val === null || val === undefined) return true;
            const num = parseFloat(val);
            return !isNaN(num) && num >= 0;
        }, 'El precio mensual debe ser un número válido mayor o igual a 0')
        .optional(),

    price_yearly: z.string()
        .refine((val) => {
            if (val === '' || val === null || val === undefined) return true;
            const num = parseFloat(val);
            return !isNaN(num) && num >= 0;
        }, 'El precio anual debe ser un número válido mayor o igual a 0')
        .optional(),

    popular: z.boolean(),
    active: z.boolean(),
    stripe_price_id: z.string().optional(),
    stripe_product_id: z.string().optional(),
    limits: z.record(z.string(), z.unknown()).optional(),
    orden: z.number().int().min(0, 'El orden debe ser un número entero mayor o igual a 0').optional()
});

type PlanFormData = z.infer<typeof planSchema>;


export default function EditPlanPage() {
    const router = useRouter();
    const params = useParams();
    const planId = params.id as string;
    const isEdit = planId !== 'new' && planId !== undefined;

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(isEdit);
    const [planServices, setPlanServices] = useState<ServiceWithPlanConfig[]>([]);
    const [showMigrationModal, setShowMigrationModal] = useState(false);
    const [showSimpleLimitsModal, setShowSimpleLimitsModal] = useState(false);
    const [limits, setLimits] = useState<Record<string, unknown>>({});
    const [planData, setPlanData] = useState<PlanType | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
        reset
    } = useForm<PlanFormData>({
        resolver: zodResolver(planSchema),
        defaultValues: {
            name: '',
            slug: '',
            description: '',
            price_monthly: '',
            price_yearly: '',
            popular: false,
            active: true,
            stripe_price_id: '',
            stripe_product_id: '',
            limits: {},
            orden: undefined
        }
    });

    // Auto-generar slug desde el nombre
    const watchedName = watch('name');
    useEffect(() => {
        if (!isEdit && watchedName) {
            const slug = watchedName
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
            setValue('slug', slug);
        }
    }, [watchedName, setValue, isEdit]);

    const fetchPlan = useCallback(async () => {
        if (!isEdit) {
            setIsLoadingData(false);
            return;
        }

        try {
            const response = await fetch(`/api/plans/${planId}`);
            if (!response.ok) {
                throw new Error('Error al cargar el plan');
            }
            const plan: PlanType = await response.json();
            setPlanData(plan);

            console.log('Plan data loaded:', {
                name: plan.name,
                popular: plan.popular,
                active: plan.active
            });

            reset({
                name: plan.name,
                slug: plan.slug,
                description: plan.description || '',
                price_monthly: plan.price_monthly?.toString() || '',
                price_yearly: plan.price_yearly?.toString() || '',
                popular: plan.popular,
                active: plan.active,
                stripe_price_id: plan.stripe_price_id || '',
                stripe_product_id: plan.stripe_product_id || '',
                limits: plan.limits || {},
                orden: plan.orden
            });

            setLimits(plan.limits || {});

            // Verificar valores después del reset
            setTimeout(() => {
                console.log('Form values after reset:', {
                    popular: watch('popular'),
                    active: watch('active')
                });
            }, 100);
        } catch (error) {
            console.error('Error fetching plan:', error);
            toast.error('Error al cargar los datos del plan');
            router.push('/admin/plans');
        } finally {
            setIsLoadingData(false);
        }
    }, [isEdit, planId, reset, router, watch]);

    // Cargar datos del plan (solo en modo edición)
    useEffect(() => {
        if (isEdit) {
            fetchPlan();
        }
    }, [isEdit, fetchPlan]);


    // Manejar guardado de límites desde el modal
    const handleLimitsSave = (newLimits: Record<string, PlanLimit>) => {
        setLimits(newLimits);
        setValue('limits', newLimits);
    };

    const onSubmit = async (data: PlanFormData) => {
        setIsLoading(true);

        try {
            const url = isEdit ? `/api/plans/${planId}` : '/api/plans';
            const method = isEdit ? 'PUT' : 'POST';

            const requestData = {
                ...data,
                price_monthly: data.price_monthly ? parseFloat(data.price_monthly) : undefined,
                price_yearly: data.price_yearly ? parseFloat(data.price_yearly) : undefined,
                limits: limits
            };

            console.log("Sending plan data:", JSON.stringify(requestData, null, 2));

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            console.log("Response status:", response.status);
            console.log("Response ok:", response.ok);

            if (!response.ok) {
                const error = await response.json();
                console.error("API Error:", error);
                throw new Error(error.error || 'Error al guardar el plan');
            }

            const savedPlan = await response.json();

            // Si es creación y hay servicios configurados, guardarlos
            if (!isEdit && planServices.length > 0) {
                const activeServices = planServices.filter(service => service.planService?.active);

                if (activeServices.length > 0) {
                    try {
                        for (const service of activeServices) {
                            await fetch(`/api/plans/${savedPlan.id}/services`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    service_id: service.id,
                                    active: service.planService?.active || false,
                                    limite: service.planService?.limite || null,
                                    unidad: service.planService?.unidad || null
                                }),
                            });
                        }
                    } catch (error) {
                        console.error('Error saving plan services:', error);
                        toast.error('Plan creado pero hubo un error al guardar la configuración de servicios');
                    }
                }
            }

            toast.success(
                isEdit
                    ? 'Plan actualizado exitosamente'
                    : 'Plan creado exitosamente'
            );

            router.push('/admin/plans');
        } catch (error) {
            console.error('Error saving plan:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Error al guardar el plan'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeletePlan = async () => {
        if (!planData) return;

        // Verificar si tiene suscripciones activas antes de mostrar confirmación
        if ((planData._count?.subscriptions ?? 0) > 0) {
            toast.error('No se puede eliminar un plan que tiene suscripciones activas. Usa "Archivar Plan" en su lugar.');
            return;
        }

        const confirmed = confirm(
            `¿Estás seguro de que quieres eliminar el plan "${planData.name}"? Esta acción no se puede deshacer.`
        );

        if (!confirmed) return;

        try {
            setIsLoading(true);
            const response = await fetch(`/api/plans/${planId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();

                // Manejar errores específicos de la API
                if (error.error?.includes('suscripciones activas')) {
                    toast.error('No se puede eliminar un plan que tiene suscripciones activas. Usa "Archivar Plan" en su lugar.');
                    return;
                }

                throw new Error(error.error || 'Error al eliminar el plan');
            }

            toast.success('Plan eliminado exitosamente');
            router.push('/admin/plans');
        } catch (error) {
            console.error('Error deleting plan:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Error al eliminar el plan'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleArchivePlan = async () => {
        if (!planData) return;

        const action = planData.active ? 'archivar' : 'activar';
        const confirmed = confirm(
            `¿Estás seguro de que quieres ${action} el plan "${planData.name}"?`
        );

        if (!confirmed) return;

        try {
            setIsLoading(true);
            const response = await fetch(`/api/plans/${planId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    active: !planData.active
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `Error al ${action} el plan`);
            }

            toast.success(`Plan ${action}do exitosamente`);
            // Recargar los datos del plan
            await fetchPlan();
        } catch (error) {
            console.error(`Error ${action}ing plan:`, error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : `Error al ${action} el plan`
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateNewVersion = async () => {
        if (!planData) return;

        const confirmed = confirm(
            `¿Crear una nueva versión del plan "${planData.name}"? Esto creará un nuevo plan con los mismos datos pero permitirá cambiar precios sin afectar a los usuarios actuales.`
        );

        if (!confirmed) return;

        try {
            setIsLoading(true);
            const response = await fetch('/api/plans', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...planData,
                    name: `${planData.name} (Nueva Versión)`,
                    slug: `${planData.slug}-nueva-version-${Date.now()}`,
                    stripe_price_id: null, // Se creará automáticamente
                    stripe_product_id: null, // Se creará automáticamente
                    active: true,
                    popular: false,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al crear nueva versión');
            }

            const newPlan = await response.json();
            toast.success('Nueva versión del plan creada exitosamente');
            router.push(`/admin/plans/${newPlan.id}/edit`);
        } catch (error) {
            console.error('Error creating new version:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Error al crear nueva versión'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleServicesChange = (services: ServiceWithPlanConfig[]) => {
        setPlanServices(services);
    };

    if (isLoadingData) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                    <p className="mt-2 text-sm text-muted-foreground">Cargando datos del plan...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/plans">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Planes
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isEdit ? 'Editar Plan' : 'Crear Nuevo Plan'}
                    </h1>
                    <p className="text-muted-foreground">
                        {isEdit
                            ? 'Modifica la información del plan'
                            : 'Crea un nuevo plan de suscripción para la plataforma'
                        }
                    </p>
                    {isEdit && planData && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${planData.active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                {planData.active ? "Activo" : "Archivado"}
                            </span>
                            {(planData._count?.subscriptions ?? 0) > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border">
                                    {(planData._count?.subscriptions ?? 0)} suscripciones activas
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Información Básica */}
                <Card>
                    <CardHeader>
                        <CardTitle>Información Básica</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ZenInput
                                id="name"
                                label="Nombre del Plan"
                                required
                                {...register('name')}
                                placeholder="Ej: Plan Básico"
                                error={errors.name?.message}
                            />

                            <ZenInput
                                id="slug"
                                label="Slug"
                                required
                                {...register('slug')}
                                placeholder="plan-basico"
                                error={errors.slug?.message}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                {...register('description')}
                                placeholder="Describe las características principales del plan..."
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Precios */}
                <Card>
                    <CardHeader>
                        <CardTitle>Precios</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ZenInput
                                id="price_monthly"
                                label="Precio Mensual (MXN)"
                                type="number"
                                step="0.01"
                                min="0"
                                {...register('price_monthly')}
                                placeholder="599.00"
                                error={errors.price_monthly?.message}
                            />

                            <ZenInput
                                id="price_yearly"
                                label="Precio Anual (MXN)"
                                type="number"
                                step="0.01"
                                min="0"
                                {...register('price_yearly')}
                                placeholder="5990.00"
                                error={errors.price_yearly?.message}
                            />
                        </div>
                    </CardContent>
                </Card>


                {/* Límites del Plan */}
                <PlanServicesList
                    planId={planId}
                    isEdit={isEdit}
                    onServicesChange={handleServicesChange}
                />

                {/* Integración Stripe - Solo Lectura */}
                <Card className="border border-zinc-700 bg-zinc-900/30">
                    <CardHeader className="bg-zinc-800/20">
                        <CardTitle className="text-white flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            Integración con Stripe
                        </CardTitle>
                        <p className="text-sm text-zinc-400">
                            Información de sincronización automática con Stripe
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-300">Stripe Product ID</Label>
                                <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-md">
                                    <code className="text-sm text-zinc-200 font-mono">
                                        {watch('stripe_product_id') || 'No configurado'}
                                    </code>
                                </div>
                                <p className="text-xs text-zinc-500">
                                    Se crea automáticamente al guardar el plan
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-zinc-300">Stripe Price ID</Label>
                                <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-md">
                                    <code className="text-sm text-zinc-200 font-mono">
                                        {watch('stripe_price_id') || 'No configurado'}
                                    </code>
                                </div>
                                <p className="text-xs text-zinc-500">
                                    Se actualiza automáticamente al cambiar precios
                                </p>
                            </div>
                        </div>

                        <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-md">
                            <div className="flex items-start gap-2">
                                <div className="w-4 h-4 rounded-full bg-blue-500 mt-0.5"></div>
                                <div className="text-sm text-blue-200">
                                    <p className="font-medium mb-1">Sincronización Automática</p>
                                    <p className="text-blue-300/80">
                                        Los precios se sincronizan automáticamente con Stripe.
                                        Al cambiar precios, se crea un nuevo precio en Stripe manteniendo compatibilidad.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Configuración */}
                <Card>
                    <CardHeader>
                        <CardTitle>Configuración</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Plan Popular</Label>
                                <p className="text-sm text-muted-foreground">
                                    Marcar como plan destacado
                                </p>
                            </div>
                            <Switch
                                checked={watch('popular')}
                                onCheckedChange={(checked) => setValue('popular', checked)}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Plan Activo</Label>
                                <p className="text-sm text-muted-foreground">
                                    El plan estará disponible para suscripciones
                                </p>
                            </div>
                            <Switch
                                checked={watch('active')}
                                onCheckedChange={(checked) => setValue('active', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Botones de Acción */}
                <div className="flex justify-between">
                    {/* Botones de gestión (solo en modo edit) */}
                    {isEdit && planData && (
                        <div className="flex gap-2">
                            {/* Botón Eliminar - Solo si no tiene suscripciones */}
                            {(planData._count?.subscriptions ?? 0) === 0 && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleDeletePlan}
                                    disabled={isLoading}
                                >
                                    Eliminar Plan
                                </Button>
                            )}

                            {/* Botón Archivar/Activar - Siempre disponible */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleArchivePlan}
                                disabled={isLoading}
                            >
                                {planData.active ? 'Archivar Plan' : 'Activar Plan'}
                            </Button>
                            {((planData._count?.subscriptions) ?? 0) > 0 && (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCreateNewVersion}
                                        disabled={isLoading}
                                    >
                                        Crear Nueva Versión
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowMigrationModal(true)}
                                        disabled={isLoading}
                                    >
                                        Migrar Suscripciones
                                    </Button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Botones principales */}
                    <div className="flex gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push('/admin/plans')}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {isEdit ? 'Actualizando...' : 'Creando...'}
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isEdit ? 'Actualizar Plan' : 'Crear Plan'}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>

            {/* Modal de migración */}
            <PlanMigrationModal
                isOpen={showMigrationModal}
                onClose={() => setShowMigrationModal(false)}
                planId={planId}
                onMigrationComplete={() => {
                    // Recargar datos del plan después de la migración
                    if (isEdit) {
                        fetchPlan();
                    }
                }}
            />

            <SimpleLimitsModal
                isOpen={showSimpleLimitsModal}
                onClose={() => setShowSimpleLimitsModal(false)}
                limits={limits}
                onSave={handleLimitsSave}
            />
        </div>
    );
}
