"use client";

import { useState, useEffect } from "react";
import { LogOut, Settings, CreditCard, UserCircle, Rocket, LayoutDashboard } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/lib/actions/auth/logout.action";
import { getCurrentUserClient } from "@/lib/auth/user-utils-client";
import { useAvatarRefreshListener } from "@/hooks/useAvatarRefresh";
import { ZenButton } from "@/components/ui/zen";
import {
    ZenDropdownMenu,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
    ZenDropdownMenuLabel,
    ZenDropdownMenuSeparator,
    ZenDropdownMenuTrigger,
} from "@/components/ui/zen";

interface UserAvatarProps {
    className?: string;
    studioSlug?: string;
}

export function UserAvatar({ className, studioSlug }: UserAvatarProps) {
    const [user, setUser] = useState<{
        email?: string;
        user_metadata?: { full_name?: string };
    } | null>(null);
    const [userProfile, setUserProfile] = useState<{
        fullName?: string | null;
        avatarUrl?: string | null;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [imageError, setImageError] = useState(false);
    const pathname = usePathname();

    // Escuchar cambios en el avatar
    const avatarRefreshTrigger = useAvatarRefreshListener();

    useEffect(() => {
        const getUser = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                if (user) {
                    // Obtener perfil completo del usuario desde la base de datos
                    // Pasar studioSlug si está disponible para buscar por studio_id
                    const authUser = studioSlug
                        ? await getCurrentUserClient(studioSlug)
                        : await getCurrentUserClient();
                    if (authUser) {
                        // Validar que avatarUrl no sea null ni cadena vacía
                        const avatarUrl = authUser.profile.avatarUrl && authUser.profile.avatarUrl.trim() !== ''
                            ? authUser.profile.avatarUrl
                            : null;

                        setUserProfile({
                            fullName: authUser.profile.fullName,
                            avatarUrl: avatarUrl
                        });
                    }
                }
            } catch (error) {
                console.error("Error getting user:", error);
            } finally {
                setIsLoading(false);
            }
        };

        getUser();
    }, [studioSlug, avatarRefreshTrigger]); // Recargar cuando cambie el studioSlug o se actualice el avatar

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
            await logout();
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            setIsLoggingOut(false);
        }
    };

    if (isLoading) {
        return (
            <div className={`animate-pulse ${className}`}>
                <div className="w-8 h-8 bg-zinc-700 rounded-full"></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    // Obtener información del usuario con fallbacks
    const userName = userProfile?.fullName || user?.user_metadata?.full_name || user?.email || "Usuario";
    const userEmail = user?.email;
    // Validar que avatarUrl sea una URL válida (no null, no vacía)
    const avatarUrl = userProfile?.avatarUrl &&
        typeof userProfile.avatarUrl === 'string' &&
        userProfile.avatarUrl.trim() !== ''
        ? userProfile.avatarUrl.trim()
        : null;

    // Generar iniciales para el fallback
    const userInitials = userName
        .split(" ")
        .map((name: string) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    // Determinar rutas basadas en la ruta actual
    const isInConfiguracion = pathname.includes('/configuracion');
    const basePath = studioSlug ? `/${studioSlug}/studio` : '';

    // Rutas del menú
    const menuRoutes = {
        perfil: `${basePath}/configuracion/cuenta/perfil`,
        suscripcion: `${basePath}/configuracion/cuenta/suscripcion`,
        builder: `${basePath}/builder`,
        configuracion: isInConfiguracion ? `${basePath}/dashboard` : `${basePath}/configuracion`
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

                <ZenDropdownMenuItem className="cursor-pointer" asChild>
                    <Link href={menuRoutes.perfil}>
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Perfil</span>
                    </Link>
                </ZenDropdownMenuItem>

                <ZenDropdownMenuItem className="cursor-pointer" asChild>
                    <Link href={menuRoutes.suscripcion}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Suscripción</span>
                    </Link>
                </ZenDropdownMenuItem>

                <ZenDropdownMenuSeparator />

                {/* Espacio de Trabajo */}
                <div className="px-2 py-1.5">
                    <div className="text-xs font-medium text-zinc-400">Espacio de Trabajo</div>
                </div>

                <ZenDropdownMenuItem className="cursor-pointer" asChild>
                    <Link href={`/${studioSlug}/studio/dashboard`}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </Link>
                </ZenDropdownMenuItem>

                <ZenDropdownMenuItem className="cursor-pointer" asChild>
                    <Link href={menuRoutes.builder}>
                        <Rocket className="mr-2 h-4 w-4" />
                        <span>Studio Builder</span>
                    </Link>
                </ZenDropdownMenuItem>

                <ZenDropdownMenuItem className="cursor-pointer" asChild>
                    <Link href={menuRoutes.configuracion}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Configuración</span>
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
