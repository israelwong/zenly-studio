'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { UserSearch, Plus, Receipt, AlertTriangle, Trash2, Eye, EyeOff, Flask } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { PromisesWrapper } from './components';
import { CondicionesComercialesManager } from '@/components/shared/condiciones-comerciales';
import { TerminosCondicionesManager } from '@/components/shared/terminos-condiciones';
import { FileText } from 'lucide-react';
import { getTestPromisesCount, deleteTestPromises } from '@/lib/actions/studio/commercial/promises/promises.actions';
import { toast } from 'sonner';

export default function PromisesPage() {
  const params = useParams();
  const studioSlug = params.slug as string;
  const openPromiseFormRef = useRef<(() => void) | null>(null);
  const [showCondicionesManager, setShowCondicionesManager] = useState(false);
  const [showTerminosManager, setShowTerminosManager] = useState(false);
  const [testPromisesCount, setTestPromisesCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cargar conteo de promesas de prueba
  useEffect(() => {
    const loadTestCount = async () => {
      const result = await getTestPromisesCount(studioSlug);
      if (result.success && result.count !== undefined) {
        setTestPromisesCount(result.count);
      }
    };
    loadTestCount();
  }, [studioSlug]);

  const handleOpenPromiseForm = () => {
    if (openPromiseFormRef.current) {
      openPromiseFormRef.current();
    }
  };

  // Eliminar promesas de prueba
  const handleDeleteTestPromises = async () => {
    if (!confirm('¿Eliminar todas las promesas de prueba? Esta acción no se puede deshacer.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteTestPromises(studioSlug);
      
      if (result.success) {
        toast.success(`${result.deleted || 0} promesa(s) de prueba eliminadas`);
        setTestPromisesCount(0);
        // Recargar la página para actualizar el kanban
        window.location.reload();
      } else {
        toast.error(result.error || 'Error al eliminar promesas de prueba');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar promesas de prueba');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col">
      <ZenCard variant="default" padding="none" className="flex flex-col flex-1 min-h-0">
        <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <UserSearch className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <ZenCardTitle>Promesas</ZenCardTitle>
                <ZenCardDescription>
                  Gestiona tus promesas de eventos
                </ZenCardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTerminosManager(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                Términos y Condiciones
              </button>
              <button
                type="button"
                onClick={() => setShowCondicionesManager(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
              >
                <Receipt className="h-3.5 w-3.5" />
                Condiciones Comerciales
              </button>
              <ZenButton onClick={handleOpenPromiseForm}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Promesa
              </ZenButton>
            </div>
          </div>
        </ZenCardHeader>

        {/* Banner de promesas de prueba */}
        {testPromisesCount > 0 && (
          <div className="px-6 pt-6">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-amber-300">
                      Tienes {testPromisesCount} promesa{testPromisesCount > 1 ? 's' : ''} de prueba
                    </h4>
                    <p className="text-xs text-amber-400/70 mt-1">
                      Estas promesas se crearon desde el preview del editor de ofertas. 
                      Puedes eliminarlas cuando estés listo para trabajar solo con datos reales.
                    </p>
                  </div>
                </div>
                <ZenButton
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteTestPromises}
                  disabled={isDeleting}
                  className="text-amber-400 border-amber-400/50 hover:bg-amber-400/10 flex-shrink-0"
                >
                  {isDeleting ? (
                    <>
                      <div className="h-4 w-4 mr-2 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpiar pruebas
                    </>
                  )}
                </ZenButton>
              </div>
            </div>
          </div>
        )}

        <ZenCardContent className="p-6 flex-1 min-h-0 overflow-hidden">
          <PromisesWrapper studioSlug={studioSlug} onOpenPromiseFormRef={openPromiseFormRef} />
        </ZenCardContent>
      </ZenCard>

      <CondicionesComercialesManager
        studioSlug={studioSlug}
        isOpen={showCondicionesManager}
        onClose={() => setShowCondicionesManager(false)}
      />

      <TerminosCondicionesManager
        studioSlug={studioSlug}
        isOpen={showTerminosManager}
        onClose={() => setShowTerminosManager(false)}
      />
    </div>
  );
}

