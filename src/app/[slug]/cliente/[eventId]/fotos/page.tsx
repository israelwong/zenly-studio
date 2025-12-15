'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { useClientAuth } from '@/hooks/useClientAuth';
import { obtenerFotosEvento } from '@/lib/actions/public/cliente';
import {
  ClientNavbar,
  ClientFooter,
  GaleriaFotos,
} from '@/components/client';
import type { ClientFoto } from '@/types/client';

export default function EventoFotosPage() {
  const [fotos, setFotos] = useState<ClientFoto[]>([]);
  const [loading, setLoading] = useState(true);
  const { cliente, isAuthenticated, isLoading } = useClientAuth();
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const eventId = params?.eventId as string;

  useEffect(() => {
    const fetchFotos = async () => {
      if (!isAuthenticated || !cliente) {
        return;
      }

      try {
        setLoading(true);
        const response = await obtenerFotosEvento(eventId, cliente.id);

        if (response.success && response.data) {
          setFotos(response.data);
        }
      } catch (error) {
        console.error('Error al cargar fotos:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && cliente && eventId) {
      fetchFotos();
    }
  }, [isAuthenticated, cliente, eventId]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated || !cliente) {
    return null;
  }

  return (
    <>
      <ClientNavbar cliente={cliente} />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-zinc-900 border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
            <ZenButton
              variant="ghost"
              onClick={() => router.push(`/${slug}/client/${eventId}`)}
              className="text-zinc-300 hover:text-zinc-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al evento
            </ZenButton>

            <h1 className="text-3xl font-bold text-zinc-100">Galería de Fotos</h1>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {fotos.length > 0 ? (
            <GaleriaFotos fotos={fotos} />
          ) : (
            <div className="text-center py-16">
              <p className="text-zinc-400 text-lg">
                Aún no hay fotos disponibles para este evento
              </p>
            </div>
          )}
        </div>
      </main>

      <ClientFooter />
    </>
  );
}

