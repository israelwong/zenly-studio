'use client';

import { Percent } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

export function CatalogoHeaderActions() {
    const handleClick = () => {
        const openUtilidad = (window as any).__catalogoOpenUtilidad;
        if (openUtilidad) {
            openUtilidad();
        }
    };

    return (
        <ZenButton
            onClick={handleClick}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
        >
            <Percent className="w-4 h-4" />
            Configuración de Rentabilidad
        </ZenButton>
    );
}
