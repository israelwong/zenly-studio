'use client';

import React, { useState } from 'react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Switch } from '@/components/ui/shadcn/switch';
import { Label } from '@/components/ui/shadcn/label';
import { ArrowLeft, Save, User, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface CreatedAgent {
    id: string;
    nombre: string;
    email: string;
    authUser: {
        email: string;
        tempPassword: string;
    };
}

export default function NewAgentPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [createdAgent, setCreatedAgent] = useState<CreatedAgent | null>(null);
    const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        telefono: '',
        activo: true,
        metaMensualLeads: 20,
        comisionConversion: 0.05
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch('/api/admin/agents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error response:', errorData);
                throw new Error(errorData.error || 'Error al crear el agente');
            }

            const data = await response.json();
            setCreatedAgent(data);
            toast.success('Agente creado exitosamente');

            // Mostrar las credenciales temporales
            if (data.authUser?.tempPassword) {
                toast.info(`Credenciales generadas para ${data.authUser.email}`);
            }
        } catch (error) {
            console.error('Error creating agent:', error);
            toast.error('Error al crear el agente');
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

    const copyToClipboard = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedStates(prev => ({ ...prev, [key]: true }));
            toast.success('Copiado al portapapeles');

            // Reset the copied state after 2 seconds
            setTimeout(() => {
                setCopiedStates(prev => ({ ...prev, [key]: false }));
            }, 2000);
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            toast.error('Error al copiar al portapapeles');
        }
    };

    const copyAllCredentials = () => {
        if (!createdAgent?.authUser) return;

        const credentials = `
🔐 CREDENCIALES DE ACCESO - PROSOCIAL PLATFORM

👤 Agente: ${createdAgent.nombre}
📧 Email: ${createdAgent.authUser.email}
🔑 Contraseña Temporal: ${createdAgent.authUser.tempPassword}
🌐 URL de Acceso: ${typeof window !== 'undefined' ? window.location.origin : ''}/agente

⚠️ IMPORTANTE:
• Esta contraseña es temporal y debe ser cambiada en el primer inicio de sesión
• Guarda estas credenciales en un lugar seguro
• No compartas esta información por canales no seguros

📱 Soporte: Si tienes problemas para acceder, contacta al administrador del sistema.
        `.trim();

        copyToClipboard(credentials, 'all');
    };

    // Si el agente fue creado, mostrar las credenciales
    if (createdAgent) {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <ZenButton variant="ghost" size="sm" asChild icon={ArrowLeft} iconPosition="left">
                        <Link href="/admin/agents">
                            Volver a Agentes
                        </Link>
                    </ZenButton>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Agente Creado Exitosamente</h1>
                        <p className="text-muted-foreground">
                            Credenciales de acceso generadas
                        </p>
                    </div>
                </div>

                {/* Credenciales */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Credenciales de Acceso
                        </CardTitle>
                        <CardDescription>
                            Comparte estas credenciales con el agente para que pueda acceder al sistema
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 p-3 bg-muted rounded-md font-mono">
                                        {createdAgent.authUser.email}
                                    </div>
                                    <ZenButton
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(createdAgent.authUser.email, 'email')}
                                        className="shrink-0"
                                        icon={copiedStates.email ? Check : Copy}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Contraseña Temporal</Label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 p-3 bg-muted rounded-md font-mono">
                                        {createdAgent.authUser.tempPassword}
                                    </div>
                                    <ZenButton
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(createdAgent.authUser.tempPassword, 'password')}
                                        className="shrink-0"
                                        icon={copiedStates.password ? Check : Copy}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>URL de Acceso</Label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 p-3 bg-muted rounded-md font-mono">
                                    {typeof window !== 'undefined' ? window.location.origin : ''}/agente
                                </div>
                                <ZenButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(`${typeof window !== 'undefined' ? window.location.origin : ''}/agente`, 'url')}
                                    className="shrink-0"
                                    icon={copiedStates.url ? Check : Copy}
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                <strong>Importante:</strong> Estas credenciales son temporales.
                                El agente debe cambiar su contraseña en el primer inicio de sesión.
                            </p>
                        </div>

                        {/* Botón para copiar todas las credenciales */}
                        <div className="pt-4 border-t">
                            <ZenButton
                                onClick={copyAllCredentials}
                                fullWidth
                                variant="primary"
                                icon={copiedStates.all ? Check : Copy}
                                iconPosition="left"
                            >
                                {copiedStates.all ? 'Credenciales Copiadas' : 'Copiar Todas las Credenciales'}
                            </ZenButton>
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                Copia todas las credenciales en formato listo para compartir
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <ZenButton variant="ghost" size="sm" asChild icon={ArrowLeft} iconPosition="left">
                    <Link href="/admin/agents">
                        Volver
                    </Link>
                </ZenButton>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nuevo Agente</h1>
                    <p className="text-muted-foreground">
                        Crea un nuevo agente comercial para el sistema
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
                                        hint="Porcentaje de comisión por cada conversión exitosa"
                                        className="flex-1"
                                    />
                                    <span className="text-sm text-muted-foreground mt-8">
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
                    <ZenButton type="button" variant="outline" asChild>
                        <Link href="/admin/agents">Cancelar</Link>
                    </ZenButton>
                    <ZenButton type="submit" loading={isLoading} loadingText="Creando..." icon={Save} iconPosition="left">
                        Crear Agente
                    </ZenButton>
                </div>
            </form>
        </div>
    );
}
