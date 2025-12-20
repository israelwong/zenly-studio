'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ZenButton } from '@/components/ui/zen';
import { User, Bell, LogOut, Settings, ChevronDown } from 'lucide-react';
import { createClientSupabase } from '@/lib/supabase';
import { PlatformIsotipo } from '@/components/platform';
import { usePlatformName } from '@/hooks/usePlatformConfig';

interface NavbarProps {
    onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const router = useRouter();
    const platformName = usePlatformName();

    const handleLogout = async () => {
        const supabase = createClientSupabase();
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="sticky top-0 z-[999] flex h-16 shrink-0 items-center gap-x-4 border-b border-zinc-900 bg-zinc-900/70 px-6 shadow-sm">
            <ZenButton
                variant="ghost"
                size="sm"
                className="lg:hidden text-zinc-400 hover:text-white hover:bg-zinc-800"
                onClick={onMenuClick}
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </ZenButton>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                <div className="flex flex-1 items-center">
                    <div className="flex items-center space-x-3">
                        <PlatformIsotipo
                            width={32}
                            height={32}
                        />
                        <h1 className="text-lg font-semibold text-white">
                            {platformName}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                    <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-zinc-700" />

                    {/* Notificaciones - Temporal */}
                    <ZenButton
                        variant="ghost"
                        size="sm"
                        className="relative text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                        <Bell className="h-5 w-5" />
                        {/* Badge de notificaciones */}
                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            3
                        </span>
                    </ZenButton>

                    {/* Menú de Usuario */}
                    <div className="relative">
                        <ZenButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center gap-x-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                            <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-zinc-300" />
                            </div>
                            <span className="hidden lg:block text-sm font-medium text-white">
                                Admin User
                            </span>
                            <ChevronDown className="h-4 w-4" />
                        </ZenButton>

                        {/* Menú Desplegable */}
                        {isUserMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-50">
                                <div className="py-1">
                                    <div className="px-4 py-2 border-b border-zinc-700">
                                        <p className="text-sm font-medium text-white">Admin User</p>
                                        <p className="text-xs text-zinc-400">Super Administrador</p>
                                    </div>
                                    <ZenButton
                                        variant="ghost"
                                        size="sm"
                                        icon={Settings}
                                        iconPosition="left"
                                        fullWidth
                                        className="justify-start text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-none"
                                        onClick={() => {
                                            setIsUserMenuOpen(false);
                                            router.push('/admin/configuracion');
                                        }}
                                    >
                                        Configurar
                                    </ZenButton>
                                    <ZenButton
                                        variant="ghost"
                                        size="sm"
                                        icon={LogOut}
                                        iconPosition="left"
                                        fullWidth
                                        className="justify-start text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-none"
                                        onClick={() => {
                                            setIsUserMenuOpen(false);
                                            handleLogout();
                                        }}
                                    >
                                        Cerrar Sesión
                                    </ZenButton>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Overlay para cerrar el menú al hacer click fuera */}
            {isUserMenuOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                />
            )}
        </div>
    );
}
