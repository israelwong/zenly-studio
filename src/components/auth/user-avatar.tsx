"use client";

import { useState, useEffect } from "react";
import { LogOut, CreditCard, UserCircle, Globe, Plus, FolderOpen, Settings } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { logout } from "@/lib/actions/auth/logout.action";
import { clearRememberMePreference } from "@/lib/supabase/storage-adapter";
import { getCurrentUserClient } from "@/lib/auth/user-utils-client";
import { useAvatarRefreshListener } from "@/hooks/useAvatarRefresh";
import { useAuth } from "@/contexts/AuthContext";
import { ZenButton } from "@/components/ui/zen";
import {
    ZenDropdownMenu,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
    ZenDropdownMenuLabel,
    ZenDropdownMenuSeparator,
    ZenDropdownMenuTrigger,
} from "@/components/ui/zen";

/** Perfil de usuario pre-cargado desde el servidor (obtenerPerfil: users + studio_user_profiles). */
export interface InitialUserProfile {
    name: string;
    avatarUrl: string | null;
}

export interface UserAvatarProps {
    className?: string;
    studioSlug?: string;
    /** Datos pre-cargados del servidor (layout). Evita parpadeo y petición extra; mismo origen que /cuenta. */
    initialUserProfile?: InitialUserProfile | null;
}

