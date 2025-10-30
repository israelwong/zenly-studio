'use client';

import { FileSignature } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';

interface CondicionesComercialesWrapperProps {
    studioSlug: string;
}

export function CondicionesComercialesWrapper({ studioSlug }: CondicionesComercialesWrapperProps) {
    return (
        <ZenCard variant="outline">
            <ZenCardHeader>
                <ZenCardTitle>Condiciones Comerciales</ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent>
                <div className="text-center py-8 text-zinc-400">
                    <FileSignature className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                    <p>Gestión de condiciones comerciales próximamente</p>
                </div>
            </ZenCardContent>
        </ZenCard>
    );
}

