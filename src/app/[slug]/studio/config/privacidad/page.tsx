'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AvisoPrivacidadManager } from '@/components/shared/avisos-privacidad/AvisoPrivacidadManager';
import { obtenerAvisoPrivacidadActivo } from '@/lib/actions/studio/config/avisos-privacidad.actions';
import { PrivacidadHeader } from './components/PrivacidadHeader';
import { EstadoActualCard } from './components/EstadoActualCard';
import { RequisitosLegalesCard } from './components/RequisitosLegalesCard';

export default function PrivacidadPage() {
  const params = useParams();
  const studioSlug = params.slug as string;

  const [managerOpen, setManagerOpen] = useState(false);
  const [activeAviso, setActiveAviso] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Zenly Studio - Privacidad';
  }, []);

  useEffect(() => {
    loadActiveAviso();
  }, [studioSlug]);

  const loadActiveAviso = async () => {
    try {
      setLoading(true);
      const result = await obtenerAvisoPrivacidadActivo(studioSlug);
      if (result.success && result.data) {
        setActiveAviso(result.data);
      }
    } catch (error) {
      console.error('Error loading aviso:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PrivacidadHeader
        activeAviso={activeAviso}
        onManageClick={() => setManagerOpen(true)}
        content={<EstadoActualCard loading={loading} activeAviso={activeAviso} />}
      />
      <RequisitosLegalesCard />

      <AvisoPrivacidadManager
        studioSlug={studioSlug}
        isOpen={managerOpen}
        onClose={() => {
          setManagerOpen(false);
        }}
        onRefresh={() => {
          // Actualizar solo el aviso activo localmente
          loadActiveAviso();
        }}
      />
    </div>
  );
}

