'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PerfilForm, PerfilSkeleton } from './components';
import { obtenerPerfil } from '@/lib/actions/studio/account/perfil.actions';
import { PerfilData } from './types';
import { toast } from 'sonner';

export default function PerfilPage() {
  const params = useParams();
  const studioSlug = params.slug as string;

  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Zenly Studio - Perfil';
  }, []);

  // Cargar datos del perfil
  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await obtenerPerfil(studioSlug);

        if (result.success && result.data) {
          setPerfil(result.data);
        } else {
          const errorMessage = typeof result.error === 'string'
            ? result.error
            : 'No se pudo cargar el perfil';
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } catch (err) {
        console.error('Error al cargar perfil:', err);
        setError('Error interno del servidor');
        toast.error('Error interno del servidor');
      } finally {
        setLoading(false);
      }
    };

    if (studioSlug) {
      cargarPerfil();
    }
  }, [studioSlug]);

  // Manejar actualización del perfil
  const handlePerfilUpdate = (perfilActualizado: PerfilData) => {
    setPerfil(perfilActualizado);
  };

  // Mostrar skeleton mientras carga
  if (loading) {
    return <PerfilSkeleton />;
  }

  // Mostrar error si no se pudo cargar
  if (error || !perfil) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-900/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white">Error al cargar el perfil</h2>
          <p className="text-zinc-400 max-w-md">
            {error || 'No se pudo cargar la información del perfil. Por favor, intenta recargar la página.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header de la página */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Perfil de Cuenta
              </h1>
              <p className="text-zinc-400">
                Gestiona tu información personal y foto de perfil
              </p>
            </div>
          </div>
        </div>

        {/* Formulario de perfil */}
        <PerfilForm
          studioSlug={studioSlug}
          perfil={perfil}
          onPerfilUpdate={handlePerfilUpdate}
        />
      </div>
    </div>
  );
}
