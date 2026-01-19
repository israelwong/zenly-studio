'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ShoppingBag, Percent } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenDialog } from '@/components/ui/zen';
import { Catalogo } from './components';
import { UtilidadForm } from '@/components/shared/configuracion/UtilidadForm';

export default function CatalogoPage() {
    const params = useParams();
    const studioSlug = params.slug as string;
    const [isUtilidadModalOpen, setIsUtilidadModalOpen] = useState(false);

    // Actualizar título de la pestaña
    useEffect(() => {
        document.title = 'Zenly Studio - Catálogo';
    }, []);

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
                                    Gestiona tu catálogo de servicios y productos
                                </ZenCardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <ZenButton
                                variant="outline"
                                size="sm"
                                onClick={() => setIsUtilidadModalOpen(true)}
                                className="gap-1.5 px-2.5 py-1.5 h-7 text-xs border-l-2 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_8px_rgba(16,185,129,0.1)] transition-all duration-300"
                            >
                                <Percent className="h-3.5 w-3.5 text-emerald-400/90" style={{ animation: 'pulse 3s ease-in-out infinite' }} />
                                <span>Margen de utilidad</span>
                            </ZenButton>
                        </div>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    <Catalogo />
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
