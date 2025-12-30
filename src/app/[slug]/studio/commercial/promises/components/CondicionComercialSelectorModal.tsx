'use client';

import React from 'react';
import { ZenDialog } from '@/components/ui/zen';
import { CondicionRadioCard } from './CondicionRadioCard';

interface CondicionComercial {
  id: string;
  name: string;
  description?: string | null;
  advance_percentage?: number | null;
  discount_percentage?: number | null;
}

interface CondicionComercialSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  condiciones: CondicionComercial[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function CondicionComercialSelectorModal({
  isOpen,
  onClose,
  condiciones,
  selectedId,
  onSelect,
}: CondicionComercialSelectorModalProps) {
  const [tempSelectedId, setTempSelectedId] = React.useState(selectedId);

  React.useEffect(() => {
    if (isOpen) {
      setTempSelectedId(selectedId);
    }
  }, [isOpen, selectedId]);

  const handleConfirm = () => {
    onSelect(tempSelectedId);
    onClose();
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Seleccionar Condiciones Comerciales"
      description="Elige las condiciones comerciales para esta cotización"
      maxWidth="md"
      onSave={handleConfirm}
      onCancel={onClose}
      saveLabel="Confirmar"
      cancelLabel="Cancelar"
      zIndex={10070}
    >
      {condiciones.length === 0 ? (
        <div className="text-center py-8 text-sm text-zinc-400">
          No hay condiciones comerciales disponibles
        </div>
      ) : (
        <div className="space-y-2">
          {condiciones.map((cc) => (
            <CondicionRadioCard
              key={cc.id}
              id={cc.id}
              name={cc.name}
              description={cc.description || null}
              discount_percentage={cc.discount_percentage || null}
              advance_percentage={cc.advance_percentage || null}
              selected={tempSelectedId === cc.id}
              onChange={setTempSelectedId}
            />
          ))}
        </div>
      )}
    </ZenDialog>
  );
}
