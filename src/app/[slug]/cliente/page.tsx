'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Loader2 } from 'lucide-react';

export default function ClientDashboard() {
  const { cliente, isAuthenticated, isLoading } = useClientAuth();
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  // Redirigir según estado de autenticación
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !cliente) {
        router.push(`/${slug}/cliente/login`);
      } else {
        // Redirigir a la página del cliente con su ID
        router.push(`/${slug}/cliente/${cliente.id}`);
      }
    }
  }, [isLoading, isAuthenticated, cliente, router, slug]);

  // Mostrar loading simple mientras verifica sesión
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
        <p className="text-zinc-400 text-sm">Abriendo portal...</p>
      </div>
    </div>
  );
}
