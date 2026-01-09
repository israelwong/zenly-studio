'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getBuilderData } from '@/lib/actions/studio/builder-data.actions';
import { BuilderProfileData } from '@/types/builder-profile';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
import { Globe, Smartphone } from 'lucide-react';
import { ProfileHeader, ProfileNavTabs, ProfileContent } from '@/components/profile';
import { PublicPageFooter } from '@/components/shared/PublicPageFooter';
import { useAuth } from '@/contexts/AuthContext';

// Tabs components
import { IdentidadTab } from './tabs/IdentidadTab';
import { ContactoTab } from './tabs/ContactoTab';
import { RedesTab } from './tabs/RedesTab';

type TabValue = 'identidad' | 'contacto' | 'faq';

export default function PerfilNegocioPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const studioSlug = params.slug as string;

    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Obtener tab inicial de manera segura - validar que sea un tab válido
    const getValidTab = (tab: string | null): TabValue => {
        const validTabs: TabValue[] = ['identidad', 'contacto', 'faq'];
        return (validTabs.includes(tab as TabValue) ? tab : 'identidad') as TabValue;
    };

    const tabFromUrl = getValidTab(searchParams.get('tab'));
    const [currentTab, setCurrentTab] = useState<TabValue>(tabFromUrl);

    // En la página de configuración, si hay usuario autenticado, es el owner
    const isOwner = !!user;

    useEffect(() => {
        document.title = 'Zenly Studio - Perfil de Negocio';
    }, []);

    // Control de hidratación
    useEffect(() => {
        setMounted(true);
    }, []);

    // Asegurar que siempre haya un tab válido en la URL (por defecto: identidad)
    useEffect(() => {
        if (mounted) {
            const urlTab = searchParams.get('tab');
            const validTab = getValidTab(urlTab);

            // Si no hay tab en la URL o es inválido, redirigir a identidad
            if (!urlTab || validTab !== urlTab) {
                router.replace(`/${studioSlug}/studio/config/perfil-negocio?tab=identidad`, { scroll: false });
                setCurrentTab('identidad');
            } else if (validTab !== currentTab) {
                setCurrentTab(validTab);
            }
        }
    }, [searchParams, mounted, currentTab, studioSlug, router]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const result = await getBuilderData(studioSlug);
                if (result.success && result.data) {
                    setBuilderData(result.data);
                } else {
                    console.error('Error loading builder data:', result.error);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [studioSlug]);

    const handleTabChange = (value: string) => {
        router.push(`/${studioSlug}/studio/config/perfil-negocio?tab=${value}`);
    };

    // Función para refrescar datos después de cambios
    const handleDataRefresh = async () => {
        try {
            const result = await getBuilderData(studioSlug);
            if (result.success && result.data) {
                setBuilderData(result.data);
            } else {
                console.error('Error al recargar:', result.error);
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    };

    // Función para actualización optimista (compatibilidad con tabs)
    const handleUpdate = (updaterOrData: BuilderProfileData | null | ((prev: BuilderProfileData | null) => BuilderProfileData | null)) => {
        if (typeof updaterOrData === 'function') {
            setBuilderData(prev => (updaterOrData as (prev: BuilderProfileData | null) => BuilderProfileData | null)(prev));
        } else {
            setBuilderData(updaterOrData);
        }
    };

    // Determinar qué tab mostrar en el preview según la pestaña activa del editor
    const previewTab = currentTab === 'faq' ? 'faq' : 'contacto';
    const previewVariant = currentTab === 'faq' ? 'faq' : 'info';

    // Transformar datos para preview - estructura compatible con ProfileHeader y ContactSection/FaqSection
    const previewData = builderData ? {
        // Datos para ProfileHeader (nivel superior)
        studio_name: builderData.studio.studio_name,
        slogan: builderData.studio.slogan,
        logo_url: builderData.studio.logo_url,
        // Datos para ProfileContent con variant='info' (ContactSection)
        studio: {
            id: builderData.studio.id,
            owner_id: null, // No necesario para preview público
            studio_name: builderData.studio.studio_name,
            presentation: builderData.studio.presentation,
            keywords: builderData.studio.keywords,
            logo_url: builderData.studio.logo_url,
            slogan: builderData.studio.slogan,
            website: builderData.studio.website,
            address: builderData.studio.address,
            plan_id: builderData.studio.plan_id,
            plan: builderData.studio.plan,
            zonas_trabajo: builderData.studio.zonas_trabajo,
        },
        contactInfo: {
            phones: (builderData.contactInfo?.phones || []).map(phone => ({
                id: phone.id,
                number: phone.number,
                type: phone.type as 'LLAMADAS' | 'WHATSAPP' | 'AMBOS',
                label: phone.label,
                is_active: phone.is_active
            })),
            address: builderData.contactInfo?.address,
            website: builderData.contactInfo?.website,
            email: builderData.contactInfo?.email,
            maps_url: builderData.studio.maps_url,
            horarios: (builderData.contactInfo?.horarios || []).map(horario => ({
                id: horario.id || `temp-${horario.dia}`,
                dia: horario.dia,
                apertura: horario.apertura,
                cierre: horario.cierre,
                cerrado: horario.cerrado
            })),
        },
        socialNetworks: builderData.socialNetworks.map(network => ({
            id: network.id,
            url: network.url,
            platform: network.platform ? {
                id: network.platform.id,
                name: network.platform.name,
                icon: network.platform.icon,
            } : null,
            order: network.order,
        })),
        // Datos para ProfileContent con variant='faq' (FaqSection)
        faq: builderData.faq || [],
    } : null;

    // Evitar hidration mismatch - solo renderizar tabs después de montar
    if (!mounted) {
        return (
            <div className="min-h-screen">
                <div className="max-w-7xl mx-auto p-6">
                    {/* Header Skeleton */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/20 rounded-lg">
                                <Globe className="h-5 w-5 text-blue-400" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-7 w-48 bg-zinc-800 rounded animate-pulse" />
                                <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* Grid Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Editor Skeleton */}
                        <div className="space-y-6">
                            <ZenCard variant="default" padding="none">
                                <ZenCardHeader className="border-b border-zinc-800">
                                    <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
                                </ZenCardHeader>
                                <ZenCardContent className="p-6">
                                    {/* Tabs Skeleton */}
                                    <div className="mb-6">
                                        <div className="grid grid-cols-3 gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="h-9 bg-zinc-800 rounded animate-pulse" />
                                            ))}
                                        </div>
                                    </div>
                                    {/* Content Skeleton */}
                                    <div className="space-y-4">
                                        <div className="h-10 bg-zinc-800 rounded animate-pulse" />
                                        <div className="h-32 bg-zinc-800 rounded animate-pulse" />
                                        <div className="h-10 bg-zinc-800 rounded animate-pulse" />
                                    </div>
                                </ZenCardContent>
                            </ZenCard>
                        </div>

                        {/* Preview Skeleton */}
                        <div className="hidden lg:block">
                            <div className="w-full max-w-sm mx-auto flex flex-col bg-zinc-950 min-h-[600px] p-4 rounded-lg">
                                {/* Header Skeleton */}
                                <div className="flex-shrink-0 mb-4 bg-zinc-950 rounded-lg">
                                    <div className="w-full px-4 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-zinc-800 rounded-full animate-pulse shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse" />
                                                <div className="h-3 bg-zinc-800 rounded w-24 animate-pulse" />
                                            </div>
                                            <div className="w-8 h-8 bg-zinc-800 rounded-md animate-pulse" />
                                        </div>
                                    </div>
                                </div>

                                {/* Navbar Skeleton */}
                                <div className="flex-shrink-0 mb-4 bg-zinc-900/50 backdrop-blur-lg rounded-lg border border-zinc-800/20">
                                    <div className="p-2">
                                        <div className="flex items-center gap-2">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="h-9 bg-zinc-800 rounded-full w-20 animate-pulse" />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Content Skeleton */}
                                <div className="flex-1 overflow-y-auto max-h-[600px]">
                                    <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/20 overflow-hidden p-6 space-y-6">
                                        <div className="space-y-2">
                                            <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                                            <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse" />
                                        </div>
                                        <div className="h-10 bg-zinc-800 rounded-lg w-full animate-pulse" />
                                        <div className="border-t border-zinc-800/50" />
                                        <div className="space-y-4">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse shrink-0" />
                                                    <div className="h-4 bg-zinc-800 rounded flex-1 animate-pulse" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <Globe className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Perfil de Negocio</h1>
                            <p className="text-sm text-zinc-400">
                                Gestiona la información que se muestra en tu perfil público
                            </p>
                        </div>
                    </div>
                </div>

                {/* Grid de 2 columnas: Editor + Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Columna 1 - Editor */}
                    <div className="space-y-6">
                        <ZenCard variant="default" padding="none">
                            <ZenCardContent className="p-6">
                                <Tabs value={currentTab} onValueChange={handleTabChange}>
                                    <TabsList className="grid w-full grid-cols-3 mb-6 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                                        <TabsTrigger
                                            value="identidad"
                                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
                                        >
                                            Identidad
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="contacto"
                                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
                                        >
                                            Contacto
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="faq"
                                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
                                        >
                                            FAQ
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="identidad">
                                        <IdentidadTab
                                            builderData={builderData}
                                            loading={loading}
                                            studioSlug={studioSlug}
                                            onUpdate={handleUpdate}
                                            onDataChange={handleDataRefresh}
                                        />
                                    </TabsContent>

                                    <TabsContent value="contacto">
                                        <ContactoTab
                                            builderData={builderData}
                                            loading={loading}
                                            studioSlug={studioSlug}
                                            onUpdate={handleUpdate}
                                            onDataChange={handleDataRefresh}
                                        />
                                    </TabsContent>

                                    <TabsContent value="faq">
                                        <RedesTab
                                            builderData={builderData}
                                            loading={loading}
                                            studioSlug={studioSlug}
                                            onUpdate={handleUpdate}
                                            onDataChange={handleDataRefresh}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </ZenCardContent>
                        </ZenCard>
                    </div>

                    {/* Columna 2 - Preview Mobile (solo desktop) */}
                    <div className="hidden lg:block lg:sticky lg:top-4" style={{ height: 'fit-content' }}>
                        {loading ? (
                            <div className="w-full max-w-sm mx-auto flex flex-col bg-zinc-950 min-h-[600px] p-4 rounded-lg">
                                {/* Header Skeleton */}
                                <div className="flex-shrink-0 mb-4 bg-zinc-950 rounded-lg">
                                    <div className="w-full px-4 py-5">
                                        <div className="flex items-center gap-3">
                                            {/* Logo skeleton */}
                                            <div className="w-10 h-10 bg-zinc-800 rounded-full animate-pulse shrink-0" />
                                            {/* Info skeleton */}
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse" />
                                                <div className="h-3 bg-zinc-800 rounded w-24 animate-pulse" />
                                            </div>
                                            {/* Menu button skeleton */}
                                            <div className="w-8 h-8 bg-zinc-800 rounded-md animate-pulse" />
                                        </div>
                                    </div>
                                </div>

                                {/* Navbar Skeleton */}
                                <div className="flex-shrink-0 mb-4 bg-zinc-900/50 backdrop-blur-lg rounded-lg border border-zinc-800/20">
                                    <div className="p-2">
                                        <div className="flex items-center gap-2">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="h-9 bg-zinc-800 rounded-full w-20 animate-pulse" />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Content Skeleton */}
                                <div className="flex-1 overflow-y-auto max-h-[600px]">
                                    <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/20 overflow-hidden p-6 space-y-6">
                                        {/* Presentation skeleton */}
                                        <div className="space-y-2">
                                            <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                                            <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse" />
                                        </div>

                                        {/* Button skeleton */}
                                        <div className="h-10 bg-zinc-800 rounded-lg w-full animate-pulse" />

                                        {/* Divider */}
                                        <div className="border-t border-zinc-800/50" />

                                        {/* Contact info skeleton */}
                                        <div className="space-y-4">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse shrink-0" />
                                                    <div className="h-4 bg-zinc-800 rounded flex-1 animate-pulse" />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Schedule skeleton */}
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse shrink-0 mt-0.5" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 bg-zinc-800 rounded-full animate-pulse" />
                                                        <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse" />
                                                        <div className="h-4 bg-zinc-800 rounded w-20 animate-pulse ml-auto" />
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 bg-zinc-800 rounded-full animate-pulse" />
                                                        <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse" />
                                                        <div className="h-4 bg-zinc-800 rounded w-16 animate-pulse ml-auto" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-sm mx-auto flex flex-col bg-zinc-950 min-h-[600px] p-4 rounded-lg">
                                {/* Header */}
                                <div className="flex-shrink-0 mb-4">
                                    <ProfileHeader
                                        data={previewData as unknown as Record<string, unknown>}
                                        loading={loading}
                                        studioSlug={studioSlug}
                                        previewMode={true}
                                    />
                                </div>

                                {/* Navbar */}
                                <div className="flex-shrink-0 mb-4 bg-zinc-900/50 backdrop-blur-lg rounded-lg border border-zinc-800/20">
                                    <ProfileNavTabs
                                        activeTab={previewTab}
                                        onTabChange={() => { }}
                                        hasActiveFAQs={(builderData?.faq || []).some(f => f.is_active)}
                                        isOwner={isOwner}
                                    />
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto max-h-[600px]">
                                    <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/20 overflow-hidden">
                                        <ProfileContent
                                            variant={previewVariant}
                                            data={previewData as unknown as Record<string, unknown>}
                                            loading={loading}
                                            studioSlug={studioSlug}
                                            ownerUserId={null}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
