// src/hooks/use-setup-status.ts

'use client';

import { useState, useEffect } from 'react';
import { StudioSetupStatus } from '@/types/setup-validation';

interface SetupStatusResponse {
    success: boolean;
    data?: StudioSetupStatus & {
        studio: {
            id: string;
            name: string;
            slug: string;
        };
    };
    error?: string;
}

export function useSetupStatus(studioSlug: string) {
    const [setupStatus, setSetupStatus] = useState<SetupStatusResponse['data'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSetupStatus = async (force = false) => {
        try {
            setLoading(true);
            setError(null);

            const url = `/api/studio/${studioSlug}/setup-status`;
            const response = await fetch(url, {
                method: force ? 'POST' : 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: force ? JSON.stringify({ force: true }) : undefined,
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data: SetupStatusResponse = await response.json();

            if (data.success && data.data) {
                setSetupStatus(data.data);
            } else {
                throw new Error(data.error || 'Error desconocido');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al cargar el estado de configuración';
            setError(errorMessage);
            console.error('Error fetching setup status:', err);
        } finally {
            setLoading(false);
        }
    };

    const refreshSetupStatus = () => {
        return fetchSetupStatus(true);
    };

    useEffect(() => {
        if (studioSlug) {
            fetchSetupStatus();
        }
    }, [studioSlug]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        setupStatus,
        loading,
        error,
        refresh: refreshSetupStatus,
        refetch: () => fetchSetupStatus(false)
    };
}
