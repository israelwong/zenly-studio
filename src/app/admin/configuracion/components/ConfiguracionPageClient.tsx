"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { ZenInput } from '@/components/ui/zen';
import { Label } from '@/components/ui/shadcn/label';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
import { toast } from 'sonner';
import { Loader2, Save, Building2, Phone, Headphones, MapPin, Share2, FileText, Search, Settings } from 'lucide-react';

interface PlatformConfig {
    id: string;
    // Branding
    company_name: string;
    company_name_long: string | null;
    commercial_name: string | null;
    commercial_name_short: string | null;
    domain: string | null;
    // Assets
    logo_url: string | null;
    favicon_url: string | null;
    // Contacto comercial
    comercial_email: string | null;
    comercial_whatsapp: string | null;
    commercial_phone: string | null;
    // Soporte
    soporte_email: string | null;
    soporte_chat_url: string | null;
    support_phone: string | null;
    // Ubicación
    address: string | null;
    business_hours: string | null;
    timezone: string;
    // Redes sociales (deprecated)
    facebook_url: string | null;
    instagram_url: string | null;
    twitter_url: string | null;
    linkedin_url: string | null;
    // Legal (deprecated)
    terminos_condiciones: string | null;
    politica_privacidad: string | null;
    aviso_legal: string | null;
    // SEO
    meta_description: string | null;
    meta_keywords: string | null;
    // Analytics (deprecated)
    google_analytics_id: string | null;
    google_tag_manager_id: string | null;
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

interface ConfiguracionPageClientProps {
    initialConfig: PlatformConfig | null;
}

const timezones = [
    { value: 'America/Mexico_City', label: 'México (CDMX)' },
    { value: 'America/New_York', label: 'Nueva York (EST)' },
    { value: 'America/Los_Angeles', label: 'Los Ángeles (PST)' },
    { value: 'America/Chicago', label: 'Chicago (CST)' },
    { value: 'Europe/Madrid', label: 'Madrid (CET)' },
    { value: 'Europe/London', label: 'Londres (GMT)' },
];

export function ConfiguracionPageClient({ initialConfig }: ConfiguracionPageClientProps) {
    const [config, setConfig] = useState<PlatformConfig | null>(initialConfig);
    const [loading, setLoading] = useState(false);

    const handleInputChange = (field: keyof PlatformConfig, value: string) => {
        if (config) {
            setConfig({
                ...config,
                [field]: value
            });
        }
    };

    const handleSave = async () => {
        if (!config) return;

        setLoading(true);
        try {
            const response = await fetch('/api/platform-config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...config,
                    updatedAt: new Date().toISOString()
                }),
            });

            if (!response.ok) {
                throw new Error('Error al guardar la configuración');
            }

