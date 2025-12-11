'use client';

import React from 'react';
import { Plus, LogOut, Monitor, LayoutDashboard } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from '@/components/ui/shadcn/sheet';

interface MobileActionsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onCreatePost: () => void;
    onDashboard: () => void;
    onLogout: () => void;
    isLoggingOut?: boolean;
}

/**
 * MobileActionsSheet - Menú de acciones rápidas para mobile
 * Sheet lateral con diseño homologado al sistema ZEN
 */
export function MobileActionsSheet({
    isOpen,
    onClose,
    onCreatePost,
    onDashboard,
    onLogout,
    isLoggingOut = false
}: MobileActionsSheetProps) {
    const handleCreatePost = () => {
        onCreatePost();
        onClose();
    };

    const handleDashboard = () => {
        onDashboard();
        onClose();
    };

    const handleLogout = () => {
        onLogout();
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
                    {/* Crear Post */}
                    <button
                        onClick={handleCreatePost}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800/50 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm text-zinc-100">Crear Post</span>
                    </button>

                    {/* Dashboard */}
                    <button
                        onClick={handleDashboard}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800/50 rounded-lg transition-colors"
                    >
                        <LayoutDashboard className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm text-zinc-100">Dashboard</span>
                    </button>

                    {/* Divider */}
                    <div className="border-t border-zinc-800 my-2"></div>

                    {/* Cerrar sesión */}
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800/50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <LogOut className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm text-zinc-100">
                            {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
                        </span>
                    </button>
                </div>

                {/* Footer con mensaje informativo */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800 bg-zinc-900">
                    <div className="flex items-start gap-2 text-xs text-zinc-500">
                        <Monitor className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <p className="leading-relaxed">
                            Portfolio y Ofertas solo disponibles en desktop
                        </p>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
