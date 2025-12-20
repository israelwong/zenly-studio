'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenButton,
  ZenInput,
  ZenLabel,
  ZenTextarea,
  ZenSwitch,
  ContractEditor,
  ContractVariables,
  ContractPreview,
} from '@/components/ui/zen';
import { createContractTemplate } from '@/lib/actions/studio/business/contracts';
import { toast } from 'sonner';
import { DEFAULT_CONTRACT_TEMPLATE } from './default-template';

export default function NuevoContratoPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: DEFAULT_CONTRACT_TEMPLATE,
    is_default: false,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    if (!formData.content.trim()) {
      toast.error('El contenido es requerido');
      return;
    }

    setIsSaving(true);
    try {
      const result = await createContractTemplate(studioSlug, formData);

      if (result.success) {
        toast.success('Plantilla creada correctamente');
        router.push(`/${studioSlug}/studio/contratos`);
      } else {
        toast.error(result.error || 'Error al crear plantilla');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Error al crear plantilla');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVariableClick = (variable: string) => {
    // Insertar variable al final del contenido
    setFormData((prev) => ({
      ...prev,
      content: prev.content + ' ' + variable,
    }));
    toast.success('Variable insertada');
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${studioSlug}/studio/contratos`)}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </ZenButton>
              <div>
                <ZenCardTitle>Nueva Plantilla de Contrato</ZenCardTitle>
                <ZenCardDescription>
                  Crea una plantilla maestra para generar contratos
                </ZenCardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ZenButton
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Ocultar' : 'Vista Previa'}
              </ZenButton>
              <ZenButton
                variant="default"
                size="sm"
                onClick={handleSubmit}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Guardando...' : 'Guardar Plantilla'}
              </ZenButton>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <ZenLabel htmlFor="name">Nombre de la Plantilla *</ZenLabel>
                <ZenInput
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ej: Contrato General"
                  required
                />
              </div>
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
            </div>

            {/* Plantilla por defecto */}
            <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
              <div>
                <p className="font-medium text-zinc-200">Plantilla por defecto</p>
                <p className="text-sm text-zinc-500">
                  Se usará automáticamente si no se especifica otra
                </p>
              </div>
              <ZenSwitch
                checked={formData.is_default}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_default: checked }))
                }
              />
            </div>

            {/* Editor y Variables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <ZenLabel>Contenido del Contrato *</ZenLabel>
                {showPreview ? (
                  <ContractPreview content={formData.content} showVariables />
                ) : (
                  <ContractEditor
                    content={formData.content}
                    onChange={(content) =>
                      setFormData((prev) => ({ ...prev, content }))
                    }
                  />
                )}
              </div>
              <div>
                <ZenLabel className="mb-4 block">Variables Disponibles</ZenLabel>
                <ContractVariables onVariableClick={handleVariableClick} />
              </div>
            </div>
          </form>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
