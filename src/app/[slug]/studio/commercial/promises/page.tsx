'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { UserSearch, Plus, Receipt, AlertTriangle, Trash2, Eye, EyeOff } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import { PromisesWrapper } from './components';
import { PromiseMainToolbar } from './components/PromiseMainToolbar';
import { CondicionesComercialesManager } from '@/components/shared/condiciones-comerciales';
import { TerminosCondicionesEditor } from '@/components/shared/terminos-condiciones';
import { AvisoPrivacidadManager } from '@/components/shared/avisos-privacidad/AvisoPrivacidadManager';
import { PipelineConfigModal } from './components/PipelineConfigModal';
import { PromiseTagsManageModal } from './components/PromiseTagsManageModal';
import { PaymentMethodsModal } from '@/components/shared/payments/PaymentMethodsModal';
import { FileText } from 'lucide-react';
import { getTestPromisesCount, deleteTestPromises } from '@/lib/actions/studio/commercial/promises/promises.actions';
import { getPipelineStages } from '@/lib/actions/studio/commercial/promises';
import { toast } from 'sonner';
import type { PipelineStage } from '@/lib/actions/schemas/promises-schemas';

export default function PromisesPage() {
  const params = useParams();
  const studioSlug = params.slug as string;
  const openPromiseFormRef = useRef<(() => void) | null>(null);
  const reloadKanbanRef = useRef<(() => void) | null>(null);
  const removeTestPromisesRef = useRef<(() => void) | null>(null);
  const [showCondicionesManager, setShowCondicionesManager] = useState(false);
  const [showTerminosManager, setShowTerminosManager] = useState(false);
  const [showAvisoPrivacidad, setShowAvisoPrivacidad] = useState(false);
  const [showPipelineConfig, setShowPipelineConfig] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [testPromisesCount, setTestPromisesCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    document.title = 'Zenly Studio - Promesas';
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

  // Cargar etapas del pipeline
  useEffect(() => {
    const loadPipelineStages = async () => {
      const result = await getPipelineStages(studioSlug);
      if (result.success && result.data) {
        setPipelineStages(result.data);
      }
    };
    loadPipelineStages();
  }, [studioSlug]);

  const handlePipelineStagesUpdated = () => {
    const loadPipelineStages = async () => {
      const result = await getPipelineStages(studioSlug);
      if (result.success && result.data) {
        setPipelineStages(result.data);
      }
    };
    loadPipelineStages();
  };

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
                  Gestiona tus promesas de contratación
                </ZenCardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ZenButton onClick={handleOpenPromiseForm}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Promesa
              </ZenButton>
            </div>
          </div>
        </ZenCardHeader>

        {/* Toolbar principal */}
        <PromiseMainToolbar
          studioSlug={studioSlug}
          onCondicionesComercialesClick={() => setShowCondicionesManager(true)}
          onTerminosCondicionesClick={() => setShowTerminosManager(true)}
          onAvisoPrivacidadClick={() => setShowAvisoPrivacidad(true)}
          onTagsClick={() => setShowTagsModal(true)}
          onPaymentMethodsClick={() => setShowPaymentMethods(true)}
        />

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

      <TerminosCondicionesEditor
        studioSlug={studioSlug}
        isOpen={showTerminosManager}
        onClose={() => setShowTerminosManager(false)}
      />

      <AvisoPrivacidadManager
        studioSlug={studioSlug}
        isOpen={showAvisoPrivacidad}
        onClose={() => setShowAvisoPrivacidad(false)}
      />

      <PipelineConfigModal
        isOpen={showPipelineConfig}
        onClose={() => setShowPipelineConfig(false)}
        studioSlug={studioSlug}
        pipelineStages={pipelineStages}
        onSuccess={handlePipelineStagesUpdated}
      />

      <PromiseTagsManageModal
        isOpen={showTagsModal}
        onClose={() => setShowTagsModal(false)}
        studioSlug={studioSlug}
      />

      <PaymentMethodsModal
        isOpen={showPaymentMethods}
        onClose={() => setShowPaymentMethods(false)}
        studioSlug={studioSlug}
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

