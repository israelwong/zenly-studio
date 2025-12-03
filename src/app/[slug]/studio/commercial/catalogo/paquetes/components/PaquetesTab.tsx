'use client';

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { PaquetesTipoEventoList } from './PaquetesTipoEventoList';
import { PaquetesTabSkeleton } from '../PaquetesTabSkeleton';
import { obtenerTiposEvento } from '@/lib/actions/studio/negocio/tipos-evento.actions';
import { obtenerPaquetes } from '@/lib/actions/studio/paquetes/paquetes.actions';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

export default function PaquetesTab() {
    const params = useParams();
    const studioSlug = params.slug as string;

    const [tiposEvento, setTiposEvento] = useState<TipoEventoData[]>([]);
    const [paquetes, setPaquetes] = useState<PaqueteFromDB[]>([]);
    const [loading, setLoading] = useState(false);
    const loadedRef = useRef(false);

    // Función para cargar datos
    const cargarDatos = async () => {
        try {
            setLoading(true);
            const [tiposResult, paquetesResult] = await Promise.all([
                obtenerTiposEvento(studioSlug),
                obtenerPaquetes(studioSlug)
            ]);

            if (tiposResult.success && tiposResult.data) {
                setTiposEvento(tiposResult.data);
            } else {
                toast.error(tiposResult.error || 'Error al cargar tipos de evento');
            }

            if (paquetesResult.success && paquetesResult.data) {
                setPaquetes(paquetesResult.data);
            } else {
                toast.error(paquetesResult.error || 'Error al cargar paquetes');
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    // Carga inicial al montar: cargar siempre que el componente se monte
    useLayoutEffect(() => {
        if (!loadedRef.current) {
            loadedRef.current = true;
            cargarDatos();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Recargar datos cuando cambia studioSlug
    useEffect(() => {
        if (!loadedRef.current) return;

        // Si cambió studioSlug, recargar
        loadedRef.current = false;
        cargarDatos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studioSlug]);

    const handleTiposEventoChange = useCallback((newTiposEvento: TipoEventoData[]) => {
        setTiposEvento(newTiposEvento);
    }, []);

    const handlePaquetesChange = (newPaquetes: PaqueteFromDB[]) => {
        setPaquetes(newPaquetes);
    };

    if (loading) {
        return <PaquetesTabSkeleton />;
    }

    return (
        <PaquetesTipoEventoList
            studioSlug={studioSlug}
            tiposEvento={tiposEvento}
            paquetes={paquetes}
            onTiposEventoChange={handleTiposEventoChange}
            onPaquetesChange={handlePaquetesChange}
        />
    );
}
