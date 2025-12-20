'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Menu } from 'lucide-react';
import Image from 'next/image';
import { ZenButton } from '@/components/ui/zen';
import { useZenSidebar } from '@/components/ui/zen';
import { logoutCliente } from '@/lib/actions/public/cliente';
import type { ClientSession } from '@/types/client';
import type { StudioPublicInfo } from '@/lib/actions/public/cliente';

interface ClientHeaderProps {
  slug: string;
  cliente: ClientSession;
  studioInfo?: StudioPublicInfo | null;
}

export function ClientHeader({ slug, cliente, studioInfo }: ClientHeaderProps) {
  const router = useRouter();
  const { toggleSidebar } = useZenSidebar();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutCliente(slug);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      router.push(`/${slug}/cliente/login`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900/95 px-4 backdrop-blur-sm">
      {/* LEFT: Studio Name */}
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

        {/* Studio Icon + Name */}
        {isMounted ? (
          <div className="flex items-center gap-2 shrink-0">
            {studioInfo?.logo_url ? (
              <div className="relative w-6 h-6 rounded-md overflow-hidden bg-zinc-800 flex-shrink-0">
                <Image
                  src={studioInfo.logo_url}
                  alt={studioInfo.studio_name || 'Logo'}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-6 h-6 bg-zinc-800 rounded-md flex items-center justify-center flex-shrink-0">
                <User className="h-3 w-3 text-zinc-500" />
              </div>
            )}
            <span className="text-sm font-medium text-zinc-300 truncate">
              {studioInfo?.studio_name || 'Portal Cliente'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium text-zinc-300 truncate">
              {studioInfo?.studio_name || 'Portal Cliente'}
            </span>
          </div>
        )}
      </div>

      {/* RIGHT: User Info + Logout */}
      <div className="flex items-center gap-2 lg:gap-4">
        <div className="hidden sm:flex items-center gap-2 text-zinc-300">
          <User className="h-4 w-4" />
          <span className="text-sm">{cliente.name}</span>
        </div>
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-zinc-400 hover:text-zinc-100"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Salir</span>
        </ZenButton>
      </div>
    </header>
  );
}
