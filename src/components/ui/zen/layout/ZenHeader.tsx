'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Bell, Bot, Zap } from 'lucide-react';
import { ZenButton, ZenBadge } from '@/components/ui/zen';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

interface ZenHeaderProps {
    className?: string;
}

export function ZenHeader({ className }: ZenHeaderProps) {
    const params = useParams();
    const studioSlug = params.slug as string;

    // Hook para notificaciones
    const {
        unreadCount,
        loading: notificationsLoading
    } = useRealtimeNotifications({
        studioSlug,
    });


    return (
        <header className={`bg-zinc-900 border-b border-zinc-800 px-4 py-3 ${className}`}>
            <div className="flex items-center justify-between">
                {/* Marca ZEN Pro */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-white font-semibold text-lg">
                        ZEN Pro
                    </div>
                </div>

                {/* Acciones del header */}
                <div className="flex items-center gap-3">
                    {/* Botón IA */}
                    <ZenButton
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-zinc-300 hover:text-white"
                    >
                        <Bot className="h-4 w-4" />
                        <span className="hidden sm:inline">Haz Magia IA</span>
                        <span className="sm:hidden">IA</span>
                    </ZenButton>

                    {/* Notificaciones */}
                    <ZenButton
                        variant="outline"
                        size="sm"
                        className="relative flex items-center gap-2 text-zinc-300 hover:text-white"
                    >
                        <Bell className="h-4 w-4" />
                        {unreadCount > 0 && (
                            <ZenBadge
                                variant="destructive"
                                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
                            >
                                {unreadCount}
                            </ZenBadge>
                        )}
                    </ZenButton>
                </div>
            </div>
        </header>
    );
}
