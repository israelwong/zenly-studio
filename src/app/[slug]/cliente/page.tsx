'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useClientAuth } from '@/hooks/useClientAuth';
import { clearClienteSession } from '@/lib/actions/cliente';
import { Loader2 } from 'lucide-react';

export default function ClientDashboard() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  
  // Verificar si hay parámetro phone ANTES de cualquier otra cosa
  const phoneParam = useMemo(() => searchParams.get('phone'), [searchParams]);
  const [isClearingSession, setIsClearingSession] = useState(false);
  
  // Limpiar sesión inmediatamente si hay phone param (antes de que useClientAuth se ejecute)
  useEffect(() => {
    if (phoneParam && !isClearingSession) {
      setIsClearingSession(true);
      clearClienteSession().then(() => {
        router.push(`/${slug}/cliente/login?phone=${phoneParam}`);
      });
      return;
    }
  }, [phoneParam, slug, router, isClearingSession]);

  // Solo usar useClientAuth si NO hay parámetro phone
  const { cliente, isAuthenticated, isLoading } = useClientAuth();

  // Redirigir según estado de autenticación (solo si NO hay parámetro phone)
  useEffect(() => {
    if (phoneParam || isClearingSession) {
      return; // No hacer nada si hay phone param o estamos limpiando sesión
    }

    if (!isLoading) {
      if (!isAuthenticated || !cliente) {
        router.push(`/${slug}/cliente/login`);
      } else {
        // Redirigir a la página del cliente con su ID
        router.push(`/${slug}/cliente/${cliente.id}`);
      }
    }
  }, [isLoading, isAuthenticated, cliente, router, slug, phoneParam, isClearingSession]);

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
