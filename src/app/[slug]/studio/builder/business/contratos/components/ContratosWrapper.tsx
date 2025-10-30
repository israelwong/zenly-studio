'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';

interface ContratosWrapperProps {
    studioSlug: string;
}

export function ContratosWrapper({ studioSlug }: ContratosWrapperProps) {
    return (
        <ZenCard variant="outline">
            <ZenCardHeader>
                <ZenCardTitle>Contratos</ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent>
                <div className="text-center py-8 text-zinc-400">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                    <p>Gestión de contratos próximamente</p>
                </div>
            </ZenCardContent>
        </ZenCard>
    );
}

