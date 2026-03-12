'use client';

import React from 'react';
import { ZenDialog } from '@/components/ui/zen';
import { AnnexDocumentView, type AnnexDocumentViewProps } from './AnnexDocumentView';

export interface AnnexPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Título del modal (ej. "Vista previa del anexo") */
  title?: string;
  /** Datos para renderizar el documento anexo */
  annexData: AnnexDocumentViewProps | null;
  /** Si true, muestra skeleton mientras annexData es null */
  loading?: boolean;
}

export function AnnexPreviewModal({
  isOpen,
  onClose,
  title = 'Vista previa del Anexo',
  annexData,
  loading = false,
}: AnnexPreviewModalProps) {
  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="4xl"
      onCancel={onClose}
      cancelLabel="Cerrar"
    >
      <div className="max-h-[80vh] overflow-y-auto p-1 -m-1">
        {loading || !annexData ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-16 bg-zinc-800 rounded-lg" />
            <div className="h-40 bg-zinc-800 rounded-lg" />
            <div className="h-32 bg-zinc-800 rounded-lg" />
          </div>
        ) : (
          <AnnexDocumentView
            masterContractId={annexData.masterContractId}
            masterContractDate={annexData.masterContractDate}
            cotizacionData={annexData.cotizacionData}
            condicionesData={annexData.condicionesData}
            deliveryPolicy={annexData.deliveryPolicy}
          />
        )}
      </div>
    </ZenDialog>
  );
}
