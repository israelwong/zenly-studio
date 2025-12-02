"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Copy, Check, FileText, Layout, MessageSquare, CheckCircle2 } from "lucide-react";
import {
  ZenButton,
  ZenConfirmModal,
  ZenSwitch,
} from "@/components/ui/zen";
import { OfferEditorProvider, useOfferEditor } from "./OfferEditorContext";
import { BasicInfoTab } from "./tabs/BasicInfoTab";
import { LandingPageTab } from "./tabs/LandingPageTab";
import { LeadFormTab } from "./tabs/LeadFormTab";
import { createOffer, updateOffer, deleteOffer } from "@/lib/actions/studio/offers/offers.actions";
import { getOfferStats } from "@/lib/actions/studio/offers/offer-stats.actions";
import { OfferStatsMinimal } from "./OfferStatsMinimal";
import type { StudioOffer, OfferStats } from "@/types/offers";
import { toast } from "sonner";

interface OfferEditorProps {
  studioSlug: string;
  mode: "create" | "edit";
  offer?: StudioOffer;
}

// Componente interno que usa el contexto
function OfferEditorContent({ studioSlug, mode, offer }: OfferEditorProps) {
  const router = useRouter();
  const {
    activeTab,
    setActiveTab,
    isSaving,
    setIsSaving,
    getOfferData,
    formData,
    contentBlocks,
    updateFormData,
  } = useOfferEditor();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [stats, setStats] = useState<OfferStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [savedOfferId, setSavedOfferId] = useState<string | null>(offer?.id || null);

  // Calcular completitud de cada tab
  const isBasicComplete = formData.name && formData.slug && formData.cover_media_url && formData.objective;
  const isLandingComplete = contentBlocks.length > 0;
  const isLeadformComplete = true; // Siempre completo (campos básicos heredados)

  // Validar acceso a tabs: Landing y Leadform requieren que la oferta esté guardada
  const canAccessLanding = mode === "edit" || savedOfferId !== null;
  const canAccessLeadform = mode === "edit" || savedOfferId !== null;

  const tabs = [
    { id: "basic" as const, label: "Información", icon: FileText, isComplete: isBasicComplete, canAccess: true },
    { id: "landing" as const, label: "Landing Page", icon: Layout, isComplete: isLandingComplete, canAccess: canAccessLanding },
    { id: "leadform" as const, label: "Formulario", icon: MessageSquare, isComplete: isLeadformComplete, canAccess: canAccessLeadform },
  ];

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validaciones básicas obligatorias
      if (!formData.name.trim()) {
        toast.error("El nombre es requerido");
        setIsSaving(false);
        return;
      }

      if (!formData.slug.trim()) {
        toast.error("El slug es requerido");
        setIsSaving(false);
        return;
      }

      if (!formData.cover_media_url) {
        toast.error("La portada es requerida");
        setIsSaving(false);
        return;
      }

      if (!formData.objective) {
        toast.error("El objetivo de la oferta es requerido");
        setIsSaving(false);
        return;
      }

      // Solo validar content blocks si ya se guardó antes (modo edit o segunda vez)
      if (mode === "edit" && contentBlocks.length === 0) {
        toast.error("Agrega al menos un componente a la landing page");
        setIsSaving(false);
        return;
      }

      // Preparar datos para guardar
      const offerData = getOfferData();

      // Determinar si es creación o actualización
      const currentOfferId = savedOfferId || offer?.id;
      const isFirstSave = mode === "create" && !currentOfferId;

      let result;
      if (isFirstSave) {
        result = await createOffer(studioSlug, offerData);
      } else {
        if (!currentOfferId) {
          toast.error("ID de oferta requerido para actualizar");
          setIsSaving(false);
          return;
        }
        result = await updateOffer(currentOfferId, studioSlug, {
          id: currentOfferId,
          ...offerData,
        });
      }

      if (!result.success) {
        toast.error(result.error || "Error al guardar la oferta");
        setIsSaving(false);
        return;
      }

      toast.success(
        mode === "create"
          ? "Oferta creada exitosamente"
          : "Oferta actualizada exitosamente"
      );

      // Si es el primer guardado, guardar el ID para habilitar otros tabs
      if (isFirstSave && result.data?.id) {
        setSavedOfferId(result.data.id);
        toast.info("Oferta guardada. Ahora puedes agregar contenido a la landing page y configurar el formulario.");
        setIsSaving(false);
        // Actualizar URL sin agregar al historial para que refrescar funcione correctamente
        router.replace(`/${studioSlug}/studio/commercial/ofertas/${result.data.id}`);
        return;
      }

      // Si ya estaba guardada, redirigir después de actualizar
      router.push(`/${studioSlug}/studio/commercial/ofertas`);
    } catch (error) {
      console.error("[OfferEditor] Error:", error);
      toast.error("Error al guardar la oferta");
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!offer?.id) return;

    setIsDeleting(true);
    try {
      const result = await deleteOffer(offer.id, studioSlug);

      if (result.success) {
        toast.success("Oferta eliminada exitosamente");
        router.push(`/${studioSlug}/studio/commercial/ofertas`);
      } else {
        toast.error(result.error || "Error al eliminar la oferta");
        setIsDeleting(false);
      }
    } catch (error) {
      console.error("[OfferEditor] Error:", error);
      toast.error("Error al eliminar la oferta");
      setIsDeleting(false);
    }
  };

  const currentOfferId = savedOfferId || offer?.id;
  const publicUrl = currentOfferId
    ? `/${studioSlug}/offer/${currentOfferId}`
    : `/${studioSlug}/offer/${formData.slug}`;

  // Cargar estadísticas solo en modo edit o cuando hay savedOfferId
  useEffect(() => {
    const offerId = savedOfferId || offer?.id;
    if (offerId) {
      setLoadingStats(true);
      getOfferStats({ offer_id: offerId })
        .then((result) => {
          if (result.success && result.data) {
            setStats(result.data);
          }
        })
        .catch((error) => {
          console.error("[OfferEditor] Error loading stats:", error);
        })
        .finally(() => {
          setLoadingStats(false);
        });
    }
  }, [mode, offer?.id, savedOfferId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <ZenButton variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Regresar</span>
          </ZenButton>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
              {mode === "create" ? "Nueva Oferta" : "Editar Oferta"}
            </h1>
            <p className="text-sm text-zinc-400 hidden sm:block">
              {mode === "create"
                ? "Crea una nueva oferta comercial"
                : "Modifica tu oferta comercial"}
            </p>
          </div>
        </div>

        {/* Botones de Acción en Header */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Link copiar (solo cuando hay offerId) */}
          {currentOfferId && (
            <ZenButton
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}${publicUrl}`
                  );
                  setLinkCopied(true);
                  toast.success("Link copiado");
                  setTimeout(() => setLinkCopied(false), 2000);
                } catch {
                  toast.error("Error al copiar el link");
                }
              }}
            >
              {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </ZenButton>
          )}

          {/* Botón Eliminar (solo cuando hay offerId guardado) */}
          {currentOfferId && (
            <ZenButton
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              disabled={isSaving}
              className="text-red-400 hover:text-red-300 hover:bg-red-950/20 border-red-800/50"
            >
              <Trash2 className="h-4 w-4" />
            </ZenButton>
          )}

          {/* Switch Estado Oferta */}
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5">
            <ZenSwitch
              id="offer-active-switch"
              checked={formData.is_active}
              onCheckedChange={(checked) => updateFormData({ is_active: checked })}
              label="Activa"
            />
          </div>

          {/* Botón Actualizar (solo después de guardar) */}
          {savedOfferId && (
            <ZenButton onClick={handleSave} loading={isSaving} size="sm">
              Actualizar Oferta
            </ZenButton>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full transition-all duration-500 ease-out"
            style={{
              width: `${(tabs.filter((t) => t.isComplete).length / tabs.length) * 100}%`,
            }}
          />
        </div>
        <span className="text-xs font-medium text-zinc-500 whitespace-nowrap">
          {tabs.filter((t) => t.isComplete).length} de {tabs.length}
        </span>
      </div>

      {/* Stats Minimalista (solo cuando hay offerId guardado) */}
      {currentOfferId && stats && !loadingStats && (
        <div className="mb-3">
          <OfferStatsMinimal stats={stats} />
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="bg-zinc-900/50 rounded-lg p-1.5 border border-zinc-800">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isDisabled = !tab.canAccess;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!isDisabled) {
                    setActiveTab(tab.id);
                  } else {
                    toast.info("Completa y guarda la información básica primero");
                  }
                }}
                disabled={isDisabled}
                className={`flex-1 relative px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${isDisabled
                  ? "opacity-50 cursor-not-allowed text-zinc-600"
                  : isActive
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50"
                  }`}
                title={isDisabled ? "Completa y guarda la información básica primero" : undefined}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                  {tab.isComplete && !isActive && !isDisabled && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </span>
                {isActive && !isDisabled && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-md" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "basic" && (
        <BasicInfoTab
          studioSlug={studioSlug}
          mode={mode}
          offerId={savedOfferId || offer?.id}
          onSave={handleSave}
          onCancel={() => setShowCancelModal(true)}
          isSaving={isSaving}
          savedOfferId={savedOfferId}
        />
      )}
      {activeTab === "landing" && canAccessLanding && (
        <LandingPageTab studioSlug={studioSlug} />
      )}
      {activeTab === "landing" && !canAccessLanding && (
        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-12 text-center">
          <Layout className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-300 mb-2">
            Completa la información básica primero
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            Guarda la información básica de la oferta para poder agregar contenido a la landing page.
          </p>
          <ZenButton
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("basic")}
          >
            Ir a Información
          </ZenButton>
        </div>
      )}
      {activeTab === "leadform" && canAccessLeadform && (
        <LeadFormTab studioSlug={studioSlug} />
      )}
      {activeTab === "leadform" && !canAccessLeadform && (
        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-12 text-center">
          <MessageSquare className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-300 mb-2">
            Completa la información básica primero
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            Guarda la información básica de la oferta para poder configurar el formulario.
          </p>
          <ZenButton
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("basic")}
          >
            Ir a Información
          </ZenButton>
        </div>
      )}

      {/* Modal Cancelar */}
      <ZenConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => router.back()}
        title="Cancelar Edición"
        description="¿Estás seguro de que quieres cancelar? Se perderán todos los cambios no guardados."
        confirmText="Sí, Cancelar"
        cancelText="Continuar Editando"
        variant="destructive"
      />

      {/* Modal Eliminar */}
      <ZenConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Eliminar Oferta"
        description="¿Estás seguro de que quieres eliminar esta oferta? Esta acción no se puede deshacer."
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
      />
    </div>
  );
}

// Componente principal que provee el contexto
export function OfferEditor(props: OfferEditorProps) {
  return (
    <OfferEditorProvider initialOffer={props.offer}>
      <OfferEditorContent {...props} />
    </OfferEditorProvider>
  );
}
