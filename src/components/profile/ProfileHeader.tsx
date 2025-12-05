'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus, LogOut, LayoutDashboard, UserPlus, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { logout } from '@/lib/actions/auth/logout.action';
import { clearRememberMePreference } from '@/lib/supabase/storage-adapter';

interface ProfileHeaderProps {
    data?: {
        studio_name?: string;
        slogan?: string | null;
        logo_url?: string | null;
    };
    loading?: boolean;
    studioSlug?: string;
    onCreatePost?: () => void; // Callback para abrir sheet de crear post
}

/**
 * ProfileHeader - Componente reutilizable para header del perfil del estudio
 * Muestra logo, nombre del estudio y slogan en formato sticky
 * 
 * Usado en:
 * - Builder preview (header sticky)
 * - Perfil público (header completo)
 */
export function ProfileHeader({ data, loading = false, studioSlug, onCreatePost }: ProfileHeaderProps) {
    const router = useRouter();
    const { user } = useAuth();
    const studioData = data || {};
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Solo mostrar header si hay datos reales o está cargando
    const hasData = studioData.studio_name || studioData.logo_url || loading;

    if (!hasData) {
        return null;
    }

    const handleNewPost = () => {
        if (onCreatePost) {
            onCreatePost();
        } else if (studioSlug) {
            router.push(`/${studioSlug}/profile/edit/content/posts/nuevo`);
        }
    };

    const handleNewPortfolio = () => {
        if (studioSlug) {
            router.push(`/${studioSlug}/profile/portfolio/nuevo`);
        }
    };

    const handleDashboard = () => {
        if (studioSlug) {
            window.open(`/${studioSlug}/studio/commercial/dashboard`, '_blank');
        }
    };

    const handleSignUp = () => {
        router.push('/sign-up');
    };

    const handleLogin = () => {
        router.push('/login');
    };

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            clearRememberMePreference();
            await logout();
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="sticky top-0 z-10 bg-zinc-900/50 backdrop-blur-lg w-full">
            <div className="w-full mx-auto max-w-[920px] px-4 py-5">
                <div className="flex items-center">
                    {/* Columna 1: Logo, nombre y slogan */}
                    <div className="flex items-center space-x-3 flex-1">
                        {/* Logo/Avatar */}
                        <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                            {loading ? (
                                <div className="w-6 h-6 bg-zinc-600 rounded-lg animate-pulse"></div>
                            ) : studioData.logo_url ? (
                                <Image
                                    src={studioData.logo_url}
                                    alt="Logo"
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-6 h-6 bg-zinc-500 rounded-lg"></div>
                            )}
                        </div>

                        {/* Información del estudio */}
                        <div className="flex-1">
                            {loading ? (
                                <>
                                    <div className="h-4 bg-zinc-700 rounded animate-pulse mb-2 w-32"></div>
                                    <div className="h-3 bg-zinc-700 rounded animate-pulse w-24"></div>
                                </>
                            ) : (
                                <>
                                    <h1 className="text-white font-semibold text-sm">
                                        {studioData.studio_name}
                                    </h1>
                                    {studioData.slogan && (
                                        <p className="text-zinc-400 text-xs">
                                            {studioData.slogan}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Columna 2: Acciones según estado de autenticación */}
                    <div className="flex items-center gap-2">
                        {user ? (
                            <>
                                {/* Usuario autenticado: Quick Actions + Dashboard + Editar + Salir */}
                                {studioSlug && (
                                    <>
                                        {/* Desktop: Botones separados */}
                                        <div className="hidden sm:flex items-center gap-2">
                                            <button
                                                onClick={handleNewPost}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
                                                aria-label="Crear post"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Post
                                            </button>
                                            <button
                                                onClick={handleNewPortfolio}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
                                                aria-label="Crear portfolio"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Portfolio
                                            </button>
                                        </div>

                                        {/* Botón Dashboard */}
                                        <button
                                            onClick={handleDashboard}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-md transition-colors"
                                            aria-label="Abrir dashboard"
                                        >
                                            <LayoutDashboard className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Dashboard</span>
                                        </button>
                                    </>
                                )}

                                {/* Botón Cerrar Sesión */}
                                <button
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Cerrar sesión"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">
                                        {isLoggingOut ? 'Cerrando...' : 'Salir'}
                                    </span>
                                </button>
                            </>
                        ) : (
                            <>
                                {/* Usuario no autenticado: Crear cuenta + Iniciar sesión */}
                                <button
                                    onClick={handleSignUp}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-100 bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors"
                                    aria-label="Crear cuenta"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Crear cuenta</span>
                                </button>
                                <button
                                    onClick={handleLogin}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
                                    aria-label="Iniciar sesión"
                                >
                                    <LogIn className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Iniciar sesión</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
