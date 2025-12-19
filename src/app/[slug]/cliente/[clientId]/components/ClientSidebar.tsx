'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Home, LogOut, X } from 'lucide-react';
import {
  ZenSidebar,
  ZenSidebarContent,
  ZenSidebarFooter,
  ZenSidebarMenu,
  ZenSidebarMenuItem,
  ZenSidebarMenuButton,
  useZenSidebar,
} from '@/components/ui/zen';
import { ZenButton } from '@/components/ui/zen';
import { logoutCliente } from '@/lib/actions/public/cliente';
import type { ClientEvent } from '@/types/client';

interface ClientSidebarProps {
  slug: string;
  clientId: string;
  eventos: ClientEvent[];
  clienteName: string;
}

export function ClientSidebar({ slug, clientId, eventos, clienteName }: ClientSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, toggleSidebar } = useZenSidebar();

  const handleLogout = async () => {
    try {
      await logoutCliente(slug);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      router.push(`/${slug}/cliente/login`);
    }
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <ZenSidebar className={`${isOpen ? '' : 'hidden lg:block'} w-60 lg:w-60 sm:w-60`}>
      <ZenSidebarContent className="px-4">
        {/* Botón de cerrar - Solo visible en mobile */}
        <div className="flex justify-end pt-4 pb-2 lg:hidden">
          <ZenButton
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </ZenButton>
        </div>

        {/* User Info */}
        <div className="px-3 py-4 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-white">
                {clienteName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">{clienteName}</p>
              <p className="text-xs text-zinc-400">Cliente</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ZenSidebarMenu className="pt-4">
          {/* Dashboard */}
          <ZenSidebarMenuItem>
            <ZenSidebarMenuButton
              isActive={isActive(`/${slug}/cliente/${clientId}`)}
              onClick={() => router.push(`/${slug}/cliente/${clientId}`)}
            >
              <Home className="h-4 w-4" />
              <span>Mis Eventos</span>
            </ZenSidebarMenuButton>
          </ZenSidebarMenuItem>

          {/* Eventos */}
          {eventos.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-6">
                Eventos
              </div>
              {eventos.map((evento) => (
                <ZenSidebarMenuItem key={evento.id}>
                  <ZenSidebarMenuButton
                    isActive={isActive(`/${slug}/cliente/${clientId}/${evento.id}`)}
                    onClick={() => router.push(`/${slug}/cliente/${clientId}/${evento.id}`)}
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="truncate">{evento.name || 'Evento sin nombre'}</span>
                  </ZenSidebarMenuButton>
                </ZenSidebarMenuItem>
              ))}
            </>
          )}
        </ZenSidebarMenu>
      </ZenSidebarContent>

      <ZenSidebarFooter>
        <ZenSidebarMenu>
          <ZenSidebarMenuItem>
            <ZenSidebarMenuButton
              onClick={handleLogout}
              className="text-zinc-400 hover:text-zinc-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </ZenSidebarMenuButton>
          </ZenSidebarMenuItem>
        </ZenSidebarMenu>
      </ZenSidebarFooter>
    </ZenSidebar>
  );
}
