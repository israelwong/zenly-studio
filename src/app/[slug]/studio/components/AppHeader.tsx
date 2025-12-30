'use client';

import React, { useState, useEffect } from 'react';
import { Zap, Menu, ChevronDown } from 'lucide-react';
import { BreadcrumbHeader } from './BreadcrumbHeader';
import { UserAvatar } from '@/components/auth/user-avatar';
import { StorageBadge } from './StorageBadge';
import { NotificationsDropdown } from '@/components/shared/notifications/NotificationsDropdown';
import { ZenButton, useZenSidebar } from '@/components/ui/zen';
import { useStudioData } from '@/hooks/useStudioData';
import { SubscriptionPopover } from './SubscriptionPopover';
import { SubscriptionBadge } from '@/components/shared/subscription/SubscriptionBadge';
import { GoogleStatusPopover } from '@/components/shared/integrations/GoogleStatusPopover';
import { useCommercialNameShort } from '@/hooks/usePlatformConfig';

interface AppHeaderProps {
    studioSlug: string;
    onCommandOpen?: () => void;
}

export function AppHeader({ studioSlug, onCommandOpen }: AppHeaderProps) {
    const [isMounted, setIsMounted] = useState(false);
    const { toggleSidebar } = useZenSidebar();
    const { identidadData } = useStudioData({ studioSlug });
    const commercialNameShort = useCommercialNameShort();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900/95 px-4 backdrop-blur-sm">
            {/* LEFT: ZEN Branding + Studio Name */}
            <div className="flex items-center gap-3 min-w-0">
                {/* Hamburger Menu - Mobile only */}
                <ZenButton
                    variant="ghost"
                    size="icon"
                    className="lg:hidden flex-shrink-0"
                    onClick={toggleSidebar}
                >
                    <Menu className="h-5 w-5" />
                </ZenButton>

                {/* Logo + Brand (no clickeable) */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-white text-sm hidden sm:inline">{commercialNameShort}</span>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-zinc-700 flex-shrink-0 hidden sm:block" />

                {/* Studio Icon + Name + Plan Badge with Popover */}
                {isMounted ? (
                    <SubscriptionPopover studioSlug={studioSlug}>
                        <button className="hidden sm:flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
                            {/* Studio Icon - Three stacked cubes */}

                            {/* Studio Name */}
                            <span className="text-sm font-medium text-zinc-300 truncate">
                                {identidadData?.studio_name || studioSlug}
                            </span>
                            {/* Plan Badge */}
                            <SubscriptionBadge
                                status={identidadData?.subscription_status || undefined}
                                planName={identidadData?.plan_name || undefined}
                            />
                            {/* Chevron Icon */}
                            <ChevronDown className="h-4 w-4 text-zinc-400" />
                        </button>
                    </SubscriptionPopover>
                ) : (
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <span className="text-sm font-medium text-zinc-300 truncate">
                            {identidadData?.studio_name || studioSlug}
                        </span>
                        <SubscriptionBadge
                            status={identidadData?.subscription_status || undefined}
                            planName={identidadData?.plan_name || undefined}
                        />
                    </div>
                )}

                {/* Breadcrumb - Hidden on mobile */}
                <div className="hidden md:block ml-4">
                    <BreadcrumbHeader studioSlug={studioSlug} />
                </div>
            </div>

            {/* RIGHT: Actions */}
            <div className="flex items-center gap-2 lg:gap-4">

                {/* Badge de Almacenamiento - oculto en mobile */}
                <div className="hidden md:block">
                    <StorageBadge studioSlug={studioSlug} />
                </div>

                {/* Google Suite Status */}
                <GoogleStatusPopover studioSlug={studioSlug}>
                    <ZenButton
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                        title="Google Suite"
                    >
                        <svg
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span className="sr-only">Google Suite</span>
                    </ZenButton>
                </GoogleStatusPopover>

                {/* Notificaciones */}
                <NotificationsDropdown studioSlug={studioSlug} />

                {/* Avatar del usuario - siempre visible */}
                <UserAvatar studioSlug={studioSlug} />
            </div>
        </header>
    );
}
