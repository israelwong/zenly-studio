'use client';

import { Shield, FileText } from 'lucide-react';
import { ZenCardContent } from '@/components/ui/zen';

interface EstadoActualCardProps {
  loading: boolean;
  activeAviso: any;
}

export function EstadoActualCard({ loading, activeAviso }: EstadoActualCardProps) {
  return (
    <ZenCardContent className="p-6">
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
          <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
        </div>
      ) : activeAviso ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Estado Actual</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Versión activa: {activeAviso.version} - Actualizado: {new Date(activeAviso.updated_at).toLocaleDateString('es-MX')}
            </p>
          </div>
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
  );
}

