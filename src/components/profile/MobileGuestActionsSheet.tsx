'use client';

import React from 'react';
import { Users, LogIn, UserPlus } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from '@/components/ui/shadcn/sheet';

interface MobileGuestActionsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onClientPortal: () => void;
    onLogin: () => void;
    onSignUp: () => void;
}

/**
 * MobileGuestActionsSheet - Menú de acciones para usuarios no autenticados en mobile
 * Sheet lateral con diseño homologado al sistema ZEN
 */
export function MobileGuestActionsSheet({
    isOpen,
    onClose,
    onClientPortal,
    onLogin,
    onSignUp
}: MobileGuestActionsSheetProps) {
    const handleClientPortal = () => {
        onClientPortal();
        onClose();
    };

    const handleLogin = () => {
        onLogin();
        onClose();
    };

    const handleSignUp = () => {
        onSignUp();
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
                    {/* Portal de Clientes */}
                    <button
                        onClick={handleClientPortal}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800/50 rounded-lg transition-colors"
                    >
                        <Users className="w-4 h-4 text-zinc-400" />
                        <div className="flex-1">
                            <div className="text-sm text-zinc-100">Portal de Clientes</div>
                            <div className="text-xs text-zinc-500">Accede a tus eventos</div>
                        </div>
                    </button>

                    {/* Divider */}
                    <div className="border-t border-zinc-800 my-2"></div>

                    {/* Iniciar sesión */}
                    <button
                        onClick={handleLogin}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800/50 rounded-lg transition-colors"
                    >
                        <LogIn className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm text-zinc-100">Iniciar sesión</span>
                    </button>
                </div>

                {/* Footer con CTA inline */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800 bg-zinc-900">
                    <div className="space-y-2">
                        <p className="text-xs text-zinc-500 text-left">
                            ¿Tienes un estudio fotográfico?
                        </p>
                        <button
                            onClick={handleSignUp}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Crear Studio</span>
                        </button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

