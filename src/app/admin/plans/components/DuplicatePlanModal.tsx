"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/shadcn/dialog';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { Switch } from '@/components/ui/shadcn/switch';
import { Badge } from '@/components/ui/shadcn/badge';
import { Loader2, Copy, AlertTriangle } from 'lucide-react';
import { Plan } from '../types';

interface DuplicatePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: DuplicatePlanData) => void;
    plan: Plan | null;
    isDuplicating?: boolean;
}

interface DuplicatePlanData {
    name: string;
    slug: string;
    active: boolean;
    popular: boolean;
}

export function DuplicatePlanModal({
    isOpen,
    onClose,
    onConfirm,
    plan,
    isDuplicating = false
}: DuplicatePlanModalProps) {
    const [formData, setFormData] = useState<DuplicatePlanData>({
        name: '',
        slug: '',
        active: true,
        popular: false
    });

    // Actualizar formulario cuando cambie el plan
    React.useEffect(() => {
        if (plan) {
            setFormData({
                name: `${plan.name} (Copia)`,
                slug: `${plan.slug}-copia-${Date.now()}`,
                active: true,
                popular: false
            });
        }
    }, [plan]);

    const handleInputChange = (field: keyof DuplicatePlanData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!formData.name.trim()) {
            return;
        }
        onConfirm(formData);
    };

    const handleClose = () => {
        if (!isDuplicating) {
            onClose();
        }
    };

    if (!plan) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Copy className="h-5 w-5 text-blue-500" />
                        Duplicar Plan
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Información del plan original */}
                    <div className="p-4 bg-zinc-900/50 border border-zinc-700 rounded-lg">
                        <h3 className="font-medium text-white mb-2">Plan Original</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-400">Nombre:</span>
                                <span className="text-white">{plan.name}</span>
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

                    {/* Formulario de duplicación */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name" className="mb-2 block">Nombre del Plan Duplicado *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="Nombre del plan duplicado"
                                disabled={isDuplicating}
                                className="bg-zinc-900 border-zinc-700 text-white"
                            />
                        </div>

                        <div>
                            <Label htmlFor="slug" className="mb-2 block">Slug *</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => handleInputChange('slug', e.target.value)}
                                placeholder="slug-del-plan"
                                disabled={isDuplicating}
                                className="bg-zinc-900 border-zinc-700 text-white"
                            />
                            <p className="text-xs text-zinc-500 mt-1">
                                URL amigable para el plan (sin espacios, solo letras, números y guiones)
                            </p>
                        </div>


                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-700 rounded-lg">
                                <div>
                                    <Label htmlFor="active" className="text-sm font-medium">Plan Activo</Label>
                                    <p className="text-xs text-zinc-500">El plan estará disponible para suscripciones</p>
                                </div>
                                <Switch
                                    id="active"
                                    checked={formData.active}
                                    onCheckedChange={(checked) => handleInputChange('active', checked)}
                                    disabled={isDuplicating}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-700 rounded-lg">
                                <div>
                                    <Label htmlFor="popular" className="text-sm font-medium">Plan Popular</Label>
                                    <p className="text-xs text-zinc-500">Marcar como plan destacado</p>
                                </div>
                                <Switch
                                    id="popular"
                                    checked={formData.popular}
                                    onCheckedChange={(checked) => handleInputChange('popular', checked)}
                                    disabled={isDuplicating}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Información adicional */}
                    <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-blue-400 mt-0.5" />
                            <div className="text-sm text-blue-200">
                                <p className="font-medium mb-1">Información importante:</p>
                                <ul className="text-blue-300/80 space-y-1">
                                    <li>• Se duplicarán todos los servicios configurados del plan original</li>
                                    <li>• Los precios se mantendrán iguales al plan original</li>
                                    <li>• Se generarán nuevos IDs de Stripe automáticamente</li>
                                    <li>• Después de duplicar, se abrirá automáticamente en modo de edición</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isDuplicating}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isDuplicating || !formData.name.trim() || !formData.slug.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isDuplicating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Copy className="mr-2 h-4 w-4" />
                        {isDuplicating ? 'Duplicando...' : 'Duplicar Plan'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
