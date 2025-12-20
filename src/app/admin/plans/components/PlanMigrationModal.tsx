"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { Loader2, Users, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Subscription {
    id: string;
    studioId: string;
    studioName: string;
    studioEmail: string;
    currentPeriodEnd: string;
}

interface Plan {
    id: string;
    name: string;
    active: boolean;
    price_monthly: number | null;
    price_yearly: number | null;
}

interface MigrationInfo {
    plan: Plan;
    activeSubscriptions: number;
    subscriptions: Subscription[];
}

interface MigrationResult {
    status: 'success' | 'error';
    subscriptionId: string;
    error?: string;
}

interface MigrationResponse {
    results: MigrationResult[];
    archivedOldPlan: boolean;
}

interface PlanMigrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    planId: string;
    onMigrationComplete?: () => void;
}

export function PlanMigrationModal({
    isOpen,
    onClose,
    planId,
    onMigrationComplete
}: PlanMigrationModalProps) {
    const [migrationInfo, setMigrationInfo] = useState<MigrationInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [selectedNewPlanId, setSelectedNewPlanId] = useState<string>('');
    const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);

    const fetchMigrationInfo = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/plans/${planId}/migrate-subscriptions`);

            if (!response.ok) {
                throw new Error('Error al cargar información de migración');
            }

            const data = await response.json();
            setMigrationInfo(data);
        } catch (error) {
            console.error('Error fetching migration info:', error);
            toast.error('Error al cargar información de migración');
        } finally {
            setIsLoading(false);
        }
    }, [planId]);

    const fetchAvailablePlans = useCallback(async () => {
        try {
            const response = await fetch('/api/plans');
            if (response.ok) {
                const plans = await response.json();
                // Filtrar planes activos y diferentes al actual
                const filteredPlans = plans.filter((plan: Plan) =>
                    plan.active && plan.id !== planId
                );
                setAvailablePlans(filteredPlans);
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
        }
    }, [planId]);

    useEffect(() => {
        if (isOpen && planId) {
            fetchMigrationInfo();
            fetchAvailablePlans();
        }
    }, [isOpen, planId, fetchMigrationInfo, fetchAvailablePlans]);

    const handleMigration = async () => {
        if (!selectedNewPlanId) {
            toast.error('Selecciona un plan de destino');
            return;
        }

        const confirmed = confirm(
            `¿Estás seguro de que quieres migrar ${migrationInfo?.activeSubscriptions} suscripciones al nuevo plan? Esta acción actualizará los precios para todos los usuarios activos.`
        );

        if (!confirmed) return;

        try {
            setIsMigrating(true);
            const response = await fetch(`/api/plans/${planId}/migrate-subscriptions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    newPlanId: selectedNewPlanId,
                    notifyUsers: true
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al migrar suscripciones');
            }

            const result: MigrationResponse = await response.json();

            // Mostrar resultados
            const successCount = result.results.filter((r: MigrationResult) => r.status === 'success').length;
            const errorCount = result.results.filter((r: MigrationResult) => r.status === 'error').length;

            toast.success(`Migración completada: ${successCount} exitosas, ${errorCount} con errores`);

            if (result.archivedOldPlan) {
                toast.info('Plan anterior archivado automáticamente');
            }

            onMigrationComplete?.();
            onClose();
        } catch (error) {
            console.error('Error migrating subscriptions:', error);
            toast.error(
                error instanceof Error ? error.message : 'Error al migrar suscripciones'
            );
        } finally {
            setIsMigrating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-zinc-900 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Migración de Suscripciones</h2>
                    <Button variant="ghost" onClick={onClose}>
                        <XCircle className="h-4 w-4" />
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Cargando información...</span>
                    </div>
                ) : migrationInfo ? (
                    <div className="space-y-6">
                        {/* Información del plan actual */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Plan Actual: {migrationInfo.plan.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Suscripciones Activas</p>
                                        <p className="text-2xl font-bold">{migrationInfo.activeSubscriptions}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Estado</p>
                                        <Badge variant={migrationInfo.plan.active ? "default" : "secondary"}>
                                            {migrationInfo.plan.active ? "Activo" : "Archivado"}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Selección de nuevo plan */}
                        {migrationInfo.activeSubscriptions > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Migrar a Nuevo Plan</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Seleccionar Plan de Destino
                                        </label>
                                        <select
                                            value={selectedNewPlanId}
                                            onChange={(e) => setSelectedNewPlanId(e.target.value)}
                                            className="w-full p-2 border border-zinc-700 rounded-md bg-zinc-800 text-white"
                                        >
                                            <option value="">Selecciona un plan...</option>
                                            {availablePlans.map((plan) => (
                                                <option key={plan.id} value={plan.id}>
                                                    {plan.name} -
                                                    {plan.price_monthly && ` $${plan.price_monthly}/mes`}
                                                    {plan.price_yearly && ` $${plan.price_yearly}/año`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedNewPlanId && (
                                        <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-md">
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-blue-400">Importante</p>
                                                    <p className="text-sm text-blue-300 mt-1">
                                                        Esta acción migrará todas las suscripciones activas al nuevo plan.
                                                        Los usuarios serán notificados por email sobre el cambio de precio.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleMigration}
                                        disabled={!selectedNewPlanId || isMigrating}
                                        className="w-full"
                                    >
                                        {isMigrating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Migrando...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Migrar Suscripciones
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Lista de suscripciones */}
                        {migrationInfo.subscriptions.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Suscripciones Activas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {migrationInfo.subscriptions.map((subscription) => (
                                            <div
                                                key={subscription.id}
                                                className="flex justify-between items-center p-3 bg-zinc-800 rounded-md"
                                            >
                                                <div>
                                                    <p className="font-medium">{subscription.studioName}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {subscription.studioEmail}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-muted-foreground">
                                                        Próximo pago
                                                    </p>
                                                    <p className="text-sm">
                                                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {migrationInfo.activeSubscriptions === 0 && (
                            <div className="text-center py-8">
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                <p className="text-lg font-medium">No hay suscripciones activas</p>
                                <p className="text-muted-foreground">
                                    Este plan no tiene suscripciones activas, por lo que se puede eliminar o archivar sin problemas.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-lg font-medium">Error al cargar información</p>
                        <p className="text-muted-foreground">
                            No se pudo cargar la información de migración del plan.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
