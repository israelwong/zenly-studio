"use client";

import { useState, useEffect } from "react";
import { ZenInput, ZenTextarea, ZenSwitch, ZenCalendar, ZenButton, ZenBadge } from "@/components/ui/zen";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/shadcn/popover";
import { useOfferEditor } from "../OfferEditorContext";
import { CondicionRadioCard } from "./CondicionRadioCard";
import { Loader2, Calendar, Plus, MousePointerClick, TrendingUp, FileText, Smartphone } from "lucide-react";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useStorageRefresh } from "@/hooks/useStorageRefresh";
import { toast } from "sonner";
import { CoverDropzone } from "@/components/shared/CoverDropzone";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { obtenerTodasCondicionesComerciales } from "@/lib/actions/studio/config/condiciones-comerciales.actions";
import { CondicionesComercialesManager } from "@/components/shared/condiciones-comerciales/CondicionesComercialesManager";
import { CondicionComercialFormModal } from "@/components/shared/condiciones-comerciales/CondicionComercialFormModal";
import { Settings } from "lucide-react";
import { TipoEventoSelector } from "@/components/shared/tipos-evento";

interface InfoEditorProps {
  studioSlug: string;
  nameError: string | null;
  isValidatingSlug: boolean;
  slugHint: string | null;
  mode?: "create" | "edit";
  onEventTypeChange?: (eventTypeId: string | null, eventTypeName?: string | null) => void;
  onConditionUpdated?: () => void; // Callback para refrescar el preview cuando se actualiza una condición
}

