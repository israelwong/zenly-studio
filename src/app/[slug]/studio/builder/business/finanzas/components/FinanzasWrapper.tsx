'use client';

import { DollarSign } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';

interface FinanzasWrapperProps {
    studioSlug: string;
}

export function FinanzasWrapper({ studioSlug }: FinanzasWrapperProps) {
    return (
        <ZenCard variant="outline">
            <ZenCardHeader>
                <ZenCardTitle>Finanzas</ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent>
                <div className="text-center py-8 text-zinc-400">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                    <p>Gestión financiera próximamente</p>
                </div>
            </ZenCardContent>
        </ZenCard>
    );
}

