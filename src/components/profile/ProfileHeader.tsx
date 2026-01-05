'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus, LogOut, LayoutDashboard, UserPlus, LogIn, Pencil, Menu, Users, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { logout } from '@/lib/actions/auth/logout.action';
import { clearRememberMePreference } from '@/lib/supabase/storage-adapter';
import { EditStudioNameModal, EditSloganModal, EditLogoModal } from './modals';
import { MobileActionsSheet } from './MobileActionsSheet';
import { MobileGuestActionsSheet } from './MobileGuestActionsSheet';
import { useDynamicFavicon } from '@/hooks/useDynamicFavicon';

interface ProfileHeaderProps {
    data?: {
        studio_name?: string;
        slogan?: string | null;
        logo_url?: string | null;
    };
    loading?: boolean;
    studioSlug?: string;
    onCreatePost?: () => void; // Callback para abrir sheet de crear post
    onCreateOffer?: () => void; // Callback para crear oferta
    isEditMode?: boolean; // Habilita botones de edición inline
    showBackButton?: boolean; // Muestra botón de regresar
}

/**
 * Genera iniciales del nombre del estudio (1-2 letras)
 * Ejemplos:
 * - "ProSocial" → "PS"
 * - "Estudio Fotográfico" → "EF"
 * - "Luz" → "L"
 */
function getStudioInitials(studioName?: string): string {
    if (!studioName?.trim()) return '';

    const words = studioName.trim().split(/\s+/);

    if (words.length === 1) {
        // Una palabra: primera letra
        return words[0][0].toUpperCase();
    }

    // Múltiples palabras: primera letra de las primeras 2 palabras
    return words
        .slice(0, 2)
        .map(word => word[0])
        .join('')
        .toUpperCase();
}

/**
 * ProfileHeader - Componente reutilizable para header del perfil del estudio
 * Muestra logo, nombre del estudio y slogan en formato sticky
 * 
 * Usado en:
 * - Builder preview (header sticky)
 * - Perfil público (header completo)
 */
