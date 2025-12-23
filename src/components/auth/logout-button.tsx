"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth/logout.action";
import { clearRememberMePreference } from "@/lib/supabase/storage-adapter";
import { ZenSidebarMenuButton } from "@/components/ui/zen";

interface LogoutButtonProps {
    className?: string;
    children?: React.ReactNode;
    isCollapsed?: boolean;
}

export function LogoutButton({ className, children, isCollapsed = false }: LogoutButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogout = async () => {
        if (isLoading) return;

        setIsLoading(true);

        try {
            // Limpiar preferencia rememberMe al cerrar sesión explícitamente
            clearRememberMePreference();
            
            await logout();
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            setIsLoading(false);
        }
    };

    return (
        <ZenSidebarMenuButton
            onClick={handleLogout}
            disabled={isLoading}
            className={`text-zinc-400 hover:text-white hover:bg-zinc-800 ${isCollapsed ? "justify-center px-0" : ""} ${className || ""}`}
            title={isCollapsed ? (isLoading ? "Cerrando..." : "Cerrar Sesión") : undefined}
        >
            <LogOut className={isCollapsed ? "w-5 h-5" : "w-4 h-4"} />
            {!isCollapsed && (
                <span>{isLoading ? "Cerrando..." : "Cerrar Sesión"}</span>
            )}
            {children}
        </ZenSidebarMenuButton>
    );
}
