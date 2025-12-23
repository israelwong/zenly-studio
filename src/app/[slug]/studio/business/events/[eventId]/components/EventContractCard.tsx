'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Eye, Edit, Loader2, CheckCircle2, Clock } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenBadge,
} from '@/components/ui/zen';
import type { EventContract } from '@/types/contracts';
import { toast } from 'sonner';
import { formatDate } from '@/lib/actions/utils/formatting';
import { ContractTemplateSelectorModal } from './ContractTemplateSelectorModal';
import { ContractEditorModal } from '@/components/shared/contracts/ContractEditorModal';
import { getContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
import { getEventContract, generateEventContract, updateEventContract } from '@/lib/actions/studio/business/contracts/contracts.actions';

interface EventContractCardProps {
  studioSlug: string;
  eventId: string;
  eventTypeId?: string;
  onContractUpdated?: () => void;
}

export function EventContractCard({
  studioSlug,
  eventId,
  eventTypeId,
  onContractUpdated,
}: EventContractCardProps) {
  const router = useRouter();
  const [contract, setContract] = useState<EventContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [selectedTemplateContent, setSelectedTemplateContent] = useState<string>('');

  useEffect(() => {
    loadContract();
  }, [eventId, studioSlug]);

  const loadContract = async () => {
    setLoading(true);
    try {
      const result = await getEventContract(studioSlug, eventId);
      if (result.success && result.data) {
        setContract(result.data);
      } else {
        setContract(null);
      }
    } catch (error) {
      console.error('Error loading contract:', error);
      setContract(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClick = () => {
    setShowTemplateModal(true);
  };

  const handleTemplateSelect = async (templateId: string) => {
    setShowTemplateModal(false);

    try {
      // Obtener contenido de la plantilla
      const templateResult = await getContractTemplate(studioSlug, templateId);

      if (templateResult.success && templateResult.data) {
        setSelectedTemplateContent(templateResult.data.content);
        setShowEditorModal(true);
      } else {
        toast.error(templateResult.error || 'Error al cargar plantilla');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Error al cargar plantilla');
    }
  };

  const handleGenerateContract = async (data: {
    content: string;
    name?: string;
    description?: string;
    is_default?: boolean;
  }) => {
    setIsGenerating(true);
    try {
      // Generar contrato
      const result = await generateEventContract(studioSlug, {
        event_id: eventId,
      });

      if (result.success && result.data) {
        // Actualizar el contenido del contrato generado con el editado
        const updateResult = await updateEventContract(studioSlug, result.data.id, {
          content: data.content,
        });

        if (updateResult.success) {
          toast.success('Contrato generado correctamente');
          setShowEditorModal(false);
          setSelectedTemplateContent('');
          await loadContract();
          onContractUpdated?.();
        } else {
          toast.error(updateResult.error || 'Error al actualizar contrato');
        }
      } else {
        toast.error(result.error || 'Error al generar contrato');
      }
    } catch (error) {
      console.error('Error generating contract:', error);
      toast.error('Error al generar contrato');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewContract = () => {
    router.push(`/${studioSlug}/studio/business/events/${eventId}/contrato`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <ZenBadge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-950/20">
            <Clock className="h-3 w-3 mr-1" />
            Borrador
          </ZenBadge>
        );
      case 'published':
        return (
          <ZenBadge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-950/20">
            <Eye className="h-3 w-3 mr-1" />
            Publicado
          </ZenBadge>
        );
      case 'signed':
        return (
          <ZenBadge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-950/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Firmado
          </ZenBadge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <div className="flex items-center justify-between animate-pulse">
            <div className="h-4 w-16 bg-zinc-800 rounded" />
            <div className="h-6 w-16 bg-zinc-800 rounded" />
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          <div className="h-20 w-full bg-zinc-800 rounded animate-pulse" />
        </ZenCardContent>
      </ZenCard>
    );
  }

  return (
    <ZenCard>
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            Contrato
          </ZenCardTitle>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={contract ? handleViewContract : handleGenerateClick}
            disabled={isGenerating}
            className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
          >
            <Plus className="h-3 w-3 mr-1" />
            Anexar
          </ZenButton>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        {contract ? (
          <div className="space-y-4">
            {/* Estado del contrato */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Estado</span>
              {getStatusBadge(contract.status)}
            </div>

            {/* Versión */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Versión</span>
              <span className="text-xs text-zinc-300 font-medium">v{contract.version}</span>
            </div>

            {/* Fecha de creación */}
            {contract.created_at && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Creado</span>
                <span className="text-xs text-zinc-300">{formatDate(contract.created_at)}</span>
              </div>
            )}

            {/* Fecha de firma */}
            {contract.signed_at && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Firmado</span>
                <span className="text-xs text-zinc-300">{formatDate(contract.signed_at)}</span>
              </div>
            )}

            {/* Botones de acción */}
            <div className="pt-2 space-y-2">
              <ZenButton
                variant="default"
                size="sm"
                onClick={handleViewContract}
                className="w-full"
              >
                <Eye className="h-3.5 w-3.5 mr-2" />
                Ver contrato
              </ZenButton>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-zinc-500">
              No hay contrato generado para este evento
            </p>
          </div>
        )}
      </ZenCardContent>

      <ContractTemplateSelectorModal
        isOpen={showTemplateModal}
        onClose={async () => {
          setShowTemplateModal(false);
          await loadContract();
          onContractUpdated?.();
        }}
        onSelect={handleTemplateSelect}
        studioSlug={studioSlug}
        eventId={eventId}
        eventTypeId={eventTypeId}
        isLoading={false}
      />

      <ContractEditorModal
        isOpen={showEditorModal}
        onClose={() => {
          setShowEditorModal(false);
          setSelectedTemplateContent('');
        }}
        mode="create-event-contract"
        studioSlug={studioSlug}
        eventId={eventId}
        templateContent={selectedTemplateContent}
        onSave={handleGenerateContract}
        isLoading={isGenerating}
      />
    </ZenCard>
  );
}
