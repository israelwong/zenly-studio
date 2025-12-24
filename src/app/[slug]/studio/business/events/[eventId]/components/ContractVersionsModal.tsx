'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Clock, User, GitBranch, Loader2, Eye } from 'lucide-react';
import {
  ZenDialog,
  ZenButton,
  ZenBadge,
  ZenCard,
  ZenCardContent,
} from '@/components/ui/zen';
import { getContractVersions } from '@/lib/actions/studio/business/contracts/contracts.actions';
import { formatDate } from '@/lib/actions/utils/formatting';
import { CONTRACT_PREVIEW_STYLES } from '@/lib/utils/contract-styles';
import type { ContractVersion } from '@/types/contracts';
import { toast } from 'sonner';

interface ContractVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  contractId: string;
}

const getChangeTypeLabel = (type: string): string => {
  switch (type) {
    case 'MANUAL_EDIT':
      return 'Edición manual';
    case 'AUTO_REGENERATE':
      return 'Regeneración automática';
    case 'TEMPLATE_UPDATE':
      return 'Actualización de plantilla';
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
      return 'text-amber-400 border-amber-500/30 bg-amber-950/20';
    case 'DATA_UPDATE':
      return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
    default:
      return 'text-zinc-400 border-zinc-500/30 bg-zinc-950/20';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'DRAFT':
      return 'Borrador';
    case 'PUBLISHED':
      return 'Publicado';
    case 'SIGNED':
      return 'Firmado';
    case 'CANCELLATION_REQUESTED_BY_STUDIO':
      return 'Cancelación solicitada (Studio)';
    case 'CANCELLATION_REQUESTED_BY_CLIENT':
      return 'Cancelación solicitada (Cliente)';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return status;
  }
};

export function ContractVersionsModal({
  isOpen,
  onClose,
  studioSlug,
  contractId,
}: ContractVersionsModalProps) {
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ContractVersion | null>(null);
  const [viewingContent, setViewingContent] = useState(false);

  useEffect(() => {
    if (isOpen && contractId) {
      loadVersions();
    } else {
      setVersions([]);
      setSelectedVersion(null);
      setViewingContent(false);
    }
  }, [isOpen, contractId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const result = await getContractVersions(studioSlug, contractId);
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

  const handleViewVersion = (version: ContractVersion) => {
    setSelectedVersion(version);
    setViewingContent(true);
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen && !viewingContent}
        onClose={onClose}
        title="Historial de Versiones"
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
              {versions.map((version, index) => (
                <ZenCard key={version.id} className="border-zinc-800 hover:border-zinc-700 transition-colors">
                  <ZenCardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-zinc-400" />
                            <span className="text-lg font-semibold text-zinc-100">
                              Versión {version.version}
                            </span>
                            {index === 0 && (
                              <ZenBadge variant="outline" className="text-xs rounded-full">
                                Actual
                              </ZenBadge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <ZenBadge
                            variant="outline"
                            className={`text-xs rounded-full ${getChangeTypeColor(version.change_type)}`}
                          >
                            {getChangeTypeLabel(version.change_type)}
                          </ZenBadge>
                          <ZenBadge variant="outline" className="text-xs rounded-full text-zinc-400 border-zinc-700">
                            {getStatusLabel(version.status)}
                          </ZenBadge>
                        </div>

                        {version.change_reason && (
                          <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                            {version.change_reason}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatDate(version.created_at)}</span>
                          </div>
                          {version.created_by_user && (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              <span>{version.created_by_user.full_name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ZenButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewVersion(version)}
                          className="text-zinc-300 hover:text-zinc-100"
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          Ver contenido
                        </ZenButton>
                      </div>
                    </div>
                  </ZenCardContent>
                </ZenCard>
              ))}
            </div>
          )}
        </div>
      </ZenDialog>

      {/* Modal para ver contenido de versión */}
      <ZenDialog
        isOpen={viewingContent && selectedVersion !== null}
        onClose={() => {
          setViewingContent(false);
          setSelectedVersion(null);
        }}
        title={`Versión ${selectedVersion?.version} - ${selectedVersion ? getChangeTypeLabel(selectedVersion.change_type) : ''}`}
        description={selectedVersion?.change_reason || 'Contenido de la versión'}
        maxWidth="5xl"
        onCancel={() => {
          setViewingContent(false);
          setSelectedVersion(null);
        }}
        cancelLabel="Cerrar"
      >
        {selectedVersion && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm text-zinc-400">
                    {formatDate(selectedVersion.created_at)}
                  </span>
                </div>
                {selectedVersion.created_by_user && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm text-zinc-400">
                      {selectedVersion.created_by_user.full_name}
                    </span>
                  </div>
                )}
                <ZenBadge
                  variant="outline"
                  className={`text-xs rounded-full ${getChangeTypeColor(selectedVersion.change_type)}`}
                >
                  {getChangeTypeLabel(selectedVersion.change_type)}
                </ZenBadge>
                <ZenBadge variant="outline" className="text-xs rounded-full text-zinc-400 border-zinc-700">
                  {getStatusLabel(selectedVersion.status)}
                </ZenBadge>
              </div>
              {selectedVersion.change_reason && (
                <p className="text-sm text-zinc-300 mb-0">{selectedVersion.change_reason}</p>
              )}
            </div>

            <div className="p-4 bg-zinc-900/30 rounded-lg border border-zinc-800 max-h-[60vh] overflow-y-auto">
              <style dangerouslySetInnerHTML={{ __html: CONTRACT_PREVIEW_STYLES }} />
              <div
                className="contract-preview"
                dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
              />
            </div>
          </div>
        )}
      </ZenDialog>
    </>
  );
}

