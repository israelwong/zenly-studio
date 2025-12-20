'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { ZenInput } from '@/components/ui/zen';
import { Switch } from '@/components/ui/shadcn/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select';
import { Badge } from '@/components/ui/shadcn/badge';
import {
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
    ServiceWithPlanConfig,
    UnidadMedida,
    UNIDAD_MEDIDA_LABELS,
    formatLimite
} from '../../../types/plan-services';

interface PlanServicesListProps {
    planId: string;
    isEdit?: boolean;
    onServicesChange?: (services: ServiceWithPlanConfig[]) => void;
}

export function PlanServicesList({ planId, isEdit = true, onServicesChange }: PlanServicesListProps) {
    const [services, setServices] = useState<ServiceWithPlanConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    const fetchAllServices = useCallback(async () => {
        try {
            setIsLoading(true);
            console.log('Fetching all services for new plan');

            const response = await fetch('/api/services');
            if (!response.ok) {
                throw new Error('Error al cargar servicios');
            }

            const allServices = await response.json();
            console.log('Received all services:', allServices);

            // Convertir a formato ServiceWithPlanConfig con planService null
            const servicesWithConfig: ServiceWithPlanConfig[] = allServices.map((service: ServiceWithPlanConfig) => ({
                ...service,
                planService: null
            }));

            setServices(servicesWithConfig);
        } catch (error) {
            console.error('Error fetching all services:', error);
            toast.error('Error al cargar servicios');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchPlanServices = useCallback(async () => {
        try {
            setIsLoading(true);
            console.log('Fetching services for plan:', planId);

            const response = await fetch(`/api/plans/${planId}/services`);
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (response.ok) {
                const data = await response.json();
                console.log('Received data:', data);
                setServices(data);
            } else {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                    console.error('Error parsing JSON response:', jsonError);
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                console.error('API Error:', errorData);
                console.error('Response status:', response.status);
                console.error('Response headers:', Object.fromEntries(response.headers.entries()));
                throw new Error(errorData.error || `Error al cargar servicios del plan (${response.status})`);
            }
        } catch (error) {
            console.error('Error fetching plan services:', error);
            if (error instanceof Error && error.message.includes('404')) {
                toast.error('Plan no encontrado. Por favor, crea un plan primero.');
            } else {
                toast.error('Error al cargar servicios del plan');
            }
        } finally {
            setIsLoading(false);
        }
    }, [planId]);

    useEffect(() => {
        if (isEdit) {
            fetchPlanServices();
        } else {
            fetchAllServices();
        }
    }, [planId, isEdit, fetchPlanServices, fetchAllServices]);

    // Notificar cambios al componente padre
    useEffect(() => {
        if (onServicesChange && services.length > 0) {
            onServicesChange(services);
        }
    }, [services, onServicesChange]);

    const updateServiceConfig = async (serviceId: string, updates: { active?: boolean; limite?: number | null; unidad?: UnidadMedida | null }) => {
        if (!isEdit) {
            // En modo creación, solo actualizar el estado local
            setServices(prevServices =>
                prevServices.map(service => {
                    if (service.id === serviceId) {
                        const currentConfig = service.planService || {
                            id: '',
                            plan_id: planId,
                            service_id: serviceId,
                            active: false,
                            limite: null,
                            unidad: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            service: service
                        };

                        return {
                            ...service,
                            planService: {
                                ...currentConfig,
                                ...updates
                            }
                        };
                    }
                    return service;
                })
            );
            return;
        }

        try {
            setSaving(serviceId);

            const response = await fetch(`/api/plans/${planId}/services`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    service_id: serviceId,
                    ...updates
                }),
            });

            if (!response.ok) {
                throw new Error('Error al actualizar configuración');
            }

            const updatedPlanService = await response.json();

            // Actualizar estado local
            setServices(prev => prev.map(service =>
                service.id === serviceId
                    ? { ...service, planService: updatedPlanService }
                    : service
            ));

            toast.success('Configuración actualizada');
        } catch (error) {
            console.error('Error updating service config:', error);
            toast.error('Error al actualizar configuración');
        } finally {
            setSaving(null);
        }
    };

    const handleToggleActive = async (serviceId: string, active: boolean) => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return;

        const updates = {
            active,
            limite: active ? (service.planService?.limite ?? null) : null,
            unidad: active ? (service.planService?.unidad ?? null) : null
        };

        await updateServiceConfig(serviceId, updates);
    };

    const handleLimiteChange = async (serviceId: string, limite: string) => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return;

        const limiteValue = limite === '' ? null : parseInt(limite);

        await updateServiceConfig(serviceId, {
            active: service.planService?.active ?? false,
            limite: limiteValue,
            unidad: service.planService?.unidad ?? null
        });
    };

    const handleUnidadChange = async (serviceId: string, unidad: UnidadMedida | null) => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return;

        await updateServiceConfig(serviceId, {
            active: service.planService?.active ?? false,
            limite: service.planService?.limite ?? null,
            unidad
        });
    };

    if (isLoading) {
        return (
            <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="border-b border-zinc-800">
                    <CardTitle className="text-lg font-semibold text-white">Servicios del Plan</CardTitle>
                    <div className="text-sm text-zinc-400">
                        Cargando servicios...
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-zinc-800">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center justify-between p-4 animate-pulse">
                                <div className="flex items-center space-x-4">
                                    <div className="h-4 w-4 bg-zinc-700 rounded"></div>
                                    <div className="h-4 w-6 bg-zinc-700 rounded"></div>
                                    <div className="h-4 w-4 bg-zinc-700 rounded-full"></div>
                                    <div className="h-4 bg-zinc-700 rounded w-32"></div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="h-6 w-16 bg-zinc-700 rounded"></div>
                                    <div className="h-6 w-16 bg-zinc-700 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Si no hay servicios y no está cargando, mostrar mensaje apropiado
    if (services.length === 0 && !isLoading) {
        return (
            <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="border-b border-zinc-800">
                    <CardTitle className="text-lg font-semibold text-white">Servicios del Plan</CardTitle>
                    <div className="text-sm text-zinc-400">
                        Configura qué servicios están disponibles en este plan y sus límites
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="text-center py-12">
                        <div className="text-zinc-400">
                            <p className="text-sm mb-2 text-white">No se pudieron cargar los servicios del plan.</p>
                            <p className="text-xs text-zinc-400">Verifica que el plan existe y tiene una configuración válida.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Agrupar servicios por categoría
    const servicesByCategory = services.reduce((acc, service) => {
        const categoryName = service.category?.name || 'Sin categoría';
        if (!acc[categoryName]) {
            acc[categoryName] = {
                category: service.category,
                services: []
            };
        }
        acc[categoryName].services.push(service);
        return acc;
    }, {} as Record<string, { category: ServiceWithPlanConfig['category']; services: ServiceWithPlanConfig[] }>);

    // Debug: Log para verificar agrupaciones
    console.log('Services grouped by category:', servicesByCategory);
    console.log('Number of categories:', Object.keys(servicesByCategory).length);

    // Ordenar categorías por posición y servicios dentro de cada categoría
    const sortedCategories = Object.entries(servicesByCategory)
        .sort(([, a], [, b]) => {
            const aPos = a.category?.posicion || 999;
            const bPos = b.category?.posicion || 999;
            return aPos - bPos;
        })
        .map(([categoryName, data]) => ({
            name: categoryName,
            ...data,
            services: data.services.sort((a, b) => a.posicion - b.posicion)
        }));

    return (
        <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-zinc-800">
                <CardTitle className="text-lg font-semibold text-white">Servicios del Plan</CardTitle>
                <div className="text-sm text-zinc-400">
                    {isEdit
                        ? "Configura qué servicios están disponibles en este plan y sus límites"
                        : "Configura qué servicios estarán disponibles en este plan y sus límites. Los cambios se guardarán al crear el plan."
                    }
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {sortedCategories.map((categoryData, categoryIndex) => (
                    <div key={categoryData.name} className={`${categoryIndex > 0 ? 'mt-6' : ''}`}>
                        {/* Header de categoría */}
                        <div className="px-4 py-4 bg-zinc-800/40 border-b border-zinc-700">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm"></div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white text-base">{categoryData.name}</h3>
                                    {categoryData.category?.description && (
                                        <p className="text-xs text-zinc-400 mt-1">
                                            {categoryData.category.description}
                                        </p>
                                    )}
                                </div>
                                <Badge variant="outline" className="text-xs bg-zinc-700/50 border-zinc-600">
                                    {categoryData.services.length} servicios
                                </Badge>
                            </div>
                        </div>

                        {/* Servicios de la categoría - Versión Simplificada */}
                        <div className="divide-y divide-zinc-800">
                            {categoryData.services.map((service) => {
                                const isActive = service.planService?.active ?? false;
                                const isSaving = saving === service.id;

                                return (
                                    <div
                                        key={service.id}
                                        className={`p-4 hover:bg-zinc-800/50 transition-colors ${isActive
                                            ? 'border-l-4 border-l-green-500'
                                            : ''
                                            }`}
                                    >
                                        {/* Fila simplificada: Switch | Nombre | Límite | Unidad | Resumen */}
                                        <div className="flex items-center gap-4">
                                            {/* Switch */}
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={isActive}
                                                    onCheckedChange={(checked) => handleToggleActive(service.id, checked)}
                                                    disabled={isSaving}
                                                />
                                                {isSaving && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
                                            </div>

                                            {/* Nombre del servicio */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-white truncate">{service.name}</h3>
                                                {service.description && (
                                                    <p className="text-xs text-zinc-400 truncate mt-1">
                                                        {service.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Límite (máximo 3 dígitos) */}
                                            <div className="w-20">
                                                <ZenInput
                                                    type="number"
                                                    placeholder="∞"
                                                    value={service.planService?.limite ?? ''}
                                                    onChange={(e) => handleLimiteChange(service.id, e.target.value)}
                                                    disabled={isSaving || !isActive}
                                                    className="bg-zinc-900 border-zinc-700 text-white text-center"
                                                    maxLength={3}
                                                />
                                            </div>

                                            {/* Unidad de medida */}
                                            <div className="w-32">
                                                <Select
                                                    value={service.planService?.unidad ?? ''}
                                                    onValueChange={(value) => handleUnidadChange(service.id, value as UnidadMedida || null)}
                                                    disabled={isSaving || !isActive}
                                                >
                                                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white h-9">
                                                        <SelectValue placeholder="Unidad" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-zinc-700">
                                                        {Object.entries(UNIDAD_MEDIDA_LABELS).map(([value, label]) => (
                                                            <SelectItem key={value} value={value} className="text-white hover:bg-zinc-800">
                                                                {label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Resumen de configuración */}
                                            <div className="w-32 text-right">
                                                {isActive && service.planService ? (
                                                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-200 text-xs">
                                                        {formatLimite(service.planService.limite, service.planService.unidad)}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-zinc-500">Inactivo</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
