'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ShoppingBag, Package, Percent } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenButton, ZenDialog, ZenTabs } from '@/components/ui/zen';
import { CatalogoTab, UtilidadForm } from './components';
import { PaquetesTab } from './paquetes/components';

export default function CatalogoPage() {
    const params = useParams();
    const studioSlug = params.slug as string;

    const [activeTab, setActiveTab] = useState('catalogo');
    const [isUtilidadModalOpen, setIsUtilidadModalOpen] = useState(false);

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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-600/20 rounded-lg">
                        <ShoppingBag className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Oferta Comercial</h1>
                        <p className="text-sm text-zinc-400">Gestiona tu catálogo y paquetes de servicios</p>
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

            {/* Tabs y Contenido */}
            <ZenCard variant="default" padding="none">
                <ZenTabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    className="px-6 pt-4"
                />
                <ZenCardContent className="p-6">
                    {activeTab === 'catalogo' && <CatalogoTab />}
                    {activeTab === 'paquetes' && <PaquetesTab />}
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
