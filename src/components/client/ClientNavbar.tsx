'use client';

import { useParams, useRouter } from 'next/navigation';
import { LogOut, User, Building2 } from 'lucide-react';
import Image from 'next/image';
import { ZenButton } from '@/components/ui/zen';
import { logoutCliente } from '@/lib/actions/cliente';
import type { ClientSession } from '@/types/client';

interface ClientNavbarProps {
  cliente: ClientSession;
  studioName?: string;
  studioLogo?: string | null;
}

export function ClientNavbar({ cliente, studioName, studioLogo }: ClientNavbarProps) {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const handleLogout = async () => {
    try {
      await logoutCliente(slug);
    } catch (error) {
      router.push(`/${slug}/cliente/login`);
    }
  };

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Studio Name */}
          <div className="flex items-center gap-3">
            {studioLogo ? (
              <div className="relative h-10 w-10 rounded-full overflow-hidden bg-zinc-800">
                <Image
                  src={studioLogo}
                  alt={studioName || 'Logo'}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="h-10 w-10 bg-zinc-800 rounded-full flex items-center justify-center">
                <Building2 className="h-5 w-5 text-zinc-500" />
              </div>
            )}
            <h1 className="text-xl font-bold text-zinc-100">
              {studioName || 'Portal Cliente'}
            </h1>
          </div>

          {/* User Info + Logout */}
          <div className="flex items-center gap-4">
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
              Salir
            </ZenButton>
          </div>
        </div>
      </div>
    </nav>
  );
}

