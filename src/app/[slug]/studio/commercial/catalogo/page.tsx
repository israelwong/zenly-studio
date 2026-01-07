'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Package, Percent } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenDialog, ZenTabs } from '@/components/ui/zen';
import { CatalogoTab } from './components';
import { UtilidadForm } from '@/components/shared/configuracion/UtilidadForm';
import { PaquetesTab } from './paquetes/components';

export default function CatalogoPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const studioSlug = params.slug as string;

    // Obtener tab de la URL o usar 'catalogo' por defecto
    const tabFromUrl = searchParams.get('tab') || 'catalogo';
    const [activeTab, setActiveTab] = useState(tabFromUrl);
    const [isUtilidadModalOpen, setIsUtilidadModalOpen] = useState(false);

    // Actualizar título de la pestaña
    useEffect(() => {
        document.title = 'Zenly Studio - Catálogo';
    }, []);

    // Sincronizar con URL cuando cambia el parámetro
    useEffect(() => {
        const currentTab = searchParams.get('tab') || 'catalogo';
        if (currentTab !== activeTab) {
            setActiveTab(currentTab);
        }
    }, [searchParams, activeTab]);

    const tabs = [
        {
            id: 'catalogo',
            label: 'Catálogo',
            icon: <ShoppingBag className="h-4 w-4" />
        },
        {
            id: 'paquetes',
            label: 'Paquetes',
            icon: <Package className="h-4 w-4" />
        }
    ];

    // Manejar cambio de pestaña y actualizar URL
    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        router.push(`/${studioSlug}/studio/commercial/catalogo?tab=${tabId}`, { scroll: false });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600/20 rounded-lg">
                                <ShoppingBag className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <ZenCardTitle>Catálogo</ZenCardTitle>
                                <ZenCardDescription>
                                    Gestiona tu catálogo y paquetes de servicios
                                </ZenCardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <ZenButton
                                variant="outline"
                                onClick={() => setIsUtilidadModalOpen(true)}
                                className="flex items-center gap-2"
                            >
                                <Percent className="h-4 w-4" />
                                Margen de utilidad
                            </ZenButton>
                        </div>
                    </div>
                </ZenCardHeader>

                {/* Tabs y Contenido */}
                <ZenTabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    className="px-6 pt-4"
                />
                <ZenCardContent className="p-6">
                    <div style={{ display: activeTab === 'catalogo' ? 'block' : 'none' }}>
                        <CatalogoTab />
                    </div>
                    <div style={{ display: activeTab === 'paquetes' ? 'block' : 'none' }}>
                        <PaquetesTab />
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Modal de Márgenes */}
            <ZenDialog
                isOpen={isUtilidadModalOpen}
                onClose={() => setIsUtilidadModalOpen(false)}
                title="Márgenes de Utilidad"
                description="Gestiona los márgenes de utilidad, comisiones y sobreprecios"
                maxWidth="2xl"
                closeOnClickOutside={false}
            >
                <UtilidadForm
                    studioSlug={studioSlug}
                    onClose={() => setIsUtilidadModalOpen(false)}
                />
            </ZenDialog>
        </div>
    );
}
