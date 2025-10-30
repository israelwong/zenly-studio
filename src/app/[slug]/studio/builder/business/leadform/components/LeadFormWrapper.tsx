'use client';

import { ClipboardList } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';

interface LeadFormWrapperProps {
    studioSlug: string;
}

export function LeadFormWrapper({ studioSlug }: LeadFormWrapperProps) {
    return (
        <ZenCard variant="outline">
            <ZenCardHeader>
                <ZenCardTitle>Lead Form</ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent>
                <div className="text-center py-8 text-zinc-400">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                    <p>Configuración de formularios próximamente</p>
                </div>
            </ZenCardContent>
        </ZenCard>
    );
}

