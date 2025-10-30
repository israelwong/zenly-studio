'use client';

import { Mail } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';

interface EmailWrapperProps {
    studioSlug: string;
}

export function EmailWrapper({ studioSlug }: EmailWrapperProps) {
    return (
        <ZenCard variant="outline">
            <ZenCardHeader>
                <ZenCardTitle>Email</ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent>
                <div className="text-center py-8 text-zinc-400">
                    <Mail className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                    <p>Gestión de email marketing próximamente</p>
                </div>
            </ZenCardContent>
        </ZenCard>
    );
}

