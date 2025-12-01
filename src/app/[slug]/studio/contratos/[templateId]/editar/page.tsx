'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, Loader2 } from 'lucide-react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenButton,
  ZenInput,
  ZenLabel,
  ZenSwitch,
  ContractEditor,
  ContractVariables,
  ContractPreview,
} from '@/components/ui/zen';
import {
  getContractTemplate,
  updateContractTemplate,
} from '@/lib/actions/studio/business/contracts';
import type { ContractTemplate } from '@/types/contracts';
import { toast } from 'sonner';

export default function EditarContratoPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const templateId = params.templateId as string;

  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    is_active: true,
    is_default: false,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const result = await getContractTemplate(studioSlug, templateId);
      if (result.success && result.data) {
        setTemplate(result.data);
        setFormData({
          name: result.data.name,
          description: result.data.description || '',
          content: result.data.content,
          is_active: result.data.is_active,
          is_default: result.data.is_default,
        });
      } else {
        toast.error(result.error || 'Plantilla no encontrada');
        router.push(`/${studioSlug}/studio/contratos`);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Error al cargar plantilla');
      router.push(`/${studioSlug}/studio/contratos`);
    } finally {
      setLoading(false);
    }
  };

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
      const result = await updateContractTemplate(studioSlug, templateId, formData);

      if (result.success) {
        toast.success('Plantilla actualizada correctamente');
        router.push(`/${studioSlug}/studio/contratos`);
      } else {
        toast.error(result.error || 'Error al actualizar plantilla');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Error al actualizar plantilla');
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

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <ZenCardHeader className="border-b border-zinc-800">
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
                <ZenCardTitle>Editar Plantilla</ZenCardTitle>
                <ZenCardDescription>Cargando plantilla...</ZenCardDescription>
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

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
                <ZenCardTitle>Editar Plantilla: {template?.name}</ZenCardTitle>
                <ZenCardDescription>
                  Versión {template?.version}
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
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
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

            {/* Configuración */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <div>
                  <p className="font-medium text-zinc-200">Plantilla activa</p>
                  <p className="text-sm text-zinc-500">
                    Disponible para generar contratos
                  </p>
                </div>
                <ZenSwitch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>
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
