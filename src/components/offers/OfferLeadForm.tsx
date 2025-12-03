"use client";

/**
 * Componente de formulario de contacto para ofertas
 * 
 * ⚠️ TODO: Migrar a components/sections/offers/OfferLeadFormSection.tsx
 * cuando se agreguen más secciones públicas (pagos, calendario)
 * 
 * Este componente debe ser reutilizable en:
 * - Vista pública: /[slug]/offer/[offerId]/leadform
 * - Vista editor: /[slug]/studio/commercial/ofertas (preview)
 * 
 * Ver: docs/arquitectura-componentes-publicos.md
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ZenButton, ZenInput, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenBadge, ZenCalendar, type ZenCalendarProps } from "@/components/ui/zen";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/shadcn/popover";
import { submitOfferLeadform } from "@/lib/actions/studio/offers/offer-submissions.actions";
import { trackOfferVisit } from "@/lib/actions/studio/offers/offer-visits.actions";
import { checkDateAvailability } from "@/lib/actions/studio/offers/offer-availability.actions";
import { LeadFormFieldsConfig, LeadFormField } from "@/lib/actions/schemas/offer-schemas";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CalendarIcon } from "lucide-react";

// Tipo específico para ZenCalendar con mode="single"
type ZenCalendarSingleProps = Omit<ZenCalendarProps, 'mode' | 'selected' | 'onSelect'> & {
  mode: 'single';
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
};

// Tipos para objetos globales de tracking
interface WindowWithDataLayer extends Window {
  dataLayer?: Array<Record<string, unknown>>;
}

interface WindowWithFbq extends Window {
  fbq?: (command: string, eventName: string, eventData?: Record<string, unknown>) => void;
}

interface OfferLeadFormProps {
  studioSlug: string;
  offerId: string;
  offerSlug: string;
  studioId: string;
  title?: string | null;
  description?: string | null;
  successMessage: string;
  successRedirectUrl?: string | null;
  fieldsConfig: LeadFormFieldsConfig;
  selectedEventTypeIds?: string[]; // IDs de tipos de evento seleccionados
  enableInterestDate?: boolean;
  validateWithCalendar?: boolean;
  emailRequired?: boolean;
  coverUrl?: string | null;
  coverType?: string | null;
  isPreview?: boolean;
}

/**
 * Componente de leadform para ofertas
 */
