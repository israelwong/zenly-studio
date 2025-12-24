'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Edit } from 'lucide-react';
import Image from 'next/image';
import { logoutCliente, actualizarPerfilCliente } from '@/lib/actions/cliente';
import { ZenButton } from '@/components/ui/zen';
import {
  ZenDropdownMenu,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuLabel,
  ZenDropdownMenuSeparator,
  ZenDropdownMenuTrigger,
} from '@/components/ui/zen';
import { ClientProfileModal } from './ClientProfileModal';
import type { ClientSession } from '@/types/client';

interface ClientAvatarProps {
  slug: string;
  cliente: ClientSession;
  avatarUrl?: string | null;
  onProfileUpdate?: () => void;
}

export function ClientAvatar({ slug, cliente, avatarUrl, onProfileUpdate }: ClientAvatarProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(avatarUrl || null);
  const [currentName, setCurrentName] = useState(cliente.name);

  useEffect(() => {
    setCurrentAvatarUrl(avatarUrl || null);
  }, [avatarUrl]);

  useEffect(() => {
    setCurrentName(cliente.name);
  }, [cliente.name]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await logoutCliente(slug);
    } catch (error) {
      router.push(`/${slug}/cliente/login`);
    }
  };

  const handleProfileUpdate = async (
    name: string,
    phone: string,
    email: string | null,
    address: string | null,
    newAvatarUrl: string | null
  ) => {
    try {
      const result = await actualizarPerfilCliente(slug, {
        name,
        phone,
        email: email || '',
        address: address || '',
        avatar_url: newAvatarUrl || '',
      });

      if (result.success && result.data) {
        setCurrentName(result.data.name);
        setCurrentAvatarUrl(result.data.avatar_url);
        if (onProfileUpdate) {
          onProfileUpdate();
        }
        setShowProfileModal(false);
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
    }
  };

  const userName = currentName || cliente.name || 'Cliente';
  const userEmail = cliente.email;

  const userInitials = userName
    .split(' ')
    .map((name: string) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const displayAvatarUrl = currentAvatarUrl &&
    typeof currentAvatarUrl === 'string' &&
    currentAvatarUrl.trim() !== '' &&
    !imageError
    ? currentAvatarUrl.trim()
    : null;

  return (
    <>
      <ZenDropdownMenu>
        <ZenDropdownMenuTrigger asChild>
          <ZenButton
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-zinc-800"
          >
            {displayAvatarUrl ? (
              <div className="w-8 h-8 rounded-full overflow-hidden relative">
                <Image
                  src={displayAvatarUrl}
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
              {userEmail && (
                <p className="text-xs leading-none text-zinc-500">{userEmail}</p>
              )}
            </div>
          </ZenDropdownMenuLabel>

          <ZenDropdownMenuSeparator />

          <ZenDropdownMenuItem
            className="cursor-pointer"
            onClick={() => setShowProfileModal(true)}
          >
            <Edit className="mr-2 h-4 w-4" />
            <span>Editar perfil</span>
          </ZenDropdownMenuItem>

          <ZenDropdownMenuSeparator />

          <ZenDropdownMenuItem
            className="cursor-pointer text-red-400 focus:text-red-300"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}</span>
          </ZenDropdownMenuItem>
        </ZenDropdownMenuContent>
      </ZenDropdownMenu>

      <ClientProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        cliente={cliente}
        slug={slug}
        initialName={currentName}
        initialPhone={cliente.phone}
        initialEmail={cliente.email}
        initialAddress={cliente.address}
        initialAvatarUrl={currentAvatarUrl}
        onUpdate={handleProfileUpdate}
      />
    </>
  );
}

