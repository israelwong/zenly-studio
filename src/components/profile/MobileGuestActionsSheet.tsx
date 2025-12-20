'use client';

import React from 'react';
import { Users } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from '@/components/ui/shadcn/sheet';

interface MobileGuestActionsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onClientPortal: () => void;
}

/**
 * MobileGuestActionsSheet - Menú de acciones para usuarios no autenticados en mobile
 * Sheet lateral con diseño homologado al sistema ZEN
 */
export function MobileGuestActionsSheet({
    isOpen,
    onClose,
    onClientPortal
}: MobileGuestActionsSheetProps) {
    const handleClientPortal = () => {
        onClientPortal();
        onClose();
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                side="right"
                className="bg-zinc-900 border-l border-zinc-800 w-[280px] p-0"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-zinc-800">
                    <SheetTitle className="text-base font-semibold text-zinc-100">
                        Menú
                    </SheetTitle>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                    {/* Portal cliente */}
                    <button
                        onClick={handleClientPortal}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800/50 rounded-lg transition-colors"
                    >
                        <Users className="w-4 h-4 text-zinc-400" />
                        <div className="flex-1">
                            <div className="text-sm text-zinc-100">Portal cliente</div>
                            <div className="text-xs text-zinc-500">Accede a tus eventos</div>
                        </div>
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