export function OfferLeadForm({
  studioSlug,
  offerId,
  offerSlug,
  studioId,
  title,
  description,
  successMessage,
  successRedirectUrl,
  fieldsConfig,
  selectedEventTypeIds = [],
  enableInterestDate,
  validateWithCalendar = false,
  emailRequired = false,
  coverUrl,
  coverType,
  isPreview = false,
}: OfferLeadFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dateAvailability, setDateAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
  }>({ checking: false, available: null });
  const [eventTypes, setEventTypes] = useState<Array<{ id: string; nombre: string }>>([]);

  // Verificar si viene de éxito
  const isSuccess = searchParams.get("success") === "true";

  // Cargar tipos de evento seleccionados
  useEffect(() => {
    if (selectedEventTypeIds && selectedEventTypeIds.length > 0) {
      const loadEventTypes = async () => {
        try {
          const { obtenerTiposEvento } = await import("@/lib/actions/studio/negocio/tipos-evento.actions");
          const result = await obtenerTiposEvento(studioSlug);
          if (result.success && result.data) {
            // Filtrar solo los tipos seleccionados
            const selected = result.data.filter(t => selectedEventTypeIds.includes(t.id));
            setEventTypes(selected.map(t => ({ id: t.id, nombre: t.nombre })));
          }
        } catch (error) {
          console.error("Error loading event types:", error);
        }
      };
      loadEventTypes();
    }
  }, [selectedEventTypeIds, studioSlug]);

  useEffect(() => {
    // Registrar visita al cargar el leadform
    const trackVisit = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const utmParams = {
        utm_source: urlParams.get("utm_source") || undefined,
        utm_medium: urlParams.get("utm_medium") || undefined,
        utm_campaign: urlParams.get("utm_campaign") || undefined,
        utm_term: urlParams.get("utm_term") || undefined,
        utm_content: urlParams.get("utm_content") || undefined,
      };

      let sessionId = localStorage.getItem(`offer_session_${offerId}`);
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(`offer_session_${offerId}`, sessionId);
      }

      await trackOfferVisit({
        offer_id: offerId,
        visit_type: "leadform",
        referrer: document.referrer || undefined,
        ...utmParams,
        session_id: sessionId,
      });

      // Disparar evento personalizado
      if (typeof window !== "undefined") {
        const windowWithDataLayer = window as WindowWithDataLayer;
        const windowWithFbq = window as WindowWithFbq;

        if (windowWithDataLayer.dataLayer) {
          windowWithDataLayer.dataLayer.push({
            event: "offer_leadform_view",
            offer_id: offerId,
            offer_slug: offerSlug,
            ...utmParams,
          });
        }

        if (windowWithFbq.fbq) {
          windowWithFbq.fbq("track", "ViewContent", {
            content_name: `${offerSlug}_leadform`,
            content_category: "leadform",
            ...utmParams,
          });
        }
      }
    };

    if (!isSuccess) {
      trackVisit();
    }
  }, [offerId, offerSlug, isSuccess]);

  // Campos básicos siempre presentes
  const basicFields: LeadFormField[] = [
    {
      id: "name",
      type: "text",
      label: "Nombre completo",
      required: true,
      placeholder: "Tu nombre",
    },
    {
      id: "phone",
      type: "phone",
      label: "Teléfono",
      required: true,
      placeholder: "10 dígitos",
    },
    {
      id: "email",
      type: "email",
      label: "Email",
      required: emailRequired,
      placeholder: "tu@email.com",
    },
  ];

  // Agregar campo de tipo de evento (si hay tipos seleccionados)
  if (selectedEventTypeIds && selectedEventTypeIds.length > 0 && eventTypes.length > 0) {
    basicFields.push({
      id: "event_type_id",
      type: "select",
      label: "¿Qué tipo de evento te interesa?",
      required: true,
      placeholder: "Selecciona un tipo de evento",
      options: eventTypes.map(t => t.nombre),
    });
  }

  // Agregar campo de fecha de interés si está habilitado
  if (enableInterestDate) {
    basicFields.push({
      id: "interest_date",
      type: "date",
      label: "Fecha de interés",
      required: false,
      placeholder: "Selecciona una fecha",
    });
  }

  // Solo campos básicos (custom fields omitidos para max conversión)
  const allFields = basicFields;

  const handleInputChange = async (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));

    // Limpiar error del campo
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }

    // Validar disponibilidad de fecha si aplica
    if (
      fieldId === "interest_date" &&
      value &&
      enableInterestDate &&
      validateWithCalendar &&
      !isPreview
    ) {
      setDateAvailability({ checking: true, available: null });

      const result = await checkDateAvailability({
        studio_id: studioId,
        date: value,
      });

      if (result.success && result.data) {
        setDateAvailability({
          checking: false,
          available: result.data.available,
        });
      } else {
        setDateAvailability({ checking: false, available: null });
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    allFields.forEach((field) => {
      const value = formData[field.id] || "";

      if (field.required && !value.trim()) {
        newErrors[field.id] = `${field.label} es requerido`;
        return;
      }

      if (value && field.type === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.id] = "Email inválido";
        }
      }

      if (value && field.type === "phone") {
        const phoneRegex = /^\d{10,}$/;
        if (!phoneRegex.test(value.replace(/\D/g, ""))) {
          newErrors[field.id] = "Teléfono debe tener al menos 10 dígitos";
        }
      }

      // Validar fecha de interés con agenda
      if (
        field.id === "interest_date" &&
        value &&
        validateWithCalendar &&
        dateAvailability.available === false
      ) {
        newErrors[field.id] = "Esta fecha no está disponible";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    // Si es preview, no enviar
    if (isPreview) {
      toast.success("Preview: Formulario validado correctamente");
      return;
    }

    setIsSubmitting(true);

    try {
      // Obtener parámetros UTM de la URL
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = localStorage.getItem(`offer_session_${offerId}`);

      // Preparar datos del formulario
      const customFields: Record<string, unknown> = {};
      fieldsConfig.fields?.forEach((field) => {
        if (formData[field.id]) {
          customFields[field.id] = formData[field.id];
        }
      });

      // Mapear event_type_id (formData contiene el nombre, necesitamos el ID)
      let eventTypeId: string | undefined;
      if (formData.event_type_id) {
        const selectedType = eventTypes.find(t => t.nombre === formData.event_type_id);
        eventTypeId = selectedType?.id;
      }

      const result = await submitOfferLeadform(studioSlug, {
        offer_id: offerId,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || "",
        event_type_id: eventTypeId,
        custom_fields: customFields,
        utm_source: urlParams.get("utm_source") || undefined,
        utm_medium: urlParams.get("utm_medium") || undefined,
        utm_campaign: urlParams.get("utm_campaign") || undefined,
        utm_term: urlParams.get("utm_term") || undefined,
        utm_content: urlParams.get("utm_content") || undefined,
        session_id: sessionId || undefined,
      });

      if (!result.success) {
        toast.error(result.error || "Error al enviar el formulario");
        setIsSubmitting(false);
        return;
      }

      // Disparar eventos de conversión
      if (typeof window !== "undefined") {
        const windowWithDataLayer = window as WindowWithDataLayer;
        const windowWithFbq = window as WindowWithFbq;

        if (windowWithDataLayer.dataLayer) {
          windowWithDataLayer.dataLayer.push({
            event: "offer_form_success",
            offer_id: offerId,
            contact_id: result.data?.contact_id,
          });
        }

        if (windowWithFbq.fbq) {
          windowWithFbq.fbq("track", "Lead", {
            content_name: offerSlug,
            value: 0,
            currency: "MXN",
          });
        }
      }

      toast.success(successMessage);

      // Redirigir según configuración
      if (successRedirectUrl) {
        window.location.href = successRedirectUrl;
      } else if (result.data?.redirect_url) {
        router.push(result.data.redirect_url);
      } else {
        // Redirigir a la misma página con parámetro de éxito
        router.push(`/${studioSlug}/offer/${offerSlug}/leadform?success=true`);
      }
    } catch (error) {
      console.error("[OfferLeadForm] Error:", error);
      toast.error("Error al enviar el formulario. Por favor intenta de nuevo.");
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <ZenCard className="max-w-md w-full">
          <ZenCardHeader>
            <ZenCardTitle className="text-center text-emerald-400">
              ¡Gracias!
            </ZenCardTitle>
          </ZenCardHeader>
          <ZenCardContent className="text-center space-y-4">
            <p className="text-zinc-300">{successMessage}</p>
            <ZenButton
              variant="outline"
              onClick={() => router.push(`/${studioSlug}`)}
            >
              Volver al inicio
            </ZenButton>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  return (
    <div className="relative  bg-zinc-950">
      {/* Hero Cover */}
      {coverUrl && (
        <div className="absolute inset-x-0 top-0 h-[40vh] md:h-[45vh] overflow-hidden rounded-b-3xl">
          {coverType === 'video' ? (
            <video
              src={coverUrl}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <Image
              src={coverUrl}
              alt="Cover"
              fill
              className="object-cover"
              priority
              unoptimized
            />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 via-zinc-950/40 to-zinc-950" />
        </div>
      )}

      {/* Formulario superpuesto */}
      <div className={`relative z-10 flex items-start justify-center p-4 pb-12 ${coverUrl ? 'pt-[20vh] md:pt-[15vh]' : 'min-h-screen items-center'}`}>
        <ZenCard className="max-w-lg w-full bg-zinc-900/50 backdrop-blur-md shadow-2xl border-zinc-800/50">
          <ZenCardHeader>
            <ZenCardTitle>{title || "Solicita información"}</ZenCardTitle>
            {description && (
              <p className="text-sm text-zinc-400 mt-2">{description}</p>
            )}
          </ZenCardHeader>
          <ZenCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {allFields.map((field) => (
                <div key={field.id}>
                  {/* Campo de fecha con ZenCalendar */}
                  {field.type === "date" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 block mb-2">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <ZenButton
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!formData[field.id] && "text-zinc-500"
                              } ${errors[field.id] && "border-red-500"}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData[field.id]
                              ? format(new Date(formData[field.id]), "PPP", { locale: es })
                              : field.placeholder || "Selecciona una fecha"}
                          </ZenButton>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <ZenCalendar
                            {...({
                              mode: 'single' as const,
                              selected: formData[field.id] ? new Date(formData[field.id]) : undefined,
                              onSelect: (date: Date | undefined) => {
                                if (date) {
                                  const dateString = format(date, "yyyy-MM-dd");
                                  handleInputChange(field.id, dateString);
                                }
                              },
                              initialFocus: true,
                            } as ZenCalendarSingleProps)}
                          />
                        </PopoverContent>
                      </Popover>
                      {errors[field.id] && (
                        <p className="text-xs text-red-400 mt-1">{errors[field.id]}</p>
                      )}
                    </div>
                  ) : field.type === "select" && field.options ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 block">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <select
                        className={`w-full px-3 py-2 bg-zinc-900 border rounded-lg text-sm text-zinc-300 transition-all duration-200 outline-none focus:ring-[3px] focus:border-zinc-600 focus:ring-zinc-500/20 ${errors[field.id] ? "border-red-500" : "border-zinc-700"
                          }`}
                        value={formData[field.id] || ""}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        required={field.required}
                      >
                        {field.placeholder ? (
                          <option value="">{field.placeholder}</option>
                        ) : null}
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {errors[field.id] && (
                        <p className="text-xs text-red-400 mt-1">{errors[field.id]}</p>
                      )}
                    </div>
                  ) : field.type === "textarea" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 block">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <textarea
                        className={`w-full px-3 py-2 bg-zinc-900 border rounded-lg text-sm text-zinc-300 transition-all duration-200 outline-none focus:ring-[3px] focus:border-zinc-600 focus:ring-zinc-500/20 ${errors[field.id] ? "border-red-500" : "border-zinc-700"
                          }`}
                        value={formData[field.id] || ""}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        rows={4}
                      />
                      {errors[field.id] && (
                        <p className="text-xs text-red-400 mt-1">{errors[field.id]}</p>
                      )}
                    </div>
                  ) : (
                    <ZenInput
                      label={field.label}
                      name={field.id}
                      type={
                        field.type === "phone"
                          ? "tel"
                          : field.type === "email"
                            ? "email"
                            : "text"
                      }
                      value={formData[field.id] || ""}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      error={errors[field.id]}
                    />
                  )}

                  {/* Badge de disponibilidad para fecha de interés */}
                  {field.id === "interest_date" &&
                    formData[field.id] &&
                    validateWithCalendar &&
                    !isPreview && (
                      <div className="mt-2">
                        {dateAvailability.checking ? (
                          <ZenBadge variant="secondary" size="sm">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Verificando...
                          </ZenBadge>
                        ) : dateAvailability.available === true ? (
                          <ZenBadge variant="success" size="sm">
                            ✓ Fecha disponible
                          </ZenBadge>
                        ) : dateAvailability.available === false ? (
                          <ZenBadge variant="destructive" size="sm">
                            ✗ Fecha no disponible
                          </ZenBadge>
                        ) : null}
                      </div>
                    )}
                </div>
              ))}

              <ZenButton
                type="submit"
                className="w-full"
                loading={!!isSubmitting}
                disabled={
                  !!isSubmitting ||
                  !!dateAvailability.checking ||
                  !!(validateWithCalendar &&
                    enableInterestDate &&
                    formData.interest_date &&
                    dateAvailability.available === false)
                }
              >
                Enviar solicitud
              </ZenButton>
            </form>
          </ZenCardContent>
        </ZenCard>
      </div>
    </div>
  );
}
