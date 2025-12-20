'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Switch } from '@/components/ui/shadcn/switch';
import { Label } from '@/components/ui/shadcn/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Separator } from '@/components/ui/shadcn/separator';
import { toast } from 'sonner';
import { Plan } from '../types';

// Schema de validación
const planSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo'),
    slug: z.string()
        .min(1, 'El slug es requerido')
        .max(50, 'El slug es muy largo')
        .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones'),
    description: z.string().optional(),
    price_monthly: z.number().min(0, 'El precio mensual debe ser mayor o igual a 0').optional(),
    price_yearly: z.number().min(0, 'El precio anual debe ser mayor o igual a 0').optional(),
    popular: z.boolean(),
    active: z.boolean(),
    stripe_price_id: z.string().optional(),
    stripe_product_id: z.string().optional(),
    features: z.array(z.string()),
    limits: z.record(z.string(), z.unknown()).optional()
});

type PlanFormData = z.infer<typeof planSchema>;

interface PlanFormProps {
    plan?: Plan;
    mode: 'create' | 'edit';
}

export function PlanForm({ plan, mode }: PlanFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [features, setFeatures] = useState<string[]>(plan?.features as string[] || []);
    const [newFeature, setNewFeature] = useState('');
    const [limits, setLimits] = useState<Record<string, unknown>>(plan?.limits as Record<string, unknown> || {});

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch
    } = useForm<PlanFormData>({
        resolver: zodResolver(planSchema),
        defaultValues: {
            name: plan?.name || '',
            slug: plan?.slug || '',
            description: plan?.description || '',
            price_monthly: plan?.price_monthly || undefined,
            price_yearly: plan?.price_yearly || undefined,
            popular: plan?.popular || false,
            active: plan?.active ?? true,
            stripe_price_id: plan?.stripe_price_id || '',
            stripe_product_id: plan?.stripe_product_id || '',
            features: plan?.features as string[] || [],
            limits: plan?.limits as Record<string, unknown> || {}
        }
    });

    // Auto-generar slug desde el nombre
    const watchedName = watch('name');
    useEffect(() => {
        if (mode === 'create' && watchedName) {
            const slug = watchedName
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
            setValue('slug', slug);
        }
    }, [watchedName, setValue, mode]);

    // Agregar característica
    const addFeature = () => {
        if (newFeature.trim()) {
            const updatedFeatures = [...features, newFeature.trim()];
            setFeatures(updatedFeatures);
            setValue('features', updatedFeatures);
            setNewFeature('');
        }
    };

    // Eliminar característica
    const removeFeature = (index: number) => {
        const updatedFeatures = features.filter((_, i) => i !== index);
        setFeatures(updatedFeatures);
        setValue('features', updatedFeatures);
    };

    // Agregar límite
    const addLimit = () => {
        const key = prompt('Nombre del límite:');
        const value = prompt('Valor del límite:');
        if (key && value) {
            const updatedLimits = { ...limits, [key]: value };
            setLimits(updatedLimits);
            setValue('limits', updatedLimits);
        }
    };

    // Eliminar límite
    const removeLimit = (key: string) => {
        const updatedLimits = { ...limits };
        delete updatedLimits[key];
        setLimits(updatedLimits);
        setValue('limits', updatedLimits);
    };

    const onSubmit = async (data: PlanFormData) => {
        setIsSubmitting(true);

        try {
            const url = mode === 'create' ? '/api/plans' : `/api/plans/${plan?.id}`;
            const method = mode === 'create' ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    features: features,
                    limits: limits
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al guardar el plan');
            }

            await response.json();

            toast.success(
                mode === 'create'
                    ? 'Plan creado exitosamente'
                    : 'Plan actualizado exitosamente'
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
            setIsSubmitting(false);
        }
    };

    return (
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
                            label="Precio Mensual"
                            type="number"
                            step="0.01"
                            min="0"
                            {...register('price_monthly', { valueAsNumber: true })}
                            placeholder="29.99"
                            error={errors.price_monthly?.message}
                        />

                        <ZenInput
                            id="price_yearly"
                            label="Precio Anual"
                            type="number"
                            step="0.01"
                            min="0"
                            {...register('price_yearly', { valueAsNumber: true })}
                            placeholder="299.99"
                            error={errors.price_yearly?.message}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Características */}
            <Card>
                <CardHeader>
                    <CardTitle>Características del Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <ZenInput
                            value={newFeature}
                            onChange={(e) => setNewFeature(e.target.value)}
                            placeholder="Agregar característica..."
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                        />
                        <ZenButton type="button" onClick={addFeature} variant="outline">
                            Agregar
                        </ZenButton>
                    </div>

                    <div className="space-y-2">
                        {features.map((feature, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                <span className="text-sm">{feature}</span>
                                <ZenButton
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFeature(index)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    Eliminar
                                </ZenButton>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Límites */}
            <Card>
                <CardHeader>
                    <CardTitle>Límites del Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ZenButton type="button" onClick={addLimit} variant="outline">
                        Agregar Límite
                    </ZenButton>

                    <div className="space-y-2">
                        {Object.entries(limits).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                                <span className="text-sm">
                                    <strong>{key}:</strong> {String(value)}
                                </span>
                                <ZenButton
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeLimit(key)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    Eliminar
                                </ZenButton>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Integración Stripe */}
            <Card>
                <CardHeader>
                    <CardTitle>Integración con Stripe</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ZenInput
                            id="stripe_price_id"
                            label="Stripe Price ID"
                            {...register('stripe_price_id')}
                            placeholder="price_1S73QoHxyreVzp11ZcP1hGea"
                        />

                        <ZenInput
                            id="stripe_product_id"
                            label="Stripe Product ID"
                            {...register('stripe_product_id')}
                            placeholder="prod_T39jUez5Bkutia"
                        />
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
                            {...register('popular')}
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
                            {...register('active')}
                            onCheckedChange={(checked) => setValue('active', checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Botones de Acción */}
            <div className="flex justify-end gap-4">
                <ZenButton
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/admin/plans')}
                >
                    Cancelar
                </ZenButton>
                <ZenButton type="submit" loading={isSubmitting} loadingText="Guardando...">
                    {mode === 'create' ? 'Crear Plan' : 'Actualizar Plan'}
                </ZenButton>
            </div>
        </form>
    );
}
