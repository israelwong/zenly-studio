'use client';

import React, { useState } from 'react';
import { ZenDialog, ZenButton } from '@/components/ui/zen';
import { CondicionRadioCard } from './CondicionRadioCard';
import { CondicionesComercialesManager } from '@/components/shared/condiciones-comerciales/CondicionesComercialesManager';
import { Settings } from 'lucide-react';
import { obtenerTodasCondicionesComerciales } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { toast } from 'sonner';

interface CondicionComercial {
  id: string;
  name: string;
  description?: string | null;
  advance_percentage?: number | null;
  discount_percentage?: number | null;
  type?: string | null;
}

interface CondicionComercialSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  condiciones: CondicionComercial[];
  selectedId: string;
  onSelect: (id: string) => void;
  studioSlug: string;
  onRefresh?: () => void;
}

export function CondicionComercialSelectorModal({
  isOpen,
  onClose,
  condiciones,
  selectedId,
  onSelect,
  studioSlug,
  onRefresh,
}: CondicionComercialSelectorModalProps) {
  const [tempSelectedId, setTempSelectedId] = React.useState(selectedId);
  const [showManager, setShowManager] = useState(false);
  const [localCondiciones, setLocalCondiciones] = useState(condiciones);
  const [condicionesIdsBeforeManager, setCondicionesIdsBeforeManager] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (isOpen) {
      setTempSelectedId(selectedId);
      setLocalCondiciones(condiciones);
    }
  }, [isOpen, selectedId, condiciones]);

  const handleConfirm = () => {
    onSelect(tempSelectedId);
    onClose();
  };

  const handleRefresh = async () => {
    try {
      const result = await obtenerTodasCondicionesComerciales(studioSlug);
      if (result.success && result.data) {
        const nuevasCondicionesIds = new Set(result.data.map(c => c.id));
        
        // Encontrar la condición nueva comparando los IDs
        const nuevaCondicion = result.data.find(c => !condicionesIdsBeforeManager.has(c.id));
        
        setLocalCondiciones(result.data);
        
        // Si se creó una nueva condición, seleccionarla automáticamente
        if (nuevaCondicion) {
          setTempSelectedId(nuevaCondicion.id);
          toast.success(`Condición "${nuevaCondicion.name}" seleccionada automáticamente`);
        }
        
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error refreshing condiciones:', error);
      toast.error('Error al actualizar condiciones');
    }
  };

  const handleManagerOpen = () => {
    // Guardar los IDs actuales antes de abrir el manager
    setCondicionesIdsBeforeManager(new Set(localCondiciones.map(c => c.id)));
    setShowManager(true);
  };

  const handleManagerClose = () => {
    setShowManager(false);
    handleRefresh();
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={onClose}
        title="Seleccionar Condiciones Comerciales"
        maxWidth="md"
        onSave={handleConfirm}
        onCancel={onClose}
        saveLabel="Confirmar"
        cancelLabel="Cancelar"
        zIndex={10070}
      >
        <div className="space-y-4">
          {/* Descripción y Botón Gestionar */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-400 mt-1">
              Elige las condiciones comerciales para esta cotización
            </p>
            <ZenButton
              variant="outline"
              size="sm"
              onClick={handleManagerOpen}
              className="gap-2 shrink-0"
            >
              <Settings className="w-4 h-4" />
              Gestionar
            </ZenButton>
          </div>

          {/* Lista de Condiciones */}
          {localCondiciones.length === 0 ? (
            <div className="text-center py-8 text-sm text-zinc-400">
              No hay condiciones comerciales disponibles
            </div>
          ) : (
            <div className="space-y-2">
              {localCondiciones.map((cc) => (
                <CondicionRadioCard
                  key={cc.id}
                  id={cc.id}
                  name={cc.name}
                  description={cc.description || null}
                  discount_percentage={cc.discount_percentage || null}
                  advance_percentage={cc.advance_percentage || null}
                  type={cc.type || null}
                  selected={tempSelectedId === cc.id}
                  onChange={setTempSelectedId}
                />
              ))}
            </div>
          )}
        </div>
      </ZenDialog>

      {/* Modal Manager */}
      <CondicionesComercialesManager
        studioSlug={studioSlug}
        isOpen={showManager}
        onClose={handleManagerClose}
        onRefresh={handleRefresh}
        onSelect={(condicionId) => {
          // Seleccionar la condición y cerrar el manager
          setTempSelectedId(condicionId);
          setShowManager(false);
          toast.success('Condición seleccionada');
        }}
      />
    </>
  );
}
