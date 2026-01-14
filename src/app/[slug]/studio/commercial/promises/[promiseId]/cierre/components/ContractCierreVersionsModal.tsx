'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Clock, GitBranch, Loader2, Eye, ArrowLeft } from 'lucide-react';
import {
  ZenDialog,
  ZenButton,
  ZenBadge,
  ZenCard,
  ZenCardContent,
} from '@/components/ui/zen';
import { obtenerVersionesContratoCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import { formatDate } from '@/lib/actions/utils/formatting';
import { ContractPreview } from '@/components/shared/contracts/ContractPreview';
import { toast } from 'sonner';

interface ContractCierreVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  cotizacionId: string;
  promiseId: string;
  promiseData?: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    event_date: Date | null;
    event_name: string | null;
    event_type_name: string | null;
  };
}

interface ContractVersion {
  id: string;
  version: number;
  content: string;
  change_reason: string | null;
  change_type: string;
  created_at: Date;
}

const getChangeTypeLabel = (type: string): string => {
  switch (type) {
    case 'MANUAL_EDIT':
      return 'Edición manual';
    case 'AUTO_REGENERATE':
      return 'Regeneración automática';
    case 'TEMPLATE_UPDATE':
      return 'Actualización de plantilla';
    case 'TEMPLATE_REASSIGNED':
      return 'Plantilla reasignada';
    case 'TEMPLATE_CHANGED':
      return 'Plantilla cambiada';
    case 'DATA_UPDATE':
      return 'Actualización de datos';
    default:
      return type;
  }
};

const getChangeTypeColor = (type: string): string => {
  switch (type) {
    case 'MANUAL_EDIT':
      return 'text-blue-400 border-blue-500/30 bg-blue-950/20';
    case 'AUTO_REGENERATE':
      return 'text-purple-400 border-purple-500/30 bg-purple-950/20';
    case 'TEMPLATE_UPDATE':
    case 'TEMPLATE_REASSIGNED':
    case 'TEMPLATE_CHANGED':
      return 'text-amber-400 border-amber-500/30 bg-amber-950/20';
    case 'DATA_UPDATE':
      return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
    default:
      return 'text-zinc-400 border-zinc-500/30 bg-zinc-950/20';
  }
};

export function ContractCierreVersionsModal({
  isOpen,
  onClose,
  studioSlug,
  cotizacionId,
  promiseId,
  promiseData,
}: ContractCierreVersionsModalProps) {
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ContractVersion | null>(null);
  const [viewingContent, setViewingContent] = useState(false);
  const [eventData, setEventData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && cotizacionId) {
      loadVersions();
      if (promiseData) {
        loadEventData();
      }
    } else {
      setVersions([]);
      setSelectedVersion(null);
      setViewingContent(false);
      setEventData(null);
    }
  }, [isOpen, cotizacionId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const result = await obtenerVersionesContratoCierre(studioSlug, cotizacionId);
      if (result.success && result.data) {
        setVersions(result.data);
      } else {
        toast.error(result.error || 'Error al cargar versiones');
      }
    } catch (error) {
      console.error('Error loading versions:', error);
      toast.error('Error al cargar versiones');
    } finally {
      setLoading(false);
    }
  };

  const loadEventData = async () => {
    try {
      const { getPromiseContractData } = await import('@/lib/actions/studio/business/contracts/renderer.actions');
      const result = await getPromiseContractData(
        studioSlug,
        promiseId,
        cotizacionId,
        undefined
      );
      if (result.success && result.data) {
        setEventData(result.data);
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    }
  };

  const handleViewVersion = (version: ContractVersion) => {
    setSelectedVersion(version);
    setViewingContent(true);
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen && !viewingContent}
        onClose={onClose}
        title="Historial de Versiones del Contrato"
        description="Revisa todas las versiones del contrato y sus cambios"
        maxWidth="4xl"
        onCancel={onClose}
        cancelLabel="Cerrar"
      >
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No hay versiones registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <ZenCard key={version.id}>
                  <ZenCardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <GitBranch className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span className="text-sm font-semibold text-white">
                            Versión {version.version}
                          </span>
                          <ZenBadge
                            variant="outline"
                            className={`text-xs ${getChangeTypeColor(version.change_type)}`}
                          >
                            {getChangeTypeLabel(version.change_type)}
                          </ZenBadge>
                        </div>
                        {version.change_reason && (
                          <p className="text-xs text-zinc-400 mb-2">
                            {version.change_reason}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(version.created_at)}</span>
                        </div>
                      </div>
                      <ZenButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewVersion(version)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver
                      </ZenButton>
                    </div>
                  </ZenCardContent>
                </ZenCard>
              ))}
            </div>
          )}
        </div>
      </ZenDialog>

      {/* Modal de vista de versión específica */}
      {selectedVersion && (
        <ZenDialog
          isOpen={viewingContent}
          onClose={() => {
            setViewingContent(false);
            setSelectedVersion(null);
          }}
          title={`Versión ${selectedVersion.version} del Contrato`}
          description={selectedVersion.change_reason || 'Vista previa de la versión'}
          maxWidth="4xl"
          footerLeftContent={
            <ZenButton
              variant="outline"
              size="sm"
              onClick={() => {
                setViewingContent(false);
                setSelectedVersion(null);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </ZenButton>
          }
        >
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-lg p-6 max-h-[70vh] overflow-y-auto">
              <ContractPreview
                content={selectedVersion.content}
                eventData={eventData}
                cotizacionData={eventData?.cotizacionData}
                condicionesData={eventData?.condicionesData}
                showVariables={false}
              />
            </div>
            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="w-3 h-3" />
                <span>Creada el {formatDate(selectedVersion.created_at)}</span>
              </div>
            </div>
          </div>
        </ZenDialog>
      )}
    </>
  );
}

