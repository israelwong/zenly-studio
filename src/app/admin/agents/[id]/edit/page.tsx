'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { ZenInput } from '@/components/ui/zen';
import { Label } from '@/components/ui/shadcn/label';
import { Switch } from '@/components/ui/shadcn/switch';
import { ArrowLeft, Save, User, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Agent {
    id: string;
    nombre: string;
    email: string;
    telefono: string;
    activo: boolean;
    metaMensualLeads: number;
    comisionConversion: number;
    createdAt: string;
    updatedAt: string;
}

export default function EditAgentPage() {
    const router = useRouter();
    const params = useParams();
    const agentId = params.id as string;

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        telefono: '',
        activo: true,
        metaMensualLeads: 20,
        comisionConversion: 0.05
    });

    // Cargar datos del agente
    useEffect(() => {
        const fetchAgent = async () => {
            try {
                const response = await fetch(`/api/admin/agents/${agentId}`);
                if (!response.ok) {
                    throw new Error('Error al cargar el agente');
                }
                const agent: Agent = await response.json();

                setFormData({
                    nombre: agent.nombre,
                    email: agent.email,
                    telefono: agent.telefono,
                    activo: agent.activo,
                    metaMensualLeads: agent.metaMensualLeads,
                    comisionConversion: agent.comisionConversion
                });
            } catch (error) {
                console.error('Error fetching agent:', error);
                toast.error('Error al cargar los datos del agente');
                router.push('/admin/agents');
            } finally {
                setIsLoadingData(false);
            }
        };

        if (agentId) {
            fetchAgent();
        }
    }, [agentId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`/api/admin/agents/${agentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Error al actualizar el agente');
            }

            toast.success('Agente actualizado exitosamente');
            router.push('/admin/agents');
        } catch (error) {
            console.error('Error updating agent:', error);
            toast.error('Error al actualizar el agente');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string | boolean | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (isLoadingData) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                    <p className="mt-2 text-sm text-muted-foreground">Cargando datos del agente...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/agents">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Editar Agente</h1>
                    <p className="text-muted-foreground">
                        Modifica la información del agente comercial
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Información Personal */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Información Personal
                            </CardTitle>
                            <CardDescription>
                                Datos básicos del agente comercial
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ZenInput
                                id="nombre"
                                label="Nombre Completo"
                                required
                                value={formData.nombre}
                                onChange={(e) => handleInputChange('nombre', e.target.value)}
                                placeholder="Ej: Juan Pérez"
                            />

                            <ZenInput
                                id="email"
                                label="Email"
                                required
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder="juan@ejemplo.com"
                            />

                            <ZenInput
                                id="telefono"
                                label="Teléfono"
                                required
                                value={formData.telefono}
                                onChange={(e) => handleInputChange('telefono', e.target.value)}
                                placeholder="+52 55 1234 5678"
                            />

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="activo">Estado</Label>
                                    <p className="text-sm text-muted-foreground">
                                        El agente está activo y puede recibir leads
                                    </p>
                                </div>
                                <Switch
                                    id="activo"
                                    checked={formData.activo}
                                    onCheckedChange={(checked: boolean) => handleInputChange('activo', checked)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configuración Comercial */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración Comercial</CardTitle>
                            <CardDescription>
                                Parámetros de rendimiento y comisiones
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ZenInput
                                id="metaMensualLeads"
                                label="Meta Mensual de Leads"
                                type="number"
                                min="1"
                                max="1000"
                                value={formData.metaMensualLeads}
                                onChange={(e) => handleInputChange('metaMensualLeads', parseInt(e.target.value) || 0)}
                                placeholder="20"
                                hint="Número de leads que debe gestionar mensualmente"
                            />

                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <ZenInput
                                        id="comisionConversion"
                                        label="Comisión por Conversión"
                                        type="number"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={formData.comisionConversion}
                                        onChange={(e) => handleInputChange('comisionConversion', parseFloat(e.target.value) || 0)}
                                        placeholder="0.05"
                                        className="flex-1"
                                        hint="Porcentaje de comisión por cada conversión exitosa"
                                    />
                                    <span className="text-sm text-muted-foreground mt-7">
                                        ({Math.round(formData.comisionConversion * 100)}%)
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 bg-muted rounded-lg">
                                <h4 className="font-medium mb-2">Resumen de Configuración</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span>Meta mensual:</span>
                                        <span className="font-medium">{formData.metaMensualLeads} leads</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Comisión:</span>
                                        <span className="font-medium">{Math.round(formData.comisionConversion * 100)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Estado:</span>
                                        <span className="font-medium">
                                            {formData.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4">
                    <Button type="button" variant="outline" asChild>
                        <Link href="/admin/agents">Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Actualizando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Actualizar Agente
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
