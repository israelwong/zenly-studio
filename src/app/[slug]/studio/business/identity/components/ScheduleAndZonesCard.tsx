'use client';

import React from 'react';
import { HorariosSection } from './HorariosSection';
import { ZonasTrabajoSection } from './ZonasTrabajoSection';
import { BuilderHorario } from '@/types/builder-profile';
import { BuilderZonaTrabajo } from '@/types/builder-profile';

interface ScheduleAndZonesCardProps {
    studioSlug: string;
    horarios?: BuilderHorario[];
    zonasCobertura?: BuilderZonaTrabajo[];
    loading?: boolean;
    onDataChange?: () => Promise<void>;
}

export function ScheduleAndZonesCard({
    studioSlug,
    horarios = [],
    zonasCobertura = [],
    loading = false,
    onDataChange
}: ScheduleAndZonesCardProps) {
    return (
        <div className="space-y-6">
            <HorariosSection
                studioSlug={studioSlug}
                horarios={horarios}
                onDataChange={onDataChange}
                loading={loading}
            />

            <ZonasTrabajoSection
                studioSlug={studioSlug}
                zonasCobertura={zonasCobertura}
                onDataChange={onDataChange}
                loading={loading}
            />
        </div>
    );
}
