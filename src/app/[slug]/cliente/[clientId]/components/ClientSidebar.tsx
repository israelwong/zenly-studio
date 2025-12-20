'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, Receipt, Mail, X, LayoutDashboard, ArrowLeft, Image, Video, Download, Gift } from 'lucide-react';
import {
  ZenSidebar,
  ZenSidebarContent,
  ZenSidebarMenu,
  ZenSidebarMenuItem,
  ZenSidebarMenuButton,
  useZenSidebar,
} from '@/components/ui/zen';
import { ZenButton } from '@/components/ui/zen';

interface ClientSidebarProps {
  slug: string;
  clientId: string;
  eventId: string;
  eventoName: string | null;
}

export function ClientSidebar({ slug, clientId, eventId, eventoName }: ClientSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, toggleSidebar } = useZenSidebar();

  const isActive = (path: string) => {
    return pathname === path;
  };

  const entregaDigitalItems = [
    {
      id: 'fotografias',
      name: 'Fotografías',
      href: `/${slug}/cliente/${clientId}/${eventId}/fotografias`,
      icon: Image,
    },
    {
      id: 'video',
      name: 'Video',
      href: `/${slug}/cliente/${clientId}/${eventId}/video`,
      icon: Video,
    },
  ];

  const serviciosAdicionalesItems = [
    {
      id: 'invitacion',
      name: 'Invitación Digital',
      href: `/${slug}/cliente/${clientId}/${eventId}/invitacion`,
      icon: Gift,
    },
  ];

  const menuItems = [
    {
      id: 'evento',
      name: 'Mi evento',
      href: `/${slug}/cliente/${clientId}/${eventId}`,
      icon: LayoutDashboard,
    },
    {
      id: 'cotizaciones',
      name: 'Cotizaciones',
      href: `/${slug}/cliente/${clientId}/${eventId}/cotizaciones`,
      icon: FileText,
    },
    {
      id: 'pagos',
      name: 'Historial de pagos',
      href: `/${slug}/cliente/${clientId}/${eventId}/pagos`,
      icon: Receipt,
    },
  ];

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

        {/* Navigation */}
        <ZenSidebarMenu className="pt-4">
          {/* Volver a eventos */}
          <div className="px-3 mb-4">
            <button
              onClick={() => router.push(`/${slug}/cliente/${clientId}`)}
              className="flex items-center gap-2 text-sm text-zinc-300 hover:text-zinc-100 transition-colors w-full py-2 px-2 rounded-md hover:bg-zinc-800/40"
            >
              <ArrowLeft className="h-4 w-4 flex-shrink-0" />
              <div className="flex flex-col items-start">
                <span className="font-medium">Eventos</span>
                <span className="text-xs text-zinc-500">Gestionar eventos</span>
              </div>
            </button>
          </div>

          {/* Divisor */}
          <div className="px-3 mb-4">
            <div className="h-px bg-zinc-800" />
          </div>

          {/* Secciones del evento */}
          <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Secciones
          </div>
          {menuItems.map((item) => (
            <ZenSidebarMenuItem key={item.id}>
              <ZenSidebarMenuButton
                isActive={isActive(item.href)}
                onClick={() => router.push(item.href)}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </ZenSidebarMenuButton>
            </ZenSidebarMenuItem>
          ))}

          {/* Entrega Digital */}
          <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-6">
            Entrega Digital
          </div>
          {entregaDigitalItems.map((item) => (
            <ZenSidebarMenuItem key={item.id}>
              <ZenSidebarMenuButton
                isActive={isActive(item.href)}
                onClick={() => router.push(item.href)}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </ZenSidebarMenuButton>
            </ZenSidebarMenuItem>
          ))}

          {/* Servicios Adicionales */}
          <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-6">
            Servicios Adicionales
          </div>
          {serviciosAdicionalesItems.map((item) => (
            <ZenSidebarMenuItem key={item.id}>
              <ZenSidebarMenuButton
                isActive={isActive(item.href)}
                onClick={() => router.push(item.href)}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </ZenSidebarMenuButton>
            </ZenSidebarMenuItem>
          ))}
        </ZenSidebarMenu>
      </ZenSidebarContent>

    </ZenSidebar>
  );
}