export function ProfileHeader({ data, loading = false, studioSlug, onCreatePost, onCreateOffer, isEditMode = false, showBackButton = false }: ProfileHeaderProps) {
    const router = useRouter();
    const { user } = useAuth();
    const studioData = data || {};
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
    const [mobileGuestActionsOpen, setMobileGuestActionsOpen] = useState(false);

    // Estados para modales de edición
    const [editNameModal, setEditNameModal] = useState(false);
    const [editSloganModal, setEditSloganModal] = useState(false);
    const [editLogoModal, setEditLogoModal] = useState(false);

    // Estado para manejar error de carga de imagen
    const [imageError, setImageError] = useState(false);

    // Actualizar favicon dinámicamente cuando cambia el logo
    useDynamicFavicon(studioData.logo_url);

    // Resetear error de imagen cuando cambia la URL
    React.useEffect(() => {
        setImageError(false);
    }, [studioData.logo_url]);

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
            router.push(`/${studioSlug}/studio/commercial/portafolios/nuevo`);
        }
    };

    const handleNewOffer = () => {
        if (onCreateOffer) {
            onCreateOffer();
        } else if (studioSlug) {
            window.open(`/${studioSlug}/studio/commercial/ofertas/nuevo`, '_blank');
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

    const handleClientPortal = () => {
        if (studioSlug) {
            router.push(`/${studioSlug}/cliente/login`);
        }
    };

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            clearRememberMePreference();
            // Redirigir al perfil público del estudio después de logout
            await logout(studioSlug ? `/${studioSlug}` : '/login');
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="sticky top-0 z-10 bg-zinc-900/50 backdrop-blur-lg w-full">
            <div className="w-full mx-auto max-w-[920px] px-4 py-5">
                <div className="flex items-center">
                    {/* Columna 1: Botón regresar (opcional), Logo, nombre y slogan */}
                    <div className="flex items-center space-x-3 flex-1">
                        {/* Botón regresar */}
                        {showBackButton && (
                            <button
                                onClick={() => router.back()}
                                className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shrink-0"
                                aria-label="Regresar"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        {/* Logo/Avatar con botón de edición */}
                        <div className="relative group shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-full flex items-center justify-center overflow-hidden">
                                {loading ? (
                                    <div className="w-6 h-6 bg-zinc-600 rounded-lg animate-pulse"></div>
                                ) : studioData.logo_url && !imageError ? (
                                    <Image
                                        src={studioData.logo_url}
                                        alt="Logo"
                                        width={40}
                                        height={40}
                                        className="w-full h-full object-cover"
                                        key={studioData.logo_url} // Force re-render on URL change
                                        onError={() => setImageError(true)} // Manejar error de carga
                                    />
                                ) : (
                                    // Iniciales del nombre del estudio (1-2 letras)
                                    <span className="text-white font-bold text-sm select-none">
                                        {getStudioInitials(studioData.studio_name)}
                                    </span>
                                )}
                            </div>

                            {/* Botón editar logo - solo visible en edit mode y hover */}
                            {isEditMode && !loading && (
                                <button
                                    onClick={() => setEditLogoModal(true)}
                                    className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Editar logo"
                                >
                                    <Pencil className="w-4 h-4 text-white" />
                                </button>
                            )}
                        </div>

                        {/* Información del estudio con botones de edición */}
                        <div className="flex-1 min-w-0">
                            {loading ? (
                                <>
                                    <div className="h-4 bg-zinc-700 rounded animate-pulse mb-2 w-32"></div>
                                    <div className="h-3 bg-zinc-700 rounded animate-pulse w-24"></div>
                                </>
                            ) : (
                                <>
                                    {/* Nombre del estudio */}
                                    <div className="flex items-center gap-2 group/name">
                                        <h1 className="text-white font-semibold text-sm truncate">
                                            {studioData.studio_name}
                                        </h1>
                                        {isEditMode && (
                                            <button
                                                onClick={() => setEditNameModal(true)}
                                                className="opacity-0 group-hover/name:opacity-100 transition-opacity p-1 hover:bg-zinc-800 rounded"
                                                aria-label="Editar nombre"
                                            >
                                                <Pencil className="w-3 h-3 text-zinc-400 hover:text-emerald-400" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Slogan */}
                                    <div className="flex items-center gap-2 group/slogan">
                                        {studioData.slogan ? (
                                            <p className="text-zinc-400 text-xs truncate">
                                                {studioData.slogan}
                                            </p>
                                        ) : isEditMode ? (
                                            <p className="text-zinc-600 text-xs italic">
                                                Sin slogan
                                            </p>
                                        ) : null}
                                        {isEditMode && (
                                            <button
                                                onClick={() => setEditSloganModal(true)}
                                                className="opacity-0 group-hover/slogan:opacity-100 transition-opacity p-1 hover:bg-zinc-800 rounded"
                                                aria-label="Editar slogan"
                                            >
                                                <Pencil className="w-3 h-3 text-zinc-400 hover:text-emerald-400" />
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Columna 2: Acciones según estado de autenticación */}
                    <div className="flex items-center gap-2">
                        {user ? (
                            <>
                                {/* Usuario autenticado */}
                                {studioSlug && (
                                    <>
                                        {/* Mobile: Botón menú */}
                                        <button
                                            onClick={() => setMobileActionsOpen(true)}
                                            className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
                                            aria-label="Menú de acciones"
                                        >
                                            <Menu className="w-4 h-4" />
                                        </button>

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
                                            <button
                                                onClick={handleNewOffer}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
                                                aria-label="Crear oferta"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Oferta
                                            </button>
                                        </div>

                                        {/* Botón Dashboard - Solo desktop */}
                                        <button
                                            onClick={handleDashboard}
                                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-md transition-colors"
                                            aria-label="Abrir dashboard"
                                        >
                                            <LayoutDashboard className="w-3.5 h-3.5" />
                                            <span>Dashboard</span>
                                        </button>
                                    </>
                                )}

                                {/* Botón Cerrar Sesión - Solo desktop */}
                                <button
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Cerrar sesión"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span>
                                        {isLoggingOut ? 'Cerrando...' : 'Salir'}
                                    </span>
                                </button>
                            </>
                        ) : (
                            <>
                                {/* Usuario no autenticado */}
                                {/* Mobile: Solo botón hamburguesa */}
                                <button
                                    onClick={() => setMobileGuestActionsOpen(true)}
                                    className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
                                    aria-label="Menú"
                                >
                                    <Menu className="w-4 h-4" />
                                </button>

                                {/* Desktop: Botones completos */}
                                <div className="hidden sm:flex items-center gap-2">
                                    <button
                                        onClick={handleClientPortal}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors"
                                        aria-label="Portal cliente"
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                        <span>Portal cliente</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Modales de edición */}
            {isEditMode && studioSlug && (
                <>
                    <EditStudioNameModal
                        isOpen={editNameModal}
                        onClose={() => setEditNameModal(false)}
                        studioSlug={studioSlug}
                        currentValue={studioData.studio_name || ''}
                        onSuccess={() => {
                            // Refrescar data del servidor
                            router.refresh();
                        }}
                    />
                    <EditSloganModal
                        isOpen={editSloganModal}
                        onClose={() => setEditSloganModal(false)}
                        studioSlug={studioSlug}
                        currentValue={studioData.slogan || null}
                        onSuccess={() => {
                            router.refresh();
                        }}
                    />
                    <EditLogoModal
                        isOpen={editLogoModal}
                        onClose={() => {
                            setEditLogoModal(false);
                            setImageError(false); // Reset error al cerrar
                        }}
                        studioSlug={studioSlug}
                        currentLogoUrl={studioData.logo_url || null}
                        onSuccess={() => {
                            setEditLogoModal(false); // Asegurar cierre
                            router.refresh();
                        }}
                    />
                </>
            )}

            {/* Mobile Actions Sheet - Usuario autenticado */}
            {user && studioSlug && (
                <MobileActionsSheet
                    isOpen={mobileActionsOpen}
                    onClose={() => setMobileActionsOpen(false)}
                    onCreatePost={handleNewPost}
                    onDashboard={handleDashboard}
                    onLogout={handleLogout}
                    isLoggingOut={isLoggingOut}
                />
            )}

            {/* Mobile Guest Actions Sheet - Usuario NO autenticado */}
            {!user && (
                <MobileGuestActionsSheet
                    isOpen={mobileGuestActionsOpen}
                    onClose={() => setMobileGuestActionsOpen(false)}
                    onClientPortal={handleClientPortal}
                />
            )}
        </div>
    );
}
