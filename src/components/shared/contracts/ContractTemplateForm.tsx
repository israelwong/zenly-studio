'use client';

import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ZenInput,
  ZenLabel,
  ZenTextarea,
  ZenSwitch,
  ZenButton,
  ContractEditor,
  ContractVariables,
  ContractPreview,
} from '@/components/ui/zen';
import type { ContractTemplate, CreateTemplateInput } from '@/types/contracts';
import { DEFAULT_CONTRACT_TEMPLATE } from '@/app/[slug]/studio/contratos/nuevo/default-template';
import { toast } from 'sonner';

interface ContractTemplateFormProps {
  mode: 'modal' | 'page';
  initialData?: Partial<ContractTemplate>;
  onSave: (data: CreateTemplateInput) => Promise<void>;
  onCancel: () => void;
  onManageComplete?: () => void;
  simplified?: boolean;
  isLoading?: boolean;
}

export function ContractTemplateForm({
  mode,
  initialData,
  onSave,
  onCancel,
  onManageComplete,
  simplified = false,
  isLoading = false,
}: ContractTemplateFormProps) {
  const [formData, setFormData] = useState<CreateTemplateInput>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    content: initialData?.content || DEFAULT_CONTRACT_TEMPLATE,
    is_default: initialData?.is_default ?? false,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        content: initialData.content || DEFAULT_CONTRACT_TEMPLATE,
        is_default: initialData.is_default ?? false,
      });
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'El contenido es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSave(formData);
  };

  const handleVariableClick = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      content: prev.content + ' ' + variable,
    }));
    toast.success('Variable insertada');
  };

  const isModalMode = mode === 'modal';
  const isSimplified = simplified || isModalMode;

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', isModalMode && 'h-full flex flex-col')}>
      {/* Información básica */}
      <div className={isSimplified ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
        <div className="space-y-2">
          <ZenLabel htmlFor="name">
            Nombre de la Plantilla *
            {errors.name && <span className="text-red-400 text-xs ml-2">{errors.name}</span>}
          </ZenLabel>
          <ZenInput
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Ej: Contrato General"
            required
            error={errors.name}
          />
        </div>
        {!isSimplified && (
          <div className="space-y-2">
            <ZenLabel htmlFor="description">Descripción</ZenLabel>
            <ZenInput
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Descripción breve de la plantilla"
            />
          </div>
        )}
      </div>

      {/* Plantilla por defecto - Solo en modo página o si no es simplificado */}
      {!isSimplified && (
        <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <div>
            <p className="font-medium text-zinc-200">Plantilla por defecto</p>
            <p className="text-sm text-zinc-500">
              Se usará automáticamente si no se especifica otra
            </p>
          </div>
          <ZenSwitch
            checked={formData.is_default ?? false}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, is_default: checked }))
            }
          />
        </div>
      )}

      {/* Editor y Variables */}
      <div className={cn(
        isSimplified ? 'space-y-4 flex-1 flex flex-col min-h-0' : 'grid grid-cols-1 lg:grid-cols-3 gap-6',
        isModalMode && 'flex-1 flex flex-col min-h-0'
      )}>
        <div className={cn(
          isSimplified ? 'flex-1 flex flex-col min-h-0' : 'lg:col-span-2 space-y-4',
          isModalMode && 'flex-1 flex flex-col min-h-0'
        )}>
          <div className="flex items-center justify-between shrink-0 mb-2">
            <ZenLabel>
              Contenido del Contrato *
              {errors.content && (
                <span className="text-red-400 text-xs ml-2">{errors.content}</span>
              )}
            </ZenLabel>
            {!isModalMode && (
              <ZenButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Ocultar' : 'Vista Previa'}
              </ZenButton>
            )}
          </div>
          {showPreview && !isModalMode ? (
            <ContractPreview content={formData.content} showVariables />
          ) : (
            <div className={cn('flex-1 flex flex-col min-h-0', !isModalMode && 'min-h-[1000px]')}>
              <ContractEditor
                content={formData.content}
                onChange={(content) =>
                  setFormData((prev) => ({ ...prev, content }))
                }
                className={isModalMode ? 'h-full' : ''}
              />
            </div>
          )}
        </div>
        {!isSimplified && (
          <div>
            <ZenLabel className="mb-4 block">Variables Disponibles</ZenLabel>
            <ContractVariables onVariableClick={handleVariableClick} />
          </div>
        )}
      </div>

      {/* Botones de acción */}
      {isModalMode && (
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          {onManageComplete && (
            <ZenButton
              type="button"
              variant="ghost"
              onClick={onManageComplete}
              disabled={isLoading}
            >
              Gestionar Completo
            </ZenButton>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <ZenButton
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </ZenButton>
            <ZenButton
              type="submit"
              variant="primary"
              disabled={isLoading}
              loading={isLoading}
            >
              {initialData?.id ? 'Actualizar' : 'Crear Plantilla'}
            </ZenButton>
          </div>
        </div>
      )}
    </form>
  );
}
