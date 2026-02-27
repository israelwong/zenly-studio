'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PaquetesTipoEventoList } from './PaquetesTipoEventoList';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

interface PaqueteShell {
    id: string;
    name: string;
    precio: number | null;
    status: string;
    is_featured: boolean;
    order: number;
    event_type_id: string | null;
    cover_url: string | null;
    cover_storage_bytes: bigint | null;
    description: string | null;
    base_hours: number | null;
    visibility: string | null;
    bono_especial: number | null;
    items_cortesia: string[] | null;
    event_types: {
        id: string;
        name: string;
        order: number;
    } | null;
}

interface PaquetesClientProps {
    studioSlug: string;
    initialPaquetes: PaqueteShell[];
    initialTiposEvento: TipoEventoData[];
}

export function PaquetesClient({
    studioSlug,
    initialPaquetes,
    initialTiposEvento,
}: PaquetesClientProps) {
    // Convertir PaqueteShell a PaqueteFromDB para compatibilidad
    const paquetesAsPaqueteFromDB: (PaqueteFromDB & { order?: number })[] = initialPaquetes.map(p => ({
        id: p.id,
        studio_id: '', // No necesario para lista
        event_type_id: p.event_type_id || '',
        name: p.name,
        description: p.description,
        base_hours: p.base_hours,
        cover_url: p.cover_url,
        cover_storage_bytes: p.cover_storage_bytes,
        is_featured: p.is_featured,
        cost: null, // No necesario para lista
        expense: null, // No necesario para lista
        utilidad: null, // No necesario para lista
        precio: p.precio,
        status: p.status,
        position: p.order, // Mapear order a position
        order: p.order, // Mantener order para compatibilidad con PaquetesTipoEventoList
        created_at: new Date(),
        updated_at: new Date(),
        bono_especial: p.bono_especial ?? null,
        items_cortesia: p.items_cortesia ?? null,
        visibility: p.visibility ?? 'public',
        paquete_items: undefined,
        event_types: p.event_types ? {
            id: p.event_types.id,
            name: p.event_types.name,
            order: p.event_types.order,
        } : undefined,
    }));

    const [tiposEvento, setTiposEvento] = useState<TipoEventoData[]>(initialTiposEvento);
    const [paquetes, setPaquetes] = useState<(PaqueteFromDB & { order?: number })[]>(paquetesAsPaqueteFromDB);
    
    // Navegación atómica: prevenir race conditions durante transiciones
    const [isNavigating, setIsNavigating] = useState<string | null>(null);
    const isNavigatingRef = useRef(false);

    // Sincronizar tipos de evento cuando cambian desde el servidor
    useEffect(() => {
        // Solo sincronizar si NO estamos navegando
        if (!isNavigatingRef.current) {
            setTiposEvento(initialTiposEvento);
        }
    }, [initialTiposEvento]);

    // Sincronizar paquetes cuando cambian desde el servidor
    useEffect(() => {
        // Solo sincronizar si NO estamos navegando
        if (!isNavigatingRef.current) {
            const paquetesAsPaqueteFromDB: (PaqueteFromDB & { order?: number })[] = initialPaquetes.map(p => ({
                id: p.id,
                studio_id: '',
                event_type_id: p.event_type_id || '',
                name: p.name,
                description: p.description,
                base_hours: p.base_hours,
                cover_url: p.cover_url,
                cover_storage_bytes: p.cover_storage_bytes,
                is_featured: p.is_featured,
                cost: null,
                expense: null,
                utilidad: null,
                precio: p.precio,
                status: p.status,
                position: p.order,
                order: p.order,
                created_at: new Date(),
                updated_at: new Date(),
                bono_especial: p.bono_especial ?? null,
                items_cortesia: p.items_cortesia ?? null,
                visibility: p.visibility ?? 'public',
                paquete_items: undefined,
                event_types: p.event_types ? {
                    id: p.event_types.id,
                    name: p.event_types.name,
                    order: p.event_types.order,
                } : undefined,
            }));
            setPaquetes(paquetesAsPaqueteFromDB);
        }
    }, [initialPaquetes]);

    const handleTiposEventoChange = useCallback((newTiposEvento: TipoEventoData[]) => {
        // Solo actualizar si NO estamos navegando
        if (!isNavigatingRef.current) {
            setTiposEvento(newTiposEvento);
        }
    }, []);

    const handlePaquetesChange = useCallback((newPaquetes: PaqueteFromDB[]) => {
        // Solo actualizar si NO estamos navegando
        if (!isNavigatingRef.current) {
            // Asegurar que los paquetes tengan order para compatibilidad
            const paquetesWithOrder = newPaquetes.map(p => ({
                ...p,
                order: (p as { order?: number }).order ?? p.position,
            }));
            setPaquetes(paquetesWithOrder);
        }
    }, []);

    const handleSetNavigating = useCallback((routeId: string | null) => {
        setIsNavigating(routeId);
        isNavigatingRef.current = routeId !== null;
    }, []);

    return (
        <PaquetesTipoEventoList
            studioSlug={studioSlug}
            tiposEvento={tiposEvento}
            paquetes={paquetes as PaqueteFromDB[]}
            onTiposEventoChange={handleTiposEventoChange}
            onPaquetesChange={handlePaquetesChange}
            isNavigating={isNavigating}
            setIsNavigating={handleSetNavigating}
        />
    );
}
