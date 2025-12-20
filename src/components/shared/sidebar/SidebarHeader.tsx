'use client';

import React from 'react';
import { ZenSidebarHeader, ZenButton } from '@/components/ui/zen';
import { StudioHeaderModal } from '@/app/[slug]/studio/components/StudioHeaderModal';
import { X } from 'lucide-react';

interface SidebarHeaderProps {
    studioData?: {
        id: string;
        studio_name: string;
        slug: string;
    };
    onToggleSidebar?: () => void;
}

export function SidebarHeader({ studioData, onToggleSidebar }: SidebarHeaderProps) {
    return (
        <ZenSidebarHeader>
            <div className="flex items-center justify-between">
                <StudioHeaderModal studioData={studioData} />
                {onToggleSidebar && (
                    <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={onToggleSidebar}
                        className="lg:hidden p-2 text-zinc-400 hover:text-zinc-200"
                    >
                        <X className="h-4 w-4" />
                    </ZenButton>
                )}
            </div>
        </ZenSidebarHeader>
    );
}

