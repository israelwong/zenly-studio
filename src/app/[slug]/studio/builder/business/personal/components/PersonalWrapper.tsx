'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PersonalList, PersonalSkeletonZen } from './components';
import { obtenerPersonal } from '@/lib/actions/studio/config/personal.actions';
import type { PersonalData } from '@/lib/actions/schemas/personal-schemas';

interface PersonalWrapperProps {
    studioSlug: string;
}

export function PersonalWrapper({ studioSlug }: PersonalWrapperProps) {
    const [personal, setPersonal] = useState<PersonalData[]>([]);
    const [loading, setLoading] = useState(true);

    const cargarPersonal = useCallback(async () => {
        try {
            setLoading(true);
            const result = await obtenerPersonal(studioSlug);
            if (result.success && result.data) {
                setPersonal(result.data);
            } else {
                toast.error(result.error || 'Error al cargar personal');
            }
        } catch (error) {
            console.error('Error al cargar personal:', error);
            toast.error('Error al cargar personal');
        } finally {
            setLoading(false);
        }
    }, [studioSlug]);

    useEffect(() => {
        cargarPersonal();
    }, [cargarPersonal]);

    const handlePersonalChange = useCallback((newPersonal: PersonalData[]) => {
        setPersonal(newPersonal);
    }, []);

    if (loading) {
        return <PersonalSkeletonZen />;
    }

    return (
        <PersonalList
            studioSlug={studioSlug}
            initialPersonal={personal}
            onPersonalChange={handlePersonalChange}
        />
    );
}
