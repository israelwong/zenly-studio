'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserSearch, Plus, AlertTriangle, Trash2, Zap } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import { PromisesKanbanClient } from './PromisesKanbanClient';
import { PromiseShareOptionsModal } from '../[promiseId]/components/PromiseShareOptionsModal';
import { deleteTestPromises, getTestPromisesCount } from '@/lib/actions/studio/commercial/promises/promises.actions';
import { toast } from 'sonner';
import type { PromiseWithContact, PipelineStage } from '@/lib/actions/schemas/promises-schemas';

import type { PromiseTag } from '@/lib/actions/studio/commercial/promises/promise-tags.actions';

interface PromisesPageClientProps {
  studioSlug: string;
  initialPromises: PromiseWithContact[];
  initialPipelineStages: PipelineStage[];
  initialUserId?: string | null;
}

export function PromisesPageClient({
  studioSlug,
  initialPromises,
  initialPipelineStages,
  initialUserId,
}: PromisesPageClientProps) {
  const router = useRouter();
  const openPromiseFormRef = useRef<(() => void) | null>(null);
  const removeTestPromisesRef = useRef<(() => void) | null>(null);
  const [testPromisesCount, setTestPromisesCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGlobalSettingsModal, setShowGlobalSettingsModal] = useState(false);

  useEffect(() => {
    document.title = 'Zenly Studio - Promesas';
  }, []);

  // ✅ Defer: cargar conteo de promesas de prueba después del montaje para reducir ráfaga inicial
  useEffect(() => {
    const timer = setTimeout(async () => {
      const result = await getTestPromisesCount(studioSlug).catch(() => ({ success: false as const, count: 0 }));
      if (result.success && result.count != null) {
        setTestPromisesCount(result.count);
      }
    }, 600);
    return () => clearTimeout(timer);
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
        setShowDeleteConfirm(false);
        await new Promise(resolve => setTimeout(resolve, 200));

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
    <div className="w-full max-w-7xl mx-auto flex flex-col">
      <ZenCard variant="default" padding="none" className="flex flex-col">
        <ZenCardHeader className="border-b border-zinc-800 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <UserSearch className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <ZenCardTitle>Promesas</ZenCardTitle>
                <ZenCardDescription>
                  Gestiona tus promesas de contratación
                </ZenCardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setShowGlobalSettingsModal(true)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Visualización y automatización
              </ZenButton>
              <span className="h-5 w-px bg-zinc-700 mx-4 shrink-0" aria-hidden />
              <ZenButton size="sm" onClick={handleOpenPromiseForm}>
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

        <ZenCardContent className="p-6 overflow-hidden">
          <PromisesKanbanClient
            studioSlug={studioSlug}
            initialPromises={initialPromises}
            initialPipelineStages={initialPipelineStages}
            initialUserId={initialUserId} // ✅ OPTIMIZACIÓN: Pasar userId desde servidor
            onOpenPromiseFormRef={openPromiseFormRef}
            onRemoveTestPromisesRef={removeTestPromisesRef}
          />
        </ZenCardContent>
      </ZenCard>

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

      <PromiseShareOptionsModal
        key="global"
        isOpen={showGlobalSettingsModal}
        onClose={() => setShowGlobalSettingsModal(false)}
        studioSlug={studioSlug}
        scope="global"
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
