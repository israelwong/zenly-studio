'use client';

import { AlertTriangle } from 'lucide-react';
import { useInfrastructure } from '@/contexts/InfrastructureContext';

/**
 * Banner Caso B: sesión activa (admin/agente/studio). NO redirige.
 * Ley de 48px, estética Zen Amber.
 */
export function StatusBanner() {
    const { connectionStatus } = useInfrastructure();

    if (connectionStatus !== 'down' && connectionStatus !== 'degraded') return null;

    return (
        <div
            className="flex items-center justify-center gap-3 min-h-[48px] px-4 py-3 bg-amber-950/40 border-b border-amber-800/50 text-amber-200 text-sm"
            role="alert"
        >
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />
            <p className="font-medium">
                Problemas de conexión detectados. Tu sesión se mantendrá abierta,
                pero algunas funciones de guardado podrían fallar.
            </p>
        </div>
    );
}
