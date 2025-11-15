'use client';

import React, { useState, useEffect } from 'react';
import { CurrentPlanCard, BillingHistoryCard, SubscriptionSkeleton } from './index';
import { getSubscriptionData } from '@/lib/actions/studio/account/suscripcion/suscripcion.actions';
import { SuscripcionData } from '@/lib/actions/studio/account/suscripcion/types';
import { toast } from 'sonner';

interface SubscriptionDataLoaderProps {
    studioSlug: string;
}

export function SubscriptionDataLoader({ studioSlug }: SubscriptionDataLoaderProps) {
    const [data, setData] = useState<SuscripcionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const result = await getSubscriptionData(studioSlug);

                if (result.success && result.data) {
                    setData(result.data);
                } else {
                    setError(result.error || 'Error al cargar datos de suscripción');
                    toast.error(result.error || 'Error al cargar datos de suscripción');
                }
            } catch (err) {
                console.error('Error loading subscription data:', err);
                setError('Error interno del servidor');
                toast.error('Error interno del servidor');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [studioSlug]);

    if (loading) {
        return <SubscriptionSkeleton />;
    }

    if (error || !data) {
        return (
            <div className="space-y-6">
                <div className="text-center py-12">
                    <div className="text-red-400 text-lg font-medium mb-2">
                        Error al cargar datos de suscripción
                    </div>
                    <div className="text-zinc-400">
                        {error || 'No se pudieron cargar los datos de tu suscripción'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Current Plan */}
            <CurrentPlanCard data={data} studioSlug={studioSlug} />

            {/* Billing History */}
            <BillingHistoryCard data={data} />
        </div>
    );
}
