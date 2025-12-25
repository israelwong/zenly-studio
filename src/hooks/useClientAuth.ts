'use client';

/**
 * Hook para manejar autenticación del cliente
 * Basado en migrate/cliente/hooks/useClienteAuth.ts
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { getClienteSession } from '@/lib/actions/cliente';
import type { ClientSession } from '@/types/client';

export function useClientAuth() {
  const [cliente, setCliente] = useState<ClientSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const phoneParam = searchParams.get('phone');

  useEffect(() => {
    // Si hay parámetro phone, no verificar sesión (se limpiará en el componente padre)
    if (phoneParam) {
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const session = await getClienteSession();

        if (session) {
          setCliente(session);
          setIsAuthenticated(true);
        } else {
          setCliente(null);
          setIsAuthenticated(false);
          // Redirect to login
          if (slug) {
            router.push(`/${slug}/cliente/login`);
          }
        }
      } catch (error) {
        console.error('[useClientAuth] Error:', error);
        setCliente(null);
        setIsAuthenticated(false);
        if (slug) {
          router.push(`/${slug}/client/login`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, slug, phoneParam]);

  return {
    cliente,
    isAuthenticated,
    isLoading,
  };
}

