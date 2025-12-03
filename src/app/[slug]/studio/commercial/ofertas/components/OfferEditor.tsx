"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Layout, MessageSquare, MoreVertical, Trash2, HardDrive } from "lucide-react";
import {
  ZenButton,
  ZenSwitch,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenConfirmModal
} from "@/components/ui/zen";
import { OfferEditorProvider, useOfferEditor } from "./OfferEditorContext";
import { BasicInfoTab } from "./tabs/BasicInfoTab";
import { LandingPageTab } from "./tabs/LandingPageTab";
import { LeadFormTab } from "./tabs/LeadFormTab";
import { createOffer, updateOffer, deleteOffer } from "@/lib/actions/studio/offers/offers.actions";
import type { CreateOfferData, UpdateOfferData } from "@/lib/actions/schemas/offer-schemas";
import { calculateTotalStorage, formatBytes } from "@/lib/utils/storage";
import { useStorageRefresh } from "@/hooks/useStorageRefresh";
import { toast } from "sonner";
import type { StudioOffer } from "@/types/offers";
import type { ContentBlock } from "@/types/content-blocks";

interface OfferEditorProps {
  studioSlug: string;
  mode: "create" | "edit";
  offer?: StudioOffer;
}

function OfferEditorContent({ studioSlug, mode, offer }: OfferEditorProps) {
  const router = useRouter();
  const { activeTab, setActiveTab, isSaving, setIsSaving, formData, contentBlocks, updateFormData, updateContentBlocks, getOfferData, savedOfferId, setSavedOfferId } = useOfferEditor();
  const { triggerRefresh } = useStorageRefresh(studioSlug);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [coverFileSize, setCoverFileSize] = useState<number | null>(null);
  const [currentMode, setCurrentMode] = useState<"create" | "edit">(mode);
  const [currentOffer, setCurrentOffer] = useState<StudioOffer | undefined>(offer);

  // Sincronizar currentOffer y currentMode cuando cambian los props
  useEffect(() => {
    if (offer) {
      setCurrentOffer(offer);
      setCurrentMode("edit");
    } else {
      setCurrentMode("create");
    }
  }, [offer]);

  // Obtener tamaño de la portada si existe
  useEffect(() => {
    if (formData.cover_media_url) {
      // Resetear el tamaño cuando cambia la URL para forzar la actualización
      setCoverFileSize(null);

      const fetchFileSize = async () => {
        try {
          const response = await fetch(formData.cover_media_url!, { method: 'HEAD' });
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            setCoverFileSize(parseInt(contentLength, 10));
          }
        } catch (err) {
          console.warn('No se pudo obtener el tamaño del archivo:', err);
        }
      };
      fetchFileSize();
    } else {
      setCoverFileSize(null);
    }
  }, [formData.cover_media_url]);

  // Calcular tamaño total de la oferta (portada + componentes de landing)
  const totalOfferSize = useMemo(() => {
    let total = 0;

    // Tamaño de la portada
    if (coverFileSize) {
      total += coverFileSize;
    }

    // Tamaño de los componentes de landing page
    const landingMedia = contentBlocks.flatMap(block => block.media || []);
    total += calculateTotalStorage(landingMedia);

    return total;
  }, [coverFileSize, contentBlocks]);

  // Verificar si hay contenido (portada o media) para mostrar el badge
  const hasContent = useMemo(() => {
    return !!(formData.cover_media_url || contentBlocks.some(block => (block.media || []).length > 0));
  }, [formData.cover_media_url, contentBlocks]);

  const tabs = [
    { id: "basic" as const, label: "Información", icon: FileText },
    { id: "landing" as const, label: "Landing Page", icon: Layout },
    { id: "leadform" as const, label: "Formulario", icon: MessageSquare },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const offerData = getOfferData();

      if (currentMode === "edit" && currentOffer && currentOffer.id) {
        // En modo edit, siempre debe tener id
        const updateData: UpdateOfferData = {
          ...offerData,
          id: currentOffer.id,
        };
        const result = await updateOffer(currentOffer.id, studioSlug, updateData);

        if (result.success && result.data) {
          toast.success("Oferta actualizada correctamente");
          // Actualizar storage global después de actualizar
          triggerRefresh();
          // Actualizar estado local con los datos actualizados sin recargar
          setCurrentOffer(result.data);
          // Actualizar contentBlocks en el contexto si están presentes
          if (result.data.landing_page?.content_blocks) {
            updateContentBlocks(result.data.landing_page.content_blocks as ContentBlock[]);
          }
        } else {
          toast.error(result.error || "Error al actualizar la oferta");
        }
      } else if (currentMode === "create") {
        // Crear nueva oferta
        const createData = offerData as CreateOfferData;
        const result = await createOffer(studioSlug, createData);

        if (result.success && result.data) {
          toast.success("Oferta creada correctamente");
          // Actualizar storage global después de crear
          triggerRefresh();
          // Actualizar savedOfferId en el contexto para habilitar pestañas
          setSavedOfferId(result.data.id);
          // Actualizar estado local sin recargar la página
          setCurrentOffer(result.data);
          setCurrentMode("edit");
          // Actualizar URL sin recargar la página completa
          window.history.pushState({}, '', `/${studioSlug}/studio/commercial/ofertas/${result.data.id}`);
        } else {
          toast.error(result.error || "Error al crear la oferta");
        }
      }
    } catch (error) {
      console.error("Error saving offer:", error);
      toast.error(currentMode === "create" ? "Error al crear la oferta" : "Error al actualizar la oferta");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentOffer?.id) return;

    const offerId = currentOffer.id;
    setIsDeleting(true);
    try {
      const result = await deleteOffer(offerId, studioSlug);

      if (result.success) {
        // Actualizar storage global después de eliminar
        triggerRefresh();

        toast.success("Oferta eliminada correctamente");
        router.push(`/${studioSlug}/studio/commercial/ofertas`);
      } else {
        toast.error(result.error || "Error al eliminar la oferta");
      }
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error("Error al eliminar la oferta");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ZenButton
            variant="ghost"
            onClick={() => {
              if (currentMode === "edit" || savedOfferId) {
                // Si está en modo edición o ya tiene oferta guardada, ir a la lista
                router.push(`/${studioSlug}/studio/commercial/ofertas`);
              } else {
                // Si está creando nueva oferta sin guardar, regresar
                router.back();
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </ZenButton>
          <h1 className="text-2xl font-bold text-zinc-100">
            {currentMode === "create" ? "Nueva Oferta" : "Editar Oferta"}
          </h1>
        </div>
        {/* Acciones del encabezado */}
        <div className="flex items-center gap-3">
          {/* Tamaño total de la oferta - Siempre visible */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <HardDrive className="h-3.5 w-3.5" />
            <span className="font-medium text-emerald-400">
              {totalOfferSize > 0
                ? formatBytes(totalOfferSize)
                : hasContent
                  ? "Calculando..."
                  : formatBytes(0)}
            </span>
          </div>
          {/* Línea divisoria - Solo si hay controles de edición después */}
          {currentMode === "edit" && (
            <div className="h-8 w-px bg-zinc-800 mx-2"></div>
          )}

          {/* Controles de edición - Solo en modo edición */}
          {currentMode === "edit" && (
            <>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-zinc-300">
                    {formData.is_active ? "Activa" : "Inactiva"}
                  </div>
                </div>
                <ZenSwitch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => updateFormData({ is_active: checked })}
                />
              </div>
              {/* Línea divisoria */}
              <div className="h-8 w-px bg-zinc-800 mx-2"></div>
              <ZenButton
                onClick={handleSave}
                loading={isSaving}
                disabled={isSaving}
              >
                Actualizar Oferta
              </ZenButton>
              <ZenDropdownMenu>
                <ZenDropdownMenuTrigger asChild>
                  <ZenButton variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </ZenButton>
                </ZenDropdownMenuTrigger>
                <ZenDropdownMenuContent align="end">
                  <ZenDropdownMenuItem
                    onClick={() => setShowDeleteModal(true)}
                    className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar Oferta
                  </ZenDropdownMenuItem>
                </ZenDropdownMenuContent>
              </ZenDropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-zinc-900/50 rounded-lg p-1.5 border border-zinc-800">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            // Bloquear pestañas landing y leadform si es modo create y no hay oferta guardada
            const isDisabled = currentMode === "create" && !savedOfferId && tab.id !== "basic";

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!isDisabled) {
                    setActiveTab(tab.id);
                  }
                }}
                disabled={isDisabled}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${isDisabled
                  ? "opacity-50 cursor-not-allowed text-zinc-600"
                  : isActive
                    ? "bg-emerald-500 text-white"
                    : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50"
                  }`}
                title={isDisabled ? "Primero debes guardar la información básica de la oferta" : undefined}
              >
                <span className="flex items-center justify-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "basic" && (
        <BasicInfoTab
          studioSlug={studioSlug}
          mode={currentMode}
          offerId={currentOffer?.id}
          onSave={handleSave}
          onCancel={() => {
            if (currentMode === "edit" || savedOfferId) {
              router.push(`/${studioSlug}/studio/commercial/ofertas`);
            } else {
              router.back();
            }
          }}
          isSaving={isSaving}
          savedOfferId={savedOfferId || currentOffer?.id || null}
        />
      )}
      {activeTab === "landing" && <LandingPageTab studioSlug={studioSlug} />}
      {activeTab === "leadform" && <LeadFormTab studioSlug={studioSlug} />}

      {/* Modal de confirmación para eliminar */}
      <ZenConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Eliminar Oferta"
        description="¿Estás seguro de que deseas eliminar esta oferta? Esta acción eliminará permanentemente la oferta, la landing page y el formulario de contacto asociados. Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
      />
    </div>
  );
}

export function OfferEditor(props: OfferEditorProps) {
  return (
    <OfferEditorProvider initialOffer={props.offer}>
      <OfferEditorContent {...props} />
    </OfferEditorProvider>
  );
}