// Helper para generar slug desde nombre
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function InfoEditor({
  studioSlug,
  nameError,
  isValidatingSlug,
  slugHint,
  mode = "create",
  onEventTypeChange,
  onConditionUpdated,
}: InfoEditorProps) {
  const { formData, updateFormData, savedOfferId, offerId } = useOfferEditor();
  const { uploadFiles } = useMediaUpload();
  const { triggerRefresh } = useStorageRefresh(studioSlug);

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverFileSize, setCoverFileSize] = useState<number | null>(null);
  const [businessTerms, setBusinessTerms] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    discount_percentage: number | null;
    advance_percentage: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
    type: 'standard' | 'offer';
  }>>([]);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [showBusinessTerms, setShowBusinessTerms] = useState(!!formData.business_term_id);
  const [showCondicionesModal, setShowCondicionesModal] = useState(false);
  const [showConditionFormModal, setShowConditionFormModal] = useState(false);
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (formData.start_date && formData.end_date) {
      return {
        from: formData.start_date,
        to: formData.end_date,
      };
    }
    return undefined;
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);

  // Cargar condiciones comerciales si ya hay una seleccionada (modo edición)
  useEffect(() => {
    if (formData.business_term_id && businessTerms.length === 0 && !loadingTerms) {
      loadBusinessTerms();
    }
  }, [formData.business_term_id]);

  // Auto-generar slug cuando cambia el nombre
  useEffect(() => {
    if (formData.name) {
      const expectedSlug = generateSlug(formData.name);
      // Solo actualizar si el slug está vacío o si coincide con el esperado
      if (!formData.slug || formData.slug !== expectedSlug) {
        updateFormData({ slug: expectedSlug });
      }
    }
  }, [formData.name]); // Remover formData.slug y updateFormData de las dependencias

  const handleCoverUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    setIsUploadingCover(true);
    try {
      const uploadedFiles = await uploadFiles(
        [file],
        studioSlug,
        "offers",
        "covers"
      );

      if (uploadedFiles.length > 0) {
        const fileSize = uploadedFiles[0].size || file.size;
        setCoverFileSize(fileSize);

        updateFormData({
          cover_media_url: uploadedFiles[0].url,
          cover_media_type: isVideo ? "video" : "image",
        });

        // Actualizar storage global
        triggerRefresh();

        toast.success("Portada subida correctamente");
      }
    } catch (error) {
      console.error("Error uploading cover:", error);
      toast.error("Error al subir la portada");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleRemoveCover = () => {
    updateFormData({
      cover_media_url: null,
      cover_media_type: null,
    });
    setCoverFileSize(null);
    // Actualizar storage global al eliminar
    triggerRefresh();
    toast.success("Portada eliminada");
  };

  // Obtener tamaño del archivo si hay portada pero no tenemos el tamaño
  useEffect(() => {
    if (formData.cover_media_url && !coverFileSize) {
      // Intentar obtener el tamaño mediante HEAD request
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
    } else if (!formData.cover_media_url) {
      setCoverFileSize(null);
    }
  }, [formData.cover_media_url, coverFileSize]);

  return (
    <div className="space-y-4">
      {/* Nombre */}
      <div>
        <ZenInput
          id="offer-name-input"
          label="Nombre de la Oferta"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="Ej: Sesión Fotográfica de Verano 2024"
          required
          error={nameError ?? undefined}
        />
        {/* Indicador de validación y hint */}
        {isValidatingSlug && !nameError && (
          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Validando disponibilidad...
          </p>
        )}
        {slugHint && !isValidatingSlug && !nameError && (
          <p className="text-xs text-emerald-400 mt-1">
            {slugHint}
          </p>
        )}
      </div>

      {/* Divisor */}
      <div className="border-t border-zinc-800" />

      {/* Portada Multimedia */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Portada (Foto o Video) <span className="text-red-400">*</span>
        </label>
        <CoverDropzone
          mediaUrl={formData.cover_media_url || null}
          mediaType={formData.cover_media_type || null}
          onDropFiles={handleCoverUpload}
          onRemoveMedia={handleRemoveCover}
          isUploading={isUploadingCover}
          variant="compact"
          aspectRatio="video"
          helpText="Recomendado: 1920x1080px"
          placeholderText="Arrastra una imagen o video, o haz clic para seleccionar"
          showHelpText={true}
          showFileSize={false}
        />
        <p className="text-xs text-zinc-500 mt-2">
          Esta imagen/video se mostrará en el feed público de tu perfil
        </p>
      </div>

      {/* Divisor */}
      <div className="border-t border-zinc-800" />

      {/* Tipo de Evento */}
      <div>
        <TipoEventoSelector
          studioSlug={studioSlug}
          selectedEventTypeId={formData.event_type_id}
          onChange={(eventTypeId, eventTypeName) => {
            updateFormData({ event_type_id: eventTypeId });
            if (onEventTypeChange) {
              onEventTypeChange(eventTypeId, eventTypeName);
            }
          }}
          label="Tipo de Evento"
          hint="Asocia esta oferta con el catálogo y promesas del tipo de evento"
          showBadge={false}
        />
      </div>

      {/* Disponibilidad */}
      <div className="space-y-4 border-t border-zinc-800 pt-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-zinc-300">Disponibilidad</h3>
          <span className="text-red-400">*</span>
        </div>

        {/* Switch Oferta Permanente */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label htmlFor="is-permanent" className="text-sm font-medium text-zinc-300">
              Oferta Permanente
            </label>
            <p className="text-xs text-zinc-500">
              Esta oferta estará disponible indefinidamente
            </p>
          </div>
          <ZenSwitch
            id="is-permanent"
            checked={formData.is_permanent}
            onCheckedChange={(checked) => {
              updateFormData({
                is_permanent: checked,
                has_date_range: checked ? false : formData.has_date_range,
                start_date: checked ? null : formData.start_date,
                end_date: checked ? null : formData.end_date,
              });
              if (checked) {
                setDateRange(undefined);
              }
            }}
          />
        </div>

        {/* Switch Definir Temporalidad */}
        {!formData.is_permanent && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label htmlFor="has-date-range" className="text-sm font-medium text-zinc-300">
                  Definir Temporalidad
                </label>
                <p className="text-xs text-zinc-500">
                  Establece fechas específicas de inicio y fin
                </p>
              </div>
              <ZenSwitch
                id="has-date-range"
                checked={formData.has_date_range}
                onCheckedChange={(checked) => {
                  updateFormData({
                    has_date_range: checked,
                    start_date: checked ? formData.start_date : null,
                    end_date: checked ? formData.end_date : null,
                  });
                  if (!checked) {
                    setDateRange(undefined);
                  }
                }}
              />
            </div>

            {/* Calendario de Rango */}
            {formData.has_date_range && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Período de Disponibilidad <span className="text-red-400">*</span>
                </label>
                <Popover
                  open={isCalendarOpen}
                  onOpenChange={(open) => {
                    setIsCalendarOpen(open);
                    if (open) {
                      // Al abrir, guardar el rango actual como temporal
                      setTempDateRange(dateRange);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <ZenButton
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd MMM yyyy", { locale: es })} - {format(dateRange.to, "dd MMM yyyy", { locale: es })}
                          </>
                        ) : (
                          format(dateRange.from, "dd MMM yyyy", { locale: es })
                        )
                      ) : (
                        <span className="text-zinc-500">Seleccionar rango de fechas</span>
                      )}
                    </ZenButton>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="start">
                    <div className="p-3">
                      <ZenCalendar
                        {...{
                          mode: "range" as const,
                          selected: tempDateRange,
                          onSelect: (range: DateRange | undefined) => {
                            setTempDateRange(range);
                          },
                          numberOfMonths: 2,
                          disabled: (date: Date) => date < new Date(new Date().setHours(0, 0, 0, 0))
                        }}
                      />
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800 mt-3">
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTempDateRange(dateRange);
                            setIsCalendarOpen(false);
                          }}
                        >
                          Cancelar
                        </ZenButton>
                        <ZenButton
                          variant="primary"
                          size="sm"
                          disabled={!tempDateRange?.from || !tempDateRange?.to}
                          onClick={() => {
                            if (tempDateRange?.from && tempDateRange?.to) {
                              setDateRange(tempDateRange);
                              updateFormData({
                                start_date: tempDateRange.from,
                                end_date: tempDateRange.to,
                              });
                              setIsCalendarOpen(false);
                            }
                          }}
                        >
                          Confirmar
                        </ZenButton>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        )}

        {!formData.is_permanent && !formData.has_date_range && (
          <p className="text-xs text-amber-400">
            Debes seleccionar &quot;Oferta Permanente&quot; o &quot;Definir Temporalidad&quot;
          </p>
        )}
      </div>

      {/* Condiciones Comerciales Especiales */}
      <div className="space-y-4 border-t border-zinc-800 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-zinc-300">Condiciones Comerciales</h3>
          <ZenButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCondicionesModal(true)}
            className="h-7 text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            Gestionar
          </ZenButton>
        </div>

        {/* Toggle Aplicar Condiciones Especiales */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 flex-1">
            <label htmlFor="has-special-terms" className="text-sm font-medium text-zinc-300">
              Aplicar condiciones especiales
            </label>
            <p className="text-xs text-zinc-500">
              Descuentos o bonos exclusivos para esta oferta
            </p>
          </div>
          <ZenSwitch
            id="has-special-terms"
            checked={showBusinessTerms}
            onCheckedChange={(checked) => {
              setShowBusinessTerms(checked);
              if (!checked) {
                updateFormData({
                  business_term_id: null,
                });
              } else {
                // Cargar condiciones comerciales al activar
                loadBusinessTerms();
              }
            }}
          />
        </div>

        {/* Selector de Condición Comercial */}
        {showBusinessTerms && (
          <div className="space-y-5 pl-4 border-l-2 border-emerald-500/30">
            {loadingTerms ? (
              <div className="space-y-3 animate-pulse">
                {/* Skeleton para Condiciones Estándar */}
                <div className="space-y-2">
                  <div className="h-3 w-32 bg-zinc-800 rounded" />
                  {[1, 2].map((i) => (
                    <div
                      key={`standard-${i}`}
                      className="border rounded-lg p-3 border-zinc-700 bg-zinc-800/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          <div className="w-4 h-4 rounded-full border-2 border-zinc-600 bg-zinc-700" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-3/4 bg-zinc-700 rounded" />
                          <div className="h-3 w-full bg-zinc-700/50 rounded" />
                          <div className="flex items-center gap-4 mt-1.5">
                            <div className="h-3 w-20 bg-zinc-700/50 rounded" />
                            <div className="h-3 w-24 bg-zinc-700/50 rounded" />
                          </div>
                        </div>
                        <div className="shrink-0">
                          <div className="h-7 w-7 bg-zinc-700 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Skeleton para Condiciones Especiales */}
                <div className="space-y-2">
                  <div className="h-3 w-40 bg-zinc-800 rounded" />
                  <div className="border rounded-lg p-3 border-zinc-700 bg-zinc-800/50">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        <div className="w-4 h-4 rounded-full border-2 border-zinc-600 bg-zinc-700" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-2/3 bg-zinc-700 rounded" />
                          <div className="h-4 w-16 bg-purple-500/20 rounded" />
                        </div>
                        <div className="h-3 w-full bg-zinc-700/50 rounded" />
                        <div className="flex items-center gap-4 mt-1.5">
                          <div className="h-3 w-20 bg-zinc-700/50 rounded" />
                          <div className="h-3 w-24 bg-zinc-700/50 rounded" />
                        </div>
                      </div>
                      <div className="shrink-0">
                        <div className="h-7 w-7 bg-zinc-700 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : businessTerms.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-amber-400">
                  No hay condiciones comerciales disponibles.
                </p>
                <ZenButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingConditionId(null);
                    setShowConditionFormModal(true);
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera condición
                </ZenButton>
              </div>
            ) : (
              <>
                {/* Condiciones Estándar */}
                {businessTerms.filter(t => t.type === 'standard').length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Condiciones Estándar
                      </h4>
                      {/* <ZenButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCondicionesModal(true)}
                        className="h-6 text-xs"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Gestionar
                      </ZenButton> */}
                    </div>
                    <div className="space-y-2">
                      {businessTerms
                        .filter(t => t.type === 'standard')
                        .map((term) => (
                          <CondicionRadioCard
                            key={term.id}
                            id={term.id}
                            name={term.name}
                            description={term.description}
                            discount_percentage={term.discount_percentage}
                            advance_percentage={term.advance_percentage}
                            advance_type={term.advance_type}
                            advance_amount={term.advance_amount}
                            type={term.type}
                            selected={formData.business_term_id === term.id}
                            onChange={(id) => updateFormData({ business_term_id: id })}
                            onEdit={(id) => {
                              setEditingConditionId(id);
                              setShowConditionFormModal(true);
                            }}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Condiciones Especiales (Oferta) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Condiciones Especiales
                      <span className="ml-2 text-[10px] text-zinc-500 font-normal normal-case">(Esta oferta)</span>
                    </h4>
                  </div>

                  {businessTerms.filter(t => t.type === 'offer').length > 0 ? (
                    <div className="space-y-2">
                      {businessTerms
                        .filter(t => t.type === 'offer')
                        .map((term) => (
                          <CondicionRadioCard
                            key={term.id}
                            id={term.id}
                            name={term.name}
                            description={term.description}
                            discount_percentage={term.discount_percentage}
                            advance_percentage={term.advance_percentage}
                            advance_type={term.advance_type}
                            advance_amount={term.advance_amount}
                            type={term.type}
                            selected={formData.business_term_id === term.id}
                            onChange={(id) => updateFormData({ business_term_id: id })}
                            onEdit={(id) => {
                              setEditingConditionId(id);
                              setShowConditionFormModal(true);
                            }}
                          />
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      No hay condiciones especiales para esta oferta.
                    </p>
                  )}

                  {/* Botón Crear Condición Especial */}
                  <ZenButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingConditionId(null);
                      setShowConditionFormModal(true);
                    }}
                    className="w-full text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-zinc-600 hover:border-emerald-500/30"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear condición especial para esta oferta
                  </ZenButton>
                </div>

                {/* Info */}
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-300">
                    💡 Las condiciones seleccionadas se mostrarán en los paquetes y cotizaciones asociadas a esta oferta.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Destino del Banner */}
      <div className="space-y-3 border-t border-zinc-800 pt-4">
        <div>
          <label className="text-sm font-medium text-zinc-300 block mb-1">
            ¿A dónde quieres enviar al prospecto al hacer click en el banner?
          </label>
          <div className="space-y-2 mt-3">
            <button
              type="button"
              onClick={() => updateFormData({ banner_destination: "LEADFORM_ONLY" })}
              className={`
                w-full p-4 rounded-lg border-2 transition-all text-left
                ${formData.banner_destination === "LEADFORM_ONLY"
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                }
              `}
            >
              <div className="text-sm font-medium mb-1">A Leadform</div>
              <div className="text-xs opacity-75 flex items-center gap-1.5">
                <MousePointerClick className="h-3 w-3" />
                Click en banner → <FileText className="h-3 w-3" /> Leadform
              </div>
              <div className="text-xs opacity-60 mt-1 text-amber-400">No incluye landing page</div>
            </button>
            <button
              type="button"
              onClick={() => updateFormData({ banner_destination: "LEADFORM_WITH_LANDING" })}
              className={`
                w-full p-4 rounded-lg border-2 transition-all text-left
                ${formData.banner_destination === "LEADFORM_WITH_LANDING"
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                }
              `}
            >
              <div className="text-sm font-medium mb-1">A Leadform (con Landing para campañas)</div>
              <div className="text-xs opacity-75 flex items-center gap-1.5">
                <MousePointerClick className="h-3 w-3" />
                Click en banner → <Smartphone className="h-3 w-3" /> Landing Page → <FileText className="h-3 w-3" /> Leadform
              </div>
              <div className="text-xs opacity-75 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" />
                Tráfico externo → <Smartphone className="h-3 w-3" /> Landing Page → <FileText className="h-3 w-3" /> Leadform
              </div>
            </button>
            <button
              type="button"
              onClick={() => updateFormData({ banner_destination: "LANDING_THEN_LEADFORM" })}
              className={`
                w-full p-4 rounded-lg border-2 transition-all text-left
                ${formData.banner_destination === "LANDING_THEN_LEADFORM"
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="text-sm font-medium">A Landing Page</div>
                <ZenBadge variant="warning" className="rounded-full text-xs px-2 py-0.5">
                  Recomendado
                </ZenBadge>
              </div>
              <div className="text-xs opacity-75 flex items-center gap-1.5">
                <MousePointerClick className="h-3 w-3" />
                Click en banner → <Smartphone className="h-3 w-3" /> Landing Page → <FileText className="h-3 w-3" /> Leadform
              </div>
              <div className="text-xs opacity-75 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" />
                Tráfico externo → <Smartphone className="h-3 w-3" /> Landing Page → <FileText className="h-3 w-3" /> Leadform
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Unificado de Crear/Editar */}
      {showConditionFormModal && (
        <CondicionComercialFormModal
          studioSlug={studioSlug}
          isOpen={showConditionFormModal}
          onClose={() => {
            setShowConditionFormModal(false);
            setEditingConditionId(null);
          }}
          condicionId={editingConditionId}
          onSuccess={(updatedCondition) => {
            // Recargar condiciones comerciales
            loadBusinessTerms();

            // Si la condición editada es la seleccionada, forzar actualización del preview
            if (editingConditionId && formData.business_term_id === editingConditionId && updatedCondition) {
              // Notificar al componente padre para refrescar el preview
              onConditionUpdated?.();
            }
          }}
          context={
            (savedOfferId || offerId)
              ? {
                type: 'offer',
                offerId: (savedOfferId || offerId) as string,
                offerName: formData.name || 'Nueva oferta'
              }
              : undefined
          }
        />
      )}

      {/* Modal de Gestión Completa (Manager) */}
      {showCondicionesModal && (
        <CondicionesComercialesManager
          studioSlug={studioSlug}
          isOpen={showCondicionesModal}
          onClose={() => setShowCondicionesModal(false)}
          onRefresh={() => {
            loadBusinessTerms();
          }}
          context={
            (savedOfferId || offerId)
              ? {
                type: 'offer',
                offerId: (savedOfferId || offerId) as string,
                offerName: formData.name || 'Nueva oferta'
              }
              : undefined
          }
        />
      )}
    </div>
  );

  async function loadBusinessTerms() {
    setLoadingTerms(true);
    try {
      const result = await obtenerTodasCondicionesComerciales(studioSlug);
      if (result.success && result.data) {
        const activeTerms = result.data
          .filter(t => t.status === "active")
          .map(t => {
            const tWithAdvance = t as typeof t & { advance_type?: string | null; advance_amount?: number | null };
            return {
              id: t.id,
              name: t.name,
              description: t.description,
              discount_percentage: t.discount_percentage,
              advance_percentage: t.advance_percentage,
              advance_type: tWithAdvance.advance_type,
              advance_amount: tWithAdvance.advance_amount,
              type: (t.type || 'standard') as 'standard' | 'offer',
            };
          });
        setBusinessTerms(activeTerms);
      } else {
        toast.error("Error al cargar condiciones comerciales");
      }
    } catch (error) {
      console.error("Error loading business terms:", error);
      toast.error("Error al cargar condiciones comerciales");
    } finally {
      setLoadingTerms(false);
    }
  }
}
