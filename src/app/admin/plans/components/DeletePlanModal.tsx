"use client";

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/shadcn/dialog';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { Loader2, Trash2, AlertTriangle, Users, Building2 } from 'lucide-react';
import { Plan } from '../types';

interface DeletePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    plan: Plan | null;
    isDeleting?: boolean;
}

export function DeletePlanModal({
    isOpen,
    onClose,
    onConfirm,
    plan,
    isDeleting = false
}: DeletePlanModalProps) {
    const handleClose = () => {
        if (!isDeleting) {
            onClose();
        }
    };

    if (!plan) return null;

    const hasActiveSubscriptions = (plan._count?.subscriptions || 0) > 0;
    const hasProjects = (plan._count?.projects || 0) > 0;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-red-500" />
                        Eliminar Plan
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Información del plan a eliminar */}
                    <div className="p-4 bg-zinc-900/50 border border-zinc-700 rounded-lg">
                        <h3 className="font-medium text-white mb-3">Plan a Eliminar</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-400">Nombre:</span>
                                <span className="text-white font-medium">{plan.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-400">Slug:</span>
                                <code className="text-blue-400 bg-zinc-800 px-2 py-1 rounded text-xs">
                                    {plan.slug}
                                </code>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-400">Precio mensual:</span>
                                <span className="text-white">
                                    {plan.price_monthly ? `$${plan.price_monthly.toLocaleString('en-US')}` : 'Gratis'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-400">Precio anual:</span>
                                <span className="text-white">
                                    {plan.price_yearly ? `$${plan.price_yearly.toLocaleString('en-US')}` : 'Gratis'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Estadísticas del plan */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-zinc-900/50 border border-zinc-700 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="h-4 w-4 text-blue-400" />
                                <span className="text-sm text-zinc-400">Suscripciones</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold text-white">
                                    {plan._count?.subscriptions || 0}
                                </span>
                                {hasActiveSubscriptions && (
                                    <Badge variant="destructive" className="text-xs">
                                        Activas
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="p-3 bg-zinc-900/50 border border-zinc-700 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <Building2 className="h-4 w-4 text-green-400" />
                                <span className="text-sm text-zinc-400">Estudios</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold text-white">
                                    {plan._count?.projects || 0}
                                </span>
                                {hasProjects && (
                                    <Badge variant="secondary" className="text-xs">
                                        Asociados
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Advertencias */}
                    {hasActiveSubscriptions && (
                        <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5" />
                                <div className="text-sm text-red-200">
                                    <p className="font-medium mb-1">⚠️ Advertencia Crítica</p>
                                    <p className="text-red-300/80">
                                        Este plan tiene <strong>{plan._count?.subscriptions}</strong> suscripción(es) activa(s). 
                                        Eliminar este plan puede afectar a usuarios existentes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {hasProjects && !hasActiveSubscriptions && (
                        <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5" />
                                <div className="text-sm text-yellow-200">
                                    <p className="font-medium mb-1">⚠️ Advertencia</p>
                                    <p className="text-yellow-300/80">
                                        Este plan está asociado a <strong>{plan._count?.projects}</strong> estudio(s). 
                                        La eliminación puede afectar la configuración de estos estudios.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Información sobre la eliminación */}
                    <div className="p-4 bg-zinc-900/30 border border-zinc-700/50 rounded-lg">
                        <div className="text-sm text-zinc-300">
                            <p className="font-medium mb-2">¿Qué sucederá al eliminar este plan?</p>
                            <ul className="space-y-1 text-zinc-400">
                                <li>• El plan será eliminado permanentemente</li>
                                <li>• Se eliminarán todas las configuraciones de servicios asociadas</li>
                                <li>• Los datos de Stripe relacionados se mantendrán por compatibilidad</li>
                                <li>• Las suscripciones activas <strong>NO</strong> se eliminarán automáticamente</li>
                            </ul>
                        </div>
                    </div>

                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isDeleting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isDeleting ? 'Eliminando...' : 'Eliminar Plan'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
