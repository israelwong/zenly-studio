'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { UserSearch, Plus, Receipt, AlertTriangle, Trash2, Eye, EyeOff } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenConfirmModal } from '@/components/ui/zen';
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
  const reloadKanbanRef = useRef<(() => void) | null>(null);
  const removeTestPromisesRef = useRef<(() => void) | null>(null);
  const [showCondicionesManager, setShowCondicionesManager] = useState(false);
  const [showTerminosManager, setShowTerminosManager] = useState(false);
  const [testPromisesCount, setTestPromisesCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    document.title = 'ZEN Studio - Promesas';
  }, []);

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
    setIsDeleting(true);
    try {
      const result = await deleteTestPromises(studioSlug);

      if (result.success) {
        // Cerrar el modal primero para evitar re-render
        setShowDeleteConfirm(false);

        // Esperar a que el modal se cierre completamente
        await new Promise(resolve => setTimeout(resolve, 200));

        // Remover promesas de prueba del estado local
        if (removeTestPromisesRef.current) {
          removeTestPromisesRef.current();
        }

        toast.success(`${result.deleted || 0} promesa(s) de prueba eliminadas`);
        setTestPromisesCount(0);
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
        <ZenCardHeader className="border-b border-zinc-800 shrink-0">
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
                  <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
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
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="text-amber-400 border-amber-400/50 hover:bg-amber-400/10 shrink-0"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpiar pruebas
                </ZenButton>
              </div>
            </div>
          </div>
        )}

        <ZenCardContent className="p-6 flex-1 min-h-0 overflow-hidden">
          <PromisesWrapper
            studioSlug={studioSlug}
            onOpenPromiseFormRef={openPromiseFormRef}
            onReloadKanbanRef={reloadKanbanRef}
            onRemoveTestPromisesRef={removeTestPromisesRef}
          />
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

      <ZenConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTestPromises}
        title="Eliminar promesas de prueba"
        description={`¿Estás seguro de que deseas eliminar ${testPromisesCount === 1 ? 'la promesa' : `las ${testPromisesCount} promesas`} de prueba? Esta acción no se puede deshacer.`}
        confirmText={isDeleting ? 'Eliminando...' : 'Eliminar'}
        cancelText="Cancelar"
        variant="destructive"
        disabled={isDeleting}
      />
    </div>
  );
}

