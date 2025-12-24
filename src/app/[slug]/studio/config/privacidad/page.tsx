'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, FileText } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { AvisoPrivacidadManager } from '@/components/shared/avisos-privacidad/AvisoPrivacidadManager';
import { obtenerAvisoPrivacidadActivo } from '@/lib/actions/studio/config/avisos-privacidad.actions';
import { useEffect } from 'react';

export default function PrivacidadPage() {
  const params = useParams();
  const studioSlug = params.slug as string;

  const [managerOpen, setManagerOpen] = useState(false);
  const [activeAviso, setActiveAviso] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="h-6 w-6 text-emerald-500" />
          Aviso de Privacidad
        </h1>
        <p className="text-zinc-400 mt-2">
          Gestiona el aviso de privacidad de tu estudio (requerido por LFPDPPP en México)
        </p>
      </div>

      {/* Estado actual */}
      <ZenCard>
        <ZenCardHeader>
          <ZenCardTitle>Estado Actual</ZenCardTitle>
          <ZenCardDescription>
            {activeAviso
              ? `Versión activa: ${activeAviso.version} - Actualizado: ${new Date(activeAviso.updated_at).toLocaleDateString('es-MX')}`
              : 'No hay aviso de privacidad activo. Crea uno para cumplir con los requisitos legales.'}
          </ZenCardDescription>
        </ZenCardHeader>
        <ZenCardContent>
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
              <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
            </div>
          ) : activeAviso ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-500">
                <FileText className="h-5 w-5" />
                <span className="font-medium">Aviso de Privacidad Activo</span>
              </div>
              <div className="text-sm text-zinc-400 space-y-1">
                <p>
                  <span className="font-medium">Título:</span> {activeAviso.title}
                </p>
                <p>
                  <span className="font-medium">Versión:</span> {activeAviso.version}
                </p>
                <p>
                  <span className="font-medium">Creado:</span>{' '}
                  {new Date(activeAviso.created_at).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 mb-4">
                No hay aviso de privacidad configurado
              </p>
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      {/* Información legal */}
      <ZenCard>
        <ZenCardHeader>
          <ZenCardTitle>Requisitos Legales (LFPDPPP)</ZenCardTitle>
          <ZenCardDescription>
            El aviso de privacidad debe incluir los siguientes elementos obligatorios:
          </ZenCardDescription>
        </ZenCardHeader>
        <ZenCardContent>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">•</span>
              <span>
                <strong>Identidad y domicilio del responsable:</strong> Nombre y dirección del estudio
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">•</span>
              <span>
                <strong>Finalidades del tratamiento:</strong> Propósitos para los que se recopilan los datos
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">•</span>
              <span>
                <strong>Opciones para limitar uso/divulgación:</strong> Mecanismos para restringir el uso de datos
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">•</span>
              <span>
                <strong>Medios para ejercer derechos ARCO:</strong> Acceso, Rectificación, Cancelación, Oposición
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">•</span>
              <span>
                <strong>Transferencias de datos:</strong> Información sobre compartir datos con terceros
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">•</span>
              <span>
                <strong>Procedimiento para comunicar cambios:</strong> Cómo se notificarán modificaciones
              </span>
            </li>
          </ul>
        </ZenCardContent>
      </ZenCard>

      {/* Botón de gestión */}
      <div className="flex justify-end">
        <ZenButton onClick={() => setManagerOpen(true)} icon={FileText}>
          {activeAviso ? 'Gestionar Avisos' : 'Crear Aviso de Privacidad'}
        </ZenButton>
      </div>

      <AvisoPrivacidadManager
        studioSlug={studioSlug}
        isOpen={managerOpen}
        onClose={() => {
          setManagerOpen(false);
          loadActiveAviso();
        }}
        onRefresh={loadActiveAviso}
      />
    </div>
  );
}

