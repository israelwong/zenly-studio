"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth/logout.action";
import { clearRememberMePreference } from "@/lib/supabase/storage-adapter";
import { ZenSidebarMenuButton } from "@/components/ui/zen";

interface LogoutButtonProps {
    className?: string;
    children?: React.ReactNode;
}

export function LogoutButton({ className, children }: LogoutButtonProps) {
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
            className={`text-zinc-400 hover:text-white hover:bg-zinc-800 ${className || ""}`}
        >
            <LogOut className="w-4 h-4" />
            <span>{isLoading ? "Cerrando..." : "Cerrar Sesión"}</span>
            {children}
        </ZenSidebarMenuButton>
    );
}
