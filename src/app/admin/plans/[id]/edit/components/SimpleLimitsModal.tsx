"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/shadcn/button";
import { ZenInput } from "@/components/ui/zen";
import { Label } from "@/components/ui/shadcn/label";
import { Textarea } from "@/components/ui/shadcn/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/shadcn/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/shadcn/select";
import {
    Plus,
    Save,
    X,
    AlertCircle,
    CheckCircle,
    Trash2
} from "lucide-react";
import { toast } from "sonner";

// Interfaz para límites del plan
interface PlanLimit {
    limite: number | null;
    descripcion: string;
    unidad?: string;
}

// Interfaz para servicios
interface Service {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    active: boolean;
}

interface SimpleLimitsModalProps {
    isOpen: boolean;
    onClose: () => void;
    limits: Record<string, unknown>;
    onSave: (limits: Record<string, PlanLimit>) => void;
}

export function SimpleLimitsModal({ isOpen, onClose, limits, onSave }: SimpleLimitsModalProps) {
    const [availableServices, setAvailableServices] = useState<Service[]>([]);
    const [selectedServiceSlug, setSelectedServiceSlug] = useState<string>('');
    const [newLimit, setNewLimit] = useState<PlanLimit>({
        limite: null,
        descripcion: '',
        unidad: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    // Cargar servicios disponibles
    const fetchAvailableServices = useCallback(async () => {
        try {
            const response = await fetch('/api/services');
            if (response.ok) {
                const services = await response.json();
                setAvailableServices(services.filter((s: Service) => s.active));
            }
        } catch (error) {
            console.error('Error fetching services:', error);
            toast.error('Error al cargar servicios disponibles');
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchAvailableServices();
            // Reset form
            setSelectedServiceSlug('');
            setNewLimit({
                limite: null,
                descripcion: '',
                unidad: ''
            });
        }
    }, [isOpen, fetchAvailableServices]);

    const handleAddLimit = async () => {
        if (!selectedServiceSlug) {
            toast.error('Selecciona un servicio');
            return;
        }

        if (!newLimit.descripcion.trim()) {
            toast.error('La descripción es requerida');
            return;
        }

        setIsLoading(true);

        try {
            // Obtener límites actuales
            const currentLimits = { ...limits };
            
            // Agregar nuevo límite
            currentLimits[selectedServiceSlug] = { ...newLimit };
            
            // Guardar
            onSave(currentLimits);
            
            // Reset form
            setSelectedServiceSlug('');
            setNewLimit({
                limite: null,
                descripcion: '',
                unidad: ''
            });
            
            toast.success('Límite agregado exitosamente');
        } catch (error) {
            console.error('Error adding limit:', error);
            toast.error('Error al agregar límite');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveLimit = (serviceSlug: string) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar el límite para "${serviceSlug}"?`)) {
            return;
        }

        const currentLimits = { ...limits };
        delete currentLimits[serviceSlug];
        onSave(currentLimits);
        toast.success('Límite eliminado exitosamente');
    };

    const getServiceName = (slug: string) => {
        const service = availableServices.find(s => s.slug === slug);
        return service ? service.name : slug;
    };

    const getAvailableServicesForSelect = () => {
        const usedServices = Object.keys(limits);
        return availableServices.filter(service => !usedServices.includes(service.slug));
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Gestionar Límites del Plan
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Información */}
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                                <div className="text-sm text-blue-800 dark:text-blue-200">
                                    <p className="font-medium mb-1">¿Cómo funcionan los límites?</p>
                                    <ul className="space-y-1 text-xs">
                                        <li><strong>Límite = null:</strong> Ilimitado (sin restricciones)</li>
                                        <li><strong>Límite = 0:</strong> Sin acceso (funcionalidad deshabilitada)</li>
                                        <li><strong>Límite {'>'} 0:</strong> Número máximo permitido</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Límites existentes */}
                    {Object.keys(limits).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Límites Configurados</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {Object.entries(limits).map(([key, value]) => (
                                        <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-sm">{getServiceName(key)}</span>
                                                    {typeof value === 'object' && value !== null && 'limite' in value ? (
                                                        (value as PlanLimit).limite === null ? (
                                                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                                Ilimitado
                                                            </Badge>
                                                        ) : (value as PlanLimit).limite === 0 ? (
                                                            <Badge variant="destructive">
                                                                Sin acceso
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary">
                                                                Límite: {(value as PlanLimit).limite}
                                                            </Badge>
                                                        )
                                                    ) : (
                                                        <Badge variant="outline">
                                                            {String(value)}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {typeof value === 'object' && value !== null && 'descripcion' in value && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {(value as PlanLimit).descripcion}
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRemoveLimit(key)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Agregar nuevo límite */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Plus className="h-5 w-5" />
                                Agregar Nuevo Límite
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Seleccionar servicio */}
                            <div>
                                <Label htmlFor="service">Servicio</Label>
                                <Select value={selectedServiceSlug} onValueChange={setSelectedServiceSlug}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un servicio" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getAvailableServicesForSelect().map((service) => (
                                            <SelectItem key={service.id} value={service.slug}>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{service.name}</span>
                                                    {service.description && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {service.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Configurar límite */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <ZenInput
                                        id="limite"
                                        label="Límite"
                                        type="number"
                                        placeholder="ej: 10, 0 (sin acceso), vacío (ilimitado)"
                                        value={newLimit.limite === null ? '' : newLimit.limite}
                                        onChange={(e) => setNewLimit(prev => ({
                                            ...prev,
                                            limite: e.target.value === '' ? null : parseInt(e.target.value) || 0
                                        }))}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Deja vacío para ilimitado, 0 para sin acceso
                                    </p>
                                </div>
                                <div>
                                    <ZenInput
                                        id="unidad"
                                        label="Unidad (opcional)"
                                        placeholder="ej: GB, horas, usuarios"
                                        value={newLimit.unidad || ''}
                                        onChange={(e) => setNewLimit(prev => ({
                                            ...prev,
                                            unidad: e.target.value
                                        }))}
                                    />
                                </div>
                            </div>

                            {/* Descripción */}
                            <div>
                                <Label htmlFor="descripcion">Descripción</Label>
                                <Textarea
                                    id="descripcion"
                                    placeholder="Describe qué incluye este límite"
                                    value={newLimit.descripcion}
                                    onChange={(e) => setNewLimit(prev => ({
                                        ...prev,
                                        descripcion: e.target.value
                                    }))}
                                    rows={2}
                                />
                            </div>

                            {/* Botón agregar */}
                            <Button 
                                onClick={handleAddLimit} 
                                disabled={isLoading || !selectedServiceSlug || !newLimit.descripcion.trim()}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Agregando...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Agregar Límite
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
