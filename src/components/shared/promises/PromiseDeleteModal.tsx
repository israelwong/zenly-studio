'use client';

import React, { useEffect, useState } from 'react';
import { ZenConfirmModal } from '@/components/ui/zen';
import { getPromiseDeletionInfo } from '@/lib/actions/studio/commercial/promises';

interface PromiseDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  studioSlug: string;
  promiseId: string;
  promiseName?: string;
  isDeleting?: boolean;
}

export function PromiseDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  studioSlug,
  promiseId,
  promiseName,
  isDeleting = false,
}: PromiseDeleteModalProps) {
  const [deletionInfo, setDeletionInfo] = useState<{
    hasEvent: boolean;
    cotizacionesCount: number;
    agendamientosCount: number;
  } | null>(null);
  const [loadingDeletionInfo, setLoadingDeletionInfo] = useState(false);

  // Cargar información de eliminación cuando se abre el modal
  useEffect(() => {
    const loadDeletionInfo = async () => {
      if (!isOpen || !promiseId || !studioSlug) {
        setDeletionInfo(null);
        return;
      }

      setLoadingDeletionInfo(true);
      try {
        const result = await getPromiseDeletionInfo(studioSlug, promiseId);
        if (result.success && result.data) {
          setDeletionInfo(result.data);
        } else {
          setDeletionInfo(null);
        }
      } catch (error) {
        console.error('Error obteniendo información de eliminación:', error);
        setDeletionInfo(null);
      } finally {
        setLoadingDeletionInfo(false);
      }
    };

    loadDeletionInfo();
  }, [isOpen, promiseId, studioSlug]);

  const handleClose = () => {
    if (!isDeleting) {
      setDeletionInfo(null);
      onClose();
    }
  };

  const description = loadingDeletionInfo ? (
    <div className="text-sm text-zinc-400">Cargando información...</div>
  ) : deletionInfo ? (
    <div className="space-y-2">
      <p className="text-sm text-zinc-300">
        {promiseName
          ? `¿Estás seguro de que deseas eliminar la promesa de "${promiseName}"? Esta acción no se puede deshacer y eliminará:`
          : '¿Estás seguro de que deseas eliminar esta promesa? Esta acción no se puede deshacer y eliminará:'}
      </p>
      <ul className="list-disc list-inside space-y-1 text-sm text-zinc-400 ml-2">
        <li>La promesa y todos sus datos</li>
        {deletionInfo.hasEvent && (
          <li>El evento asociado y todos sus datos</li>
        )}
        {deletionInfo.cotizacionesCount > 0 && (
          <li>
            {deletionInfo.cotizacionesCount} cotización
            {deletionInfo.cotizacionesCount > 1 ? 'es' : ''}
          </li>
        )}
        {deletionInfo.agendamientosCount > 0 && (
          <li>
            {deletionInfo.agendamientosCount} agendamiento
            {deletionInfo.agendamientosCount > 1 ? 's' : ''}
          </li>
        )}
      </ul>
    </div>
  ) : (
    promiseName
      ? `¿Estás seguro de que deseas eliminar la promesa de "${promiseName}"? Esta acción no se puede deshacer y eliminará todos los datos asociados.`
      : '¿Estás seguro de que deseas eliminar esta promesa? Esta acción no se puede deshacer y eliminará todos los datos asociados.'
  );

  return (
    <ZenConfirmModal
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={onConfirm}
      title="Eliminar promesa"
      description={description}
      confirmText={isDeleting ? 'Eliminando...' : 'Eliminar'}
      cancelText="Cancelar"
      variant="destructive"
      disabled={isDeleting || loadingDeletionInfo}
    />
  );
}
