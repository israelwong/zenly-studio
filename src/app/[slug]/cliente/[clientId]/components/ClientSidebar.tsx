'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { Calendar, Home, LogOut } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { logoutCliente } from '@/lib/actions/public/cliente';
import type { ClientEvent } from '@/types/client';

interface ClientSidebarProps {
  eventos: ClientEvent[];
  clienteName: string;
}

export function ClientSidebar({ eventos, clienteName }: ClientSidebarProps) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const slug = params?.slug as string;
  const clientId = params?.clientId as string;

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
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* User Info */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-emerald-600 rounded-full flex items-center justify-center">
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
      <nav className="flex-1 p-4 space-y-1">
        <ZenButton
          variant={isActive(`/${slug}/cliente/${clientId}`) ? 'primary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => router.push(`/${slug}/cliente/${clientId}`)}
        >
          <Home className="h-4 w-4 mr-2" />
          Mis Eventos
        </ZenButton>

        {eventos.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">
              Eventos
            </p>
            <div className="space-y-1">
              {eventos.map((evento) => (
                <ZenButton
                  key={evento.id}
                  variant={isActive(`/${slug}/cliente/${clientId}/${evento.id}`) ? 'primary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => router.push(`/${slug}/cliente/${clientId}/${evento.id}`)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="truncate">{evento.name || 'Evento sin nombre'}</span>
                </ZenButton>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-zinc-800">
        <ZenButton
          variant="ghost"
          className="w-full justify-start text-zinc-400 hover:text-zinc-100"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </ZenButton>
      </div>
    </aside>
  );
}
