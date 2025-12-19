'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useFavicon } from '@/hooks/useFavicon';
import { obtenerEventosCliente, obtenerStudioPublicInfo } from '@/lib/actions/public/cliente';
import { ClientHeader, ClientSidebar, ClientFooter } from './components';
import { Loader2 } from 'lucide-react';
import type { ClientEvent } from '@/types/client';
import type { StudioPublicInfo } from '@/lib/actions/public/cliente';

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const clientId = params?.clientId as string;
  const { cliente, isAuthenticated, isLoading } = useClientAuth();
  const [eventos, setEventos] = useState<ClientEvent[]>([]);
  const [studioInfo, setStudioInfo] = useState<StudioPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Actualizar favicon dinámicamente
  useFavicon(studioInfo?.isotipo_url || studioInfo?.logo_url, studioInfo?.studio_name);

  // Redirigir a login si no hay sesión
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/${slug}/cliente/login`);
    }
  }, [isLoading, isAuthenticated, router, slug]);

  // Verificar que el clientId coincida con el cliente autenticado
  useEffect(() => {
    if (!isLoading && isAuthenticated && cliente && clientId !== cliente.id) {
      router.push(`/${slug}/cliente/${cliente.id}`);
    }
  }, [isLoading, isAuthenticated, cliente, clientId, router, slug]);

  // Cargar datos cuando hay sesión
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !cliente || clientId !== cliente.id) {
        return;
      }

      try {
        setLoading(true);
        const [eventosResponse, studioInfoData] = await Promise.all([
          obtenerEventosCliente(cliente.id),
          obtenerStudioPublicInfo(slug),
        ]);

        if (eventosResponse.success && eventosResponse.data) {
          setEventos(eventosResponse.data);
        }

        if (studioInfoData) {
          setStudioInfo(studioInfoData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && cliente && clientId === cliente.id) {
      fetchData();
    }
  }, [isAuthenticated, cliente, clientId, slug]);

  // Mostrar loading simple mientras verifica sesión
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay sesión, mostrar loading mientras redirige
  if (!isAuthenticated || !cliente || clientId !== cliente.id) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <ClientHeader cliente={cliente} studioInfo={studioInfo} />
      <div className="flex flex-1 overflow-hidden">
        <ClientSidebar eventos={eventos} clienteName={cliente.name} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <ClientFooter />
    </div>
  );
}