export function UserAvatar({ className, studioSlug, initialUserProfile }: UserAvatarProps) {
    const { user, loading } = useAuth();
    const [userProfile, setUserProfile] = useState<{
        fullName?: string | null;
        avatarUrl?: string | null;
    } | null>(() =>
        initialUserProfile
            ? { fullName: initialUserProfile.name, avatarUrl: initialUserProfile.avatarUrl }
            : null
    );
    const [isLoading, setIsLoading] = useState(!initialUserProfile);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [imageError, setImageError] = useState(false);

    const avatarRefreshTrigger = useAvatarRefreshListener();

    // Sincronizar con datos del servidor solo cuando name/avatarUrl cambian (primitivos). Evita bucle por referencia nueva de initialUserProfile.
    const initialName = initialUserProfile?.name;
    const initialAvatarUrl = initialUserProfile?.avatarUrl;
    useEffect(() => {
        if (initialName !== undefined) {
            setUserProfile({
                fullName: initialName,
                avatarUrl: initialAvatarUrl ?? null,
            });
        }
    }, [initialName, initialAvatarUrl]);

    // Cargar perfil: solo cuando no hay datos del servidor o cuando disparan avatar-refresh. NUNCA depender de initialUserProfile (objeto) para evitar bucle.
    useEffect(() => {
        if (loading) return;
        if (!user) {
            setIsLoading(false);
            return;
        }
        if (initialName !== undefined && avatarRefreshTrigger === 0) {
            setIsLoading(false);
            return;
        }

        const loadUserProfile = async () => {
            try {
                if (initialName === undefined) setIsLoading(true);

                const authUser = studioSlug
                    ? await getCurrentUserClient(studioSlug)
                    : await getCurrentUserClient();

                if (authUser) {
                    const avatarUrl =
                        authUser.profile.avatarUrl && authUser.profile.avatarUrl.trim() !== ''
                            ? authUser.profile.avatarUrl
                            : null;

                    setUserProfile({
                        fullName: authUser.profile.fullName,
                        avatarUrl: avatarUrl,
                    });
                }
            } catch (error) {
                console.error("[UserAvatar] Error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadUserProfile();
    }, [user, studioSlug, avatarRefreshTrigger, loading, initialName]);

    // Resetear error de imagen cuando cambie el avatarUrl
    useEffect(() => {
        if (userProfile?.avatarUrl) {
            setImageError(false);
        }
    }, [userProfile?.avatarUrl]);

    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);

        try {
            // Limpiar preferencia rememberMe al cerrar sesión explícitamente
            clearRememberMePreference();

            await logout();
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            setIsLoggingOut(false);
        }
    };

    if (loading || isLoading) {
        return (
            <div className={`animate-pulse ${className}`}>
                <div className="w-8 h-8 bg-zinc-700 rounded-full"></div>
            </div>
        );
    }

    // ✅ CRÍTICO: Si tenemos initialUserProfile del servidor, renderizar aunque useAuth() no tenga usuario
    // Esto resuelve problemas de hidratación donde el servidor tiene sesión pero el cliente no la detecta inmediatamente
    if (!user && !initialUserProfile) {
        return null;
    }

    // Nombre: perfil unificado (studio_user_profiles ?? users) → metadata → email → fallback
    const userName =
        userProfile?.fullName ??
        initialUserProfile?.name ??
        user?.user_metadata?.full_name ??
        user?.email ??
        "Usuario";
    const userEmail = user?.email ?? initialUserProfile?.name ?? "Usuario";
    // Avatar: perfil → user_metadata → identities (Google picture tras link suele estar en identity_data)
    const rawAvatar =
        userProfile?.avatarUrl ??
        initialUserProfile?.avatarUrl ??
        (user?.user_metadata as Record<string, unknown>)?.avatar_url ??
        (user?.user_metadata as Record<string, unknown>)?.picture ??
        (() => {
            const ids = user?.identities ?? [];
            for (const id of ids) {
                const data = id.identity_data as { picture?: string; avatar_url?: string } | undefined;
                const pic = data?.picture ?? data?.avatar_url;
                if (pic && typeof pic === "string" && pic.trim() !== "") return pic.trim();
            }
            return null as string | null;
        })();
    const avatarUrl =
        rawAvatar && typeof rawAvatar === "string" && rawAvatar.trim() !== ""
            ? rawAvatar.trim()
            : null;

    // Iniciales como fallback cuando no hay avatar
    const userInitials = userName
        .split(" ")
        .map((name: string) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    // Determinar rutas basadas en la ruta actual
    const basePath = studioSlug ? `/${studioSlug}/studio` : '';

    // Rutas del menú
    const menuRoutes = {
        verPerfilPublico: studioSlug ? `/${studioSlug}` : '',
        perfil: `${basePath}/config/account`,
        suscripcion: `${basePath}/config/suscripcion`,
    };

    return (
        <ZenDropdownMenu>
            <ZenDropdownMenuTrigger asChild>
                <ZenButton
                    variant="ghost"
                    size="icon"
                    className={`rounded-full hover:bg-zinc-800 ${className}`}
                >
                    {avatarUrl && !imageError ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden relative">
                            <Image
                                src={avatarUrl}
                                alt={userName}
                                fill
                                className="object-cover"
                                onError={() => {
                                    setImageError(true);
                                }}
                                onLoad={() => {
                                    setImageError(false);
                                }}
                                unoptimized
                            />
                        </div>
                    ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-zinc-600 to-zinc-800 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {userInitials}
                        </div>
                    )}
                </ZenButton>
            </ZenDropdownMenuTrigger>

            <ZenDropdownMenuContent align="end" className="w-56">
                <ZenDropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userName}</p>
                        <p className="text-xs leading-none text-zinc-500">{userEmail}</p>
                    </div>
                </ZenDropdownMenuLabel>

                <ZenDropdownMenuSeparator />

                {/* Perfil de Negocio */}
                {studioSlug && (
                    <>
                        <div className="px-2 py-1.5">
                            <div className="text-xs font-medium text-zinc-400">Perfil de negocio</div>
                        </div>
                        <ZenDropdownMenuItem className="cursor-pointer" asChild>
                            <Link href={menuRoutes.verPerfilPublico} target="_blank" rel="noopener noreferrer">
                                <Globe className="mr-2 h-4 w-4" />
                                <span>Visitar perfil</span>
                            </Link>
                        </ZenDropdownMenuItem>
                        <ZenDropdownMenuItem className="cursor-pointer" asChild>
                            <Link href={`/${studioSlug}/studio/config/perfil-negocio`}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Editar perfil</span>
                            </Link>
                        </ZenDropdownMenuItem>
                        <ZenDropdownMenuSeparator />
                    </>
                )}

                {/* Contenido */}
                {studioSlug && (
                    <>
                        <div className="px-2 py-1.5">
                            <div className="text-xs font-medium text-zinc-400">Contenido</div>
                        </div>
                        <ZenDropdownMenuItem className="cursor-pointer" asChild>
                            <Link href={`/${studioSlug}?createPost=true`} target="_blank" rel="noopener noreferrer">
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Crear post</span>
                            </Link>
                        </ZenDropdownMenuItem>
                        <ZenDropdownMenuItem className="cursor-pointer" asChild>
                            <Link href={`/${studioSlug}/studio/commercial/portafolios/nuevo`} target="_blank" rel="noopener noreferrer">
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Portafolio</span>
                            </Link>
                        </ZenDropdownMenuItem>
                        <ZenDropdownMenuItem className="cursor-pointer" asChild>
                            <Link href={`/${studioSlug}/studio/commercial/ofertas/nuevo`} target="_blank" rel="noopener noreferrer">
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Crear oferta</span>
                            </Link>
                        </ZenDropdownMenuItem>
                        <ZenDropdownMenuSeparator />
                    </>
                )}

                {/* Cuenta */}
                <div className="px-2 py-1.5">
                    <div className="text-xs font-medium text-zinc-400">Cuenta</div>
                </div>

                <ZenDropdownMenuItem className="cursor-pointer" asChild>
                    <Link href={menuRoutes.perfil}>
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Configurar</span>
                    </Link>
                </ZenDropdownMenuItem>

                <ZenDropdownMenuItem className="cursor-pointer" asChild>
                    <Link href={menuRoutes.suscripcion}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Suscripción</span>
                    </Link>
                </ZenDropdownMenuItem>

                <ZenDropdownMenuSeparator />

                <ZenDropdownMenuItem
                    className="cursor-pointer text-red-400 focus:text-red-300"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isLoggingOut ? "Cerrando..." : "Cerrar Sesión"}</span>
                </ZenDropdownMenuItem>
            </ZenDropdownMenuContent>
        </ZenDropdownMenu>
    );
}
