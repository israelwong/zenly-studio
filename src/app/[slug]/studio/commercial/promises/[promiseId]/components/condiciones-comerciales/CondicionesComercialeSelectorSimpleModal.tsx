'use client';

import React, { useState, useEffect } from 'react';
import { ZenDialog, ZenButton } from '@/components/ui/zen';
import { CondicionRadioCard } from './CondicionRadioCard';
import { CondicionesComercialesManager } from '@/components/shared/condiciones-comerciales/CondicionesComercialesManager';
import { Settings, Loader2 } from 'lucide-react';
import { obtenerTodasCondicionesComerciales } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { actualizarCondicionesCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import { toast } from 'sonner';

interface CondicionComercial {
  id: string;
  name: string;
  description?: string | null;
  advance_percentage?: number | null;
  discount_percentage?: number | null;
  type?: string | null;
}

interface CondicionesComercialeSelectorSimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  cotizacionId: string;
  selectedId?: string | null;
  onSuccess?: () => void;
}

export function CondicionesComercialeSelectorSimpleModal({
  isOpen,
  onClose,
  studioSlug,
  cotizacionId,
  selectedId,
  onSuccess,
}: CondicionesComercialeSelectorSimpleModalProps) {
  const [tempSelectedId, setTempSelectedId] = useState(selectedId || '');
  const [showManager, setShowManager] = useState(false);
  const [condiciones, setCondiciones] = useState<CondicionComercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [condicionesIdsBeforeManager, setCondicionesIdsBeforeManager] = useState<Set<string>>(new Set());

  // Cargar condiciones al abrir
  useEffect(() => {
    if (isOpen) {
      loadCondiciones();
      setTempSelectedId(selectedId || '');
    }
  }, [isOpen, selectedId]);

  const loadCondiciones = async () => {
    setLoading(true);
    try {
      const result = await obtenerTodasCondicionesComerciales(studioSlug);
      if (result.success && result.data) {
        setCondiciones(result.data);
      } else {
        toast.error('Error al cargar condiciones comerciales');
      }
    } catch (error) {
      console.error('Error loading condiciones:', error);
      toast.error('Error al cargar condiciones comerciales');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!tempSelectedId) {
      toast.error('Selecciona una condición comercial');
      return;
    }

    setSaving(true);
    try {
      const result = await actualizarCondicionesCierre(
        studioSlug,
        cotizacionId,
        tempSelectedId
      );

      if (result.success) {
        const condicionNombre = condiciones.find(c => c.id === tempSelectedId)?.name;
        toast.success(`Condiciones comerciales definidas: ${condicionNombre}`);
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error || 'Error al guardar condiciones comerciales');
      }
    } catch (error) {
      console.error('Error saving condiciones:', error);
      toast.error('Error al guardar condiciones comerciales');
    } finally {
      setSaving(false);
    }
  };

  const handleManagerOpen = () => {
    setCondicionesIdsBeforeManager(new Set(condiciones.map(c => c.id)));
    setShowManager(true);
  };

  const handleManagerClose = async () => {
    setShowManager(false);
    
    // Recargar condiciones
    const result = await obtenerTodasCondicionesComerciales(studioSlug);
    if (result.success && result.data) {
      // Encontrar la condición nueva
      const nuevaCondicion = result.data.find(c => !condicionesIdsBeforeManager.has(c.id));
      
      setCondiciones(result.data);
      
      // Si se creó una nueva, seleccionarla automáticamente
      if (nuevaCondicion) {
        setTempSelectedId(nuevaCondicion.id);
        toast.success(`Condición "${nuevaCondicion.name}" seleccionada`);
      }
    }
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={onClose}
        title="Definir Condiciones Comerciales"
        description="Selecciona las condiciones comerciales para esta cotización."
        maxWidth="md"
        onSave={handleConfirm}
        onCancel={onClose}
        saveLabel={saving ? 'Guardando...' : 'Guardar'}
        cancelLabel="Cancelar"
        isLoading={saving}
        zIndex={10080}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mensaje informativo con link a gestión */}
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
              <p className="text-sm text-zinc-300 mb-1">
                ¿Necesitas crear o editar tus condiciones comerciales?
              </p>
              <button
                onClick={handleManagerOpen}
                className="text-sm text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                Gestionar tus condiciones comerciales
              </button>
            </div>

            {/* Lista de Condiciones */}
            {condiciones.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-400 mb-4">
                  No hay condiciones comerciales disponibles
                </p>
                <ZenButton
                  variant="primary"
                  size="sm"
                  onClick={handleManagerOpen}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Crear Primera Condición
                </ZenButton>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {condiciones.map((cc) => (
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
        )}
      </ZenDialog>

      {/* Modal Manager - z-index mayor para estar por encima del modal padre */}
      {showManager && (
        <CondicionesComercialesManager
          studioSlug={studioSlug}
          isOpen={showManager}
          onClose={handleManagerClose}
          onRefresh={loadCondiciones}
          onSelect={(condicionId) => {
            setTempSelectedId(condicionId);
            setShowManager(false);
            toast.success('Condición seleccionada');
          }}
        />
      )}
    </>
  );
}

