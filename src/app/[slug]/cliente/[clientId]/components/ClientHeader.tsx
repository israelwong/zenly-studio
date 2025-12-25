'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';
import { useFavicon } from '@/hooks/useFavicon';
import { NotificationsDropdown } from '@/components/client/notifications/NotificationsDropdown';
import { ClientAvatar } from './ClientAvatar';
import type { ClientSession } from '@/types/client';
import type { StudioPublicInfo } from '@/lib/actions/cliente';

interface ClientHeaderProps {
  slug: string;
  cliente: ClientSession;
  studioInfo?: StudioPublicInfo | null;
}

export function ClientHeader({ slug, cliente, studioInfo }: ClientHeaderProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Actualizar favicon dinámicamente
  useFavicon(studioInfo?.isotipo_url || studioInfo?.logo_url, studioInfo?.studio_name);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleProfileUpdate = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900/95 px-4 backdrop-blur-sm">
      {/* LEFT: Studio Name */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Studio Icon + Name */}
        {isMounted ? (
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            {studioInfo?.logo_url ? (
              <div className="relative w-7 h-7 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                <Image
                  src={studioInfo.logo_url}
                  alt={studioInfo.studio_name || 'Logo'}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-7 h-7 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-3.5 w-3.5 text-zinc-500" />
              </div>
            )}
            <div className="flex flex-col gap-0 min-w-0">
              <span className="text-sm font-medium text-zinc-300 truncate">
                {studioInfo?.studio_name || 'Portal Cliente'}
              </span>
              <span className="text-[10px] text-zinc-500">Portal del cliente</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0 shrink-0 min-w-0">
            <span className="text-sm font-medium text-zinc-300 truncate">
              {studioInfo?.studio_name || 'Portal Cliente'}
            </span>
            <span className="text-[10px] text-zinc-500">Portal del cliente</span>
          </div>
        )}
      </div>

      {/* RIGHT: Notifications + Avatar */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Notificaciones */}
        <NotificationsDropdown studioSlug={slug} contactId={cliente.id} />

        {/* Avatar con menú */}
        <ClientAvatar
          key={refreshKey}
          slug={slug}
          cliente={cliente}
          avatarUrl={cliente.avatar_url}
          onProfileUpdate={handleProfileUpdate}
        />
      </div>
    </header>
  );
}
