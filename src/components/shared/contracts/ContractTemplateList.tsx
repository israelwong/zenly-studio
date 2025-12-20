'use client';

import React from 'react';
import { FileText, Check } from 'lucide-react';
import { ZenBadge, ZenButton } from '@/components/ui/zen';
import type { ContractTemplate } from '@/types/contracts';

interface ContractTemplateListProps {
  templates: ContractTemplate[];
  selectedTemplateId?: string | null;
  onSelect?: (templateId: string) => void;
  showActions?: boolean;
  onEdit?: (templateId: string) => void;
  onDuplicate?: (templateId: string) => void;
  onToggle?: (templateId: string) => void;
  onDelete?: (templateId: string) => void;
}

export function ContractTemplateList({
  templates,
  selectedTemplateId,
  onSelect,
  showActions = false,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
}: ContractTemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-400 mb-2">No hay plantillas disponibles</p>
        <p className="text-sm text-zinc-500">
          Crea tu primera plantilla para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <div
          key={template.id}
          className={`
            w-full p-4 rounded-lg border transition-all
            ${selectedTemplateId === template.id
              ? 'border-emerald-500 bg-emerald-950/20'
              : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900'
            }
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-zinc-400" />
                <h3 className="font-medium text-zinc-300">{template.name}</h3>
                {template.is_default && (
                  <ZenBadge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
                    Por defecto
                  </ZenBadge>
                )}
                {!template.is_active && (
                  <ZenBadge variant="outline" className="text-xs text-zinc-500 border-zinc-600">
                    Inactiva
                  </ZenBadge>
                )}
              </div>
              {template.description && (
                <p className="text-sm text-zinc-500 mt-1">{template.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onSelect && (
                <button
                  onClick={() => onSelect(template.id)}
                  className={`
                    p-2 rounded transition-colors
                    ${selectedTemplateId === template.id
                      ? 'text-emerald-400'
                      : 'text-zinc-400 hover:text-zinc-300'
                    }
                  `}
                >
                  <Check className="h-5 w-5" />
                </button>
              )}
              {showActions && (
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <ZenButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(template.id)}
                      className="h-8 px-2"
                    >
                      Editar
                    </ZenButton>
                  )}
                  {onToggle && (
                    <ZenButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggle(template.id)}
                      className="h-8 px-2"
                    >
                      {template.is_active ? 'Desactivar' : 'Activar'}
                    </ZenButton>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