            toast.success('Configuración guardada exitosamente');
        } catch (error) {
            console.error('Error saving config:', error);
            toast.error('Error al guardar la configuración');
        } finally {
            setLoading(false);
        }
    };

    if (!config) {
        return (
            <Card className="border border-border bg-card">
                <CardContent className="p-6">
                    <div className="text-center">
                        <p className="text-zinc-400">No se encontró configuración de la plataforma</p>
                        <p className="text-sm text-zinc-500 mt-2">
                            Contacta al administrador del sistema
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border border-border bg-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Building2 className="w-5 h-5" />
                                Configuración de la Plataforma
                            </CardTitle>
                            <CardDescription className="text-zinc-400">
                                Gestiona la configuración general de la plataforma
                            </CardDescription>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Guardar Cambios
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-6 bg-zinc-800">
                            <TabsTrigger value="general" className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                General
                            </TabsTrigger>
                            <TabsTrigger value="comercial" className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                Comercial
                            </TabsTrigger>
                            <TabsTrigger value="soporte" className="flex items-center gap-2">
                                <Headphones className="w-4 h-4" />
                                Soporte
                            </TabsTrigger>
                            <TabsTrigger value="ubicacion" className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Ubicación
                            </TabsTrigger>
                            <TabsTrigger value="redes" className="flex items-center gap-2">
                                <Share2 className="w-4 h-4" />
                                Redes
                            </TabsTrigger>
                            <TabsTrigger value="legal" className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Legal
                            </TabsTrigger>
                        </TabsList>

                        {/* Información General */}
                        <TabsContent value="general" className="space-y-4">
                            <div className="space-y-4">
                                <div className="border-b border-zinc-700 pb-2">
                                    <h3 className="text-lg font-semibold text-white">Branding</h3>
                                    <p className="text-sm text-zinc-400">Información de marca centralizada</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ZenInput
                                        id="company_name"
                                        label="Nombre Legal"
                                        required
                                        value={config.company_name}
                                        onChange={(e) => handleInputChange('company_name', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="Zen México"
                                    />
                                    <ZenInput
                                        id="company_name_long"
                                        label="Nombre Largo"
                                        value={config.company_name_long || ''}
                                        onChange={(e) => handleInputChange('company_name_long', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="ZEN México"
                                    />
                                    <ZenInput
                                        id="commercial_name"
                                        label="Nombre Comercial"
                                        value={config.commercial_name || ''}
                                        onChange={(e) => handleInputChange('commercial_name', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="Zenly Studio"
                                    />
                                    <ZenInput
                                        id="commercial_name_short"
                                        label="Nombre Corto (UI)"
                                        value={config.commercial_name_short || ''}
                                        onChange={(e) => handleInputChange('commercial_name_short', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="ZEN"
                                    />
                                    <ZenInput
                                        id="domain"
                                        label="Dominio"
                                        value={config.domain || ''}
                                        onChange={(e) => handleInputChange('domain', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="www.zenn.mx"
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="border-b border-zinc-700 pb-2">
                                    <h3 className="text-lg font-semibold text-white">Assets Visuales</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ZenInput
                                        id="logo_url"
                                        label="URL del Logo"
                                        value={config.logo_url || ''}
                                        onChange={(e) => handleInputChange('logo_url', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="https://ejemplo.com/logo.png"
                                    />
                                    <ZenInput
                                        id="favicon_url"
                                        label="URL del Favicon"
                                        value={config.favicon_url || ''}
                                        onChange={(e) => handleInputChange('favicon_url', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="https://ejemplo.com/favicon.ico"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="timezone" className="text-white">
                                        Zona Horaria
                                    </Label>
                                    <Select
                                        value={config.timezone}
                                        onValueChange={(value) => handleInputChange('timezone', value)}
                                    >
                                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {timezones.map((tz) => (
                                                <SelectItem key={tz.value} value={tz.value}>
                                                    {tz.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Contacto Comercial */}
                        <TabsContent value="comercial" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ZenInput
                                    id="commercial_phone"
                                    label="Teléfono Comercial"
                                    value={config.commercial_phone || ''}
                                    onChange={(e) => handleInputChange('commercial_phone', e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                    placeholder="+52 55 1234 5678"
                                />
                                <ZenInput
                                    id="comercial_email"
                                    label="Email Comercial"
                                    type="email"
                                    value={config.comercial_email || ''}
                                    onChange={(e) => handleInputChange('comercial_email', e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                    placeholder="comercial@empresa.com"
                                />
                                <ZenInput
                                    id="comercial_whatsapp"
                                    label="WhatsApp Comercial"
                                    value={config.comercial_whatsapp || ''}
                                    onChange={(e) => handleInputChange('comercial_whatsapp', e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                    placeholder="+52 55 1234 5678"
                                />
                            </div>
                        </TabsContent>

                        {/* Contacto Soporte */}
                        <TabsContent value="soporte" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ZenInput
                                    id="support_phone"
                                    label="Teléfono de Soporte"
                                    value={config.support_phone || ''}
                                    onChange={(e) => handleInputChange('support_phone', e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                    placeholder="+52 55 1234 5678"
                                />
                                <ZenInput
                                    id="soporte_email"
                                    label="Email de Soporte"
                                    type="email"
                                    value={config.soporte_email || ''}
                                    onChange={(e) => handleInputChange('soporte_email', e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                    placeholder="soporte@empresa.com"
                                />
                                <ZenInput
                                    id="soporte_chat_url"
                                    label="URL del Chat de Soporte"
                                    value={config.soporte_chat_url || ''}
                                    onChange={(e) => handleInputChange('soporte_chat_url', e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                    placeholder="https://chat.empresa.com"
                                />
                            </div>
                        </TabsContent>

                        {/* Ubicación */}
                        <TabsContent value="ubicacion" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="address" className="text-white">
                                        Dirección
                                    </Label>
                                    <Textarea
                                        id="address"
                                        value={config.address || ''}
                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="Dirección completa de la empresa"
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="business_hours" className="text-white">
                                        Horarios de Atención
                                    </Label>
                                    <Textarea
                                        id="business_hours"
                                        value={config.business_hours || ''}
                                        onChange={(e) => handleInputChange('business_hours', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="Lunes a Viernes: 9:00 AM - 6:00 PM"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* Redes Sociales */}
                        <TabsContent value="redes" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ZenInput
                                    id="facebook_url"
                                    label="Facebook"
                                    value={config.facebook_url || ''}
                                    onChange={(e) => handleInputChange('facebook_url', e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                    placeholder="https://facebook.com/empresa"
                                />
                                <ZenInput
                                    id="instagram_url"
                                    label="Instagram"
                                    value={config.instagram_url || ''}
                                    onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                    placeholder="https://instagram.com/empresa"
                                />
                                <ZenInput
                                    id="twitter_url"
                                    label="Twitter"
                                    value={config.twitter_url || ''}
                                    onChange={(e) => handleInputChange('twitter_url', e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                    placeholder="https://twitter.com/empresa"
                                />
                                <ZenInput
                                    id="linkedin_url"
                                    label="LinkedIn"
                                    value={config.linkedin_url || ''}
                                    onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                    placeholder="https://linkedin.com/company/empresa"
                                />
                            </div>
                        </TabsContent>

                        {/* Legal */}
                        <TabsContent value="legal" className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="terminos_condiciones" className="text-white">
                                        Términos y Condiciones
                                    </Label>
                                    <Textarea
                                        id="terminos_condiciones"
                                        value={config.terminos_condiciones || ''}
                                        onChange={(e) => handleInputChange('terminos_condiciones', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="URL o contenido de términos y condiciones"
                                        rows={4}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="politica_privacidad" className="text-white">
                                        Política de Privacidad
                                    </Label>
                                    <Textarea
                                        id="politica_privacidad"
                                        value={config.politica_privacidad || ''}
                                        onChange={(e) => handleInputChange('politica_privacidad', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="URL o contenido de política de privacidad"
                                        rows={4}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="aviso_legal" className="text-white">
                                        Aviso Legal
                                    </Label>
                                    <Textarea
                                        id="aviso_legal"
                                        value={config.aviso_legal || ''}
                                        onChange={(e) => handleInputChange('aviso_legal', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="URL o contenido de aviso legal"
                                        rows={4}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="meta_description" className="text-white">
                                        Meta Description (SEO)
                                    </Label>
                                    <Textarea
                                        id="meta_description"
                                        value={config.meta_description || ''}
                                        onChange={(e) => handleInputChange('meta_description', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="Descripción para motores de búsqueda"
                                        rows={3}
                                    />
                                </div>
                                <ZenInput
                                    id="meta_keywords"
                                    label="Meta Keywords (SEO)"
                                    value={config.meta_keywords || ''}
                                    onChange={(e) => handleInputChange('meta_keywords', e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                    placeholder="palabra1, palabra2, palabra3"
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ZenInput
                                        id="google_analytics_id"
                                        label="Google Analytics ID"
                                        value={config.google_analytics_id || ''}
                                        onChange={(e) => handleInputChange('google_analytics_id', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="GA-XXXXXXXXX-X"
                                    />
                                    <ZenInput
                                        id="google_tag_manager_id"
                                        label="Google Tag Manager ID"
                                        value={config.google_tag_manager_id || ''}
                                        onChange={(e) => handleInputChange('google_tag_manager_id', e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="GTM-XXXXXXX"
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
