"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowLeft, FileText, Layout, MessageSquare, MoreVertical, Trash2, HardDrive, Save, ExternalLink, RotateCcw } from "lucide-react";
import {
  ZenButton,
  ZenSwitch,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenConfirmModal
} from "@/components/ui/zen";
import { OfferEditorProvider, useOfferEditor, type OfferEditorTab } from "./OfferEditorContext";
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
import { obtenerCondicionComercial, actualizarCondicionComercial } from "@/lib/actions/studio/config/condiciones-comerciales.actions";

interface OfferEditorProps {
  studioSlug: string;
  studioId?: string;
  mode: "create" | "edit";
  offer?: StudioOffer;
}

function OfferEditorContent({ studioSlug, studioId, mode, offer }: OfferEditorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeTab, setActiveTab, isSaving, setIsSaving, formData, contentBlocks, leadformData, updateFormData, updateContentBlocks, updateLeadformData, getOfferData, savedOfferId, setSavedOfferId } = useOfferEditor();
  const { triggerRefresh } = useStorageRefresh(studioSlug);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [coverFileSize, setCoverFileSize] = useState<number | null>(null);
  const [currentMode, setCurrentMode] = useState<"create" | "edit">(mode);
  const [currentOffer, setCurrentOffer] = useState<StudioOffer | undefined>(offer);

  // Estado para detectar cambios sin guardar
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<OfferEditorTab | null>(null);
  const [initialData, setInitialData] = useState<string>("");
  const [pendingNavigation, setPendingNavigation] = useState<'back' | null>(null);

  // Sincronizar currentOffer y currentMode cuando cambian los props
  useEffect(() => {
    if (offer) {
      setCurrentOffer(offer);
      setCurrentMode("edit");
      // Guardar snapshot inicial para detectar cambios
      const initialSnapshot = JSON.stringify({
        formData,
        contentBlocks,
        leadformData,
      });
      setInitialData(initialSnapshot);
      setIsDirty(false);
    } else {
      setCurrentMode("create");
    }
  }, [offer]);

  // Leer tab desde URL al cargar
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'basic' || tab === 'landing' || tab === 'leadform')) {
      setActiveTab(tab);
    }
  }, [searchParams, setActiveTab]);

  // Detectar cambios en los datos
  useEffect(() => {
    if (!initialData || currentMode === "create") return;

    const currentSnapshot = JSON.stringify({
      formData,
      contentBlocks,
      leadformData,
    });

    setIsDirty(currentSnapshot !== initialData);
  }, [formData, contentBlocks, leadformData, initialData, currentMode]);

  // Prevenir cerrar ventana con cambios sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && currentMode === "edit") {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, currentMode]);

  // Función para cambiar tab y actualizar URL
  const handleTabChange = (tab: OfferEditorTab) => {
    // Si hay cambios sin guardar, mostrar modal
    if (isDirty && currentMode === "edit") {
      setPendingTab(tab);
      setShowUnsavedModal(true);
      return;
    }

    // Si no hay cambios, cambiar directamente
    setActiveTab(tab);

    // Actualizar URL sin recargar página
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Confirmar cambio de tab sin guardar
  const handleDiscardChanges = () => {
    if (pendingTab) {
      // Resetear datos al estado inicial
      setIsDirty(false);
      setShowUnsavedModal(false);

      // Cambiar tab
      setActiveTab(pendingTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', pendingTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      setPendingTab(null);

      // Recargar datos originales
      if (currentOffer) {
        const initialSnapshot = JSON.stringify({
          formData,
          contentBlocks,
        });
        setInitialData(initialSnapshot);
      }
    } else if (pendingNavigation === 'back') {
      // Navegación hacia atrás
      setIsDirty(false);
      setShowUnsavedModal(false);
      setPendingNavigation(null);
      router.back();
    }
  };

  // Guardar y cambiar tab
  const handleSaveAndChangeTab = async () => {
    if (pendingTab) {
      await handleSave();
      setShowUnsavedModal(false);

      // Cambiar tab después de guardar
      setActiveTab(pendingTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', pendingTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      setPendingTab(null);
    } else if (pendingNavigation === 'back') {
      await handleSave();
      setShowUnsavedModal(false);
      setPendingNavigation(null);
      router.back();
    }
  };

  // Manejar botón volver con protección
  const handleBack = () => {
    if (isDirty && currentMode === "edit") {
      setPendingNavigation('back');
      setShowUnsavedModal(true);
      return;
    }

    // Si está editando una nueva oferta guardada, volver
    if (currentMode === "edit" && currentOffer && savedOfferId) {
      router.push(`/${studioSlug}/studio/commercial/ofertas`);
    } else {
      // Si está creando nueva oferta sin guardar, regresar
      router.back();
    }
  };

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

  // Restaurar cambios al estado inicial
  const handleRestore = () => {
    if (!initialData) {
      toast.error("No hay datos iniciales para restaurar");
      return;
    }

    try {
      const initial = JSON.parse(initialData);
      updateFormData(initial.formData);
      updateContentBlocks(initial.contentBlocks);
      updateLeadformData(initial.leadformData);
      setIsDirty(false);
      toast.success("Cambios restaurados al estado original");
    } catch (error) {
      console.error("Error al restaurar cambios:", error);
      toast.error("Error al restaurar cambios");
    }
  };

  const handleSave = async () => {
    // Validar portada obligatoria
    if (!formData.cover_media_url) {
      toast.error("Debes agregar una portada antes de guardar");
      return;
    }

    // Validar disponibilidad
    if (!formData.is_permanent && !formData.has_date_range) {
      toast.error("Debes seleccionar disponibilidad: Permanente o definir rango de fechas");
      return;
    }

    // Si tiene rango de fechas, validar que estén definidas
    if (formData.has_date_range && (!formData.start_date || !formData.end_date)) {
      toast.error("Debes seleccionar el rango de fechas completo");
      return;
    }

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
          const updatedBlocks = result.data.landing_page?.content_blocks as ContentBlock[] || [];
          if (result.data.landing_page?.content_blocks) {
            updateContentBlocks(updatedBlocks);
          }

          // Resetear estado de cambios con los datos GUARDADOS del servidor
          // Esto asegura que initialData coincida exactamente con lo que está en DB
          setTimeout(() => {
            const newSnapshot = JSON.stringify({
              formData,
              contentBlocks: updatedBlocks.length > 0 ? updatedBlocks : contentBlocks,
              leadformData,
            });
            setInitialData(newSnapshot);
            setIsDirty(false);
          }, 100);
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

          // Asociar condición comercial especial con la oferta si existe
          if (formData.business_term_id) {
            try {
              const condicionResult = await obtenerCondicionComercial(studioSlug, formData.business_term_id);
              if (condicionResult.success && condicionResult.data) {
                const condicion = condicionResult.data;
                // Si es condición especial (tipo 'offer') y no tiene offer_id, asociarla
                if (condicion.type === 'offer' && !condicion.offer_id) {
                  const tipoAnticipo: 'percentage' | 'fixed_amount' =
                    (condicion.advance_type === 'percentage' || condicion.advance_type === 'fixed_amount')
                      ? condicion.advance_type
                      : 'percentage';

                  await actualizarCondicionComercial(
                    studioSlug,
                    formData.business_term_id,
                    {
                      nombre: condicion.name,
                      descripcion: condicion.description ?? null,
                      porcentaje_descuento: condicion.discount_percentage?.toString() || '0',
                      porcentaje_anticipo: condicion.advance_percentage?.toString() || '0',
                      tipo_anticipo: tipoAnticipo,
                      monto_anticipo: condicion.advance_amount?.toString() || null,
                      status: condicion.status === 'active' ? 'active' : 'inactive',
                      orden: condicion.order || 0,
                      type: 'offer',
                      override_standard: condicion.override_standard || false,
                    },
                    {
                      offerId: result.data.id,
                      type: 'offer'
                    }
                  );
                }
              }
            } catch (error) {
              console.error("Error al asociar condición comercial:", error);
              // No mostrar error al usuario, es una operación secundaria
            }
          }

          // Actualizar estado local sin recargar la página
          setCurrentOffer(result.data);
          setCurrentMode("edit");
          // Cambiar automáticamente a la tab Landing Page
          setActiveTab("landing");
          // Actualizar URL con la tab landing
          window.history.pushState({}, '', `/${studioSlug}/studio/commercial/ofertas/${result.data.id}?tab=landing`);
          // Mostrar mensaje sobre crear landing page
          setTimeout(() => {
            toast.info("Crea los bloques de tu landing page para poder publicar la oferta");
          }, 1000);
          // Inicializar snapshot para modo edit
          const newSnapshot = JSON.stringify({
            formData,
            contentBlocks,
            leadformData,
          });
          setInitialData(newSnapshot);
          setIsDirty(false);
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

  const handlePreview = () => {
    if (!currentOffer?.id || !currentOffer?.slug) {
      toast.error("Debes guardar la oferta antes de previsualizarla");
      return;
    }
    const previewUrl = `/${studioSlug}/offer/${currentOffer.slug}?preview=true`;
    window.open(previewUrl, '_blank');
  };

  const handleDelete = async () => {
    if (!currentOffer?.id) {
      setShowDeleteModal(false);
      return;
    }

    const offerId = currentOffer.id;
    setIsDeleting(true);
    try {
      const result = await deleteOffer(offerId, studioSlug);

      if (result.success) {
        // Cerrar modal inmediatamente
        setShowDeleteModal(false);
        toast.success("Oferta eliminada correctamente");
        // Actualizar storage global después de eliminar
        triggerRefresh();
        // Usar setTimeout para asegurar que la redirección ocurra después de cerrar el modal
        setTimeout(() => {
          router.replace(`/${studioSlug}/studio/commercial/ofertas`);
        }, 100);
      } else {
        toast.error(result.error || "Error al eliminar la oferta");
        setIsDeleting(false);
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error("Error al eliminar la oferta");
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
            onClick={handleBack}
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
                  onCheckedChange={(checked) => {
                    // Validar que tenga landing page antes de publicar
                    if (checked && contentBlocks.length === 0) {
                      toast.error("Debes crear al menos un bloque en la landing page antes de publicar");
                      return;
                    }
                    updateFormData({ is_active: checked });
                  }}
                />
              </div>
              {/* Botón Preview */}
              {currentOffer?.slug && (
                <ZenButton
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  className="gap-2"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview
                </ZenButton>
              )}
              {/* Botones de cambios sin guardar */}
              {isDirty && (
                <>
                  {/* Botón Restaurar */}
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={handleRestore}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restaurar
                  </ZenButton>
                  {/* Botón Guardar */}
                  <ZenButton
                    variant="primary"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="gap-2 bg-amber-600/80 hover:bg-amber-600 text-white border-amber-600/30"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500/50 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                    </span>
                    <Save className="h-3.5 w-3.5" />
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </ZenButton>
                </>
              )}
              {/* Menú de opciones */}
              <ZenDropdownMenu>
                <ZenDropdownMenuTrigger asChild>
                  <ZenButton variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </ZenButton>
                </ZenDropdownMenuTrigger>
                <ZenDropdownMenuContent align="end">
                  <ZenDropdownMenuItem
                    onClick={handleSave}
                    disabled={isSaving || !isDirty}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </ZenDropdownMenuItem>
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
                    handleTabChange(tab.id);
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
      {activeTab === "landing" && (
        <LandingPageTab
          studioSlug={studioSlug}
          offerSlug={currentOffer?.slug}
          offerId={currentOffer?.id}
          onSave={handleSave}
          onCancel={() => router.back()}
        />
      )}
      {activeTab === "leadform" && (
        <LeadFormTab
          studioSlug={studioSlug}
          studioId={studioId || offer?.studio_id || ""}
          onSave={handleSave}
          onCancel={() => router.back()}
        />
      )}

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

      {/* Modal de cambios sin guardar */}
      <ZenConfirmModal
        isOpen={showUnsavedModal}
        onClose={handleDiscardChanges}
        onConfirm={handleSaveAndChangeTab}
        title="Cambios sin guardar"
        description={
          pendingNavigation === 'back'
            ? "Tienes cambios sin guardar. ¿Deseas guardarlos antes de salir?"
            : `Tienes cambios sin guardar en la pestaña "${tabs.find(t => t.id === activeTab)?.label}". ¿Deseas guardarlos antes de continuar?`
        }
        confirmText="Guardar y continuar"
        cancelText="Descartar cambios"
        variant="default"
        loading={isSaving}
      />
    </div>
  );
}

export function OfferEditor(props: OfferEditorProps) {
  return (
    <OfferEditorProvider initialOffer={props.offer}>
      <OfferEditorContent
        {...props}
        studioId={props.studioId || props.offer?.studio_id}
      />
    </OfferEditorProvider>
  );
}
