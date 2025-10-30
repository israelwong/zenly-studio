'use client';

import { Target } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';

interface CrmWrapperProps {
    studioSlug: string;
}

export function CrmWrapper({ studioSlug }: CrmWrapperProps) {
    return (
        <ZenCard variant="outline">
            <ZenCardHeader>
                <ZenCardTitle>CRM</ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent>
                <div className="text-center py-8 text-zinc-400">
                    <Target className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                    <p>Gestión CRM próximamente</p>
                </div>
            </ZenCardContent>
        </ZenCard>
    );
}

