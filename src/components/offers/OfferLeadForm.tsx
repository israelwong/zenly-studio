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
import { ZenButton, ZenInput, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from "@/components/ui/zen";
import { submitOfferLeadform } from "@/lib/actions/studio/offers/offer-submissions.actions";
import { trackOfferVisit } from "@/lib/actions/studio/offers/offer-visits.actions";
import { LeadFormFieldsConfig, LeadFormField } from "@/lib/actions/schemas/offer-schemas";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

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
  title?: string | null;
  description?: string | null;
  successMessage: string;
  successRedirectUrl?: string | null;
  fieldsConfig: LeadFormFieldsConfig;
  subjectOptions?: string[];
  enableInterestDate?: boolean;
  isPreview?: boolean;
}

/**
 * Componente de leadform para ofertas
 */
export function OfferLeadForm({
  studioSlug,
  offerId,
  offerSlug,
  title,
  description,
  successMessage,
  successRedirectUrl,
  fieldsConfig,
  subjectOptions,
  enableInterestDate,
  isPreview = false,
}: OfferLeadFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Verificar si viene de éxito
  const isSuccess = searchParams.get("success") === "true";

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
      required: false,
      placeholder: "tu@email.com",
    },
  ];

  // Agregar campo de asunto si hay opciones
  if (subjectOptions && subjectOptions.length > 0) {
    basicFields.push({
      id: "subject",
      type: "select",
      label: "Asunto",
      required: true,
      placeholder: "Selecciona un asunto",
      options: subjectOptions,
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

  // Combinar campos básicos con personalizados
  const allFields = [...basicFields, ...(fieldsConfig.fields || [])];

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    // Limpiar error del campo
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
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

      const result = await submitOfferLeadform(studioSlug, {
        offer_id: offerId,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || "",
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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <ZenCard className="max-w-lg w-full">
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
                <ZenInput
                  label={field.label}
                  name={field.id}
                  type={
                    field.type === "phone"
                      ? "tel"
                      : field.type === "email"
                        ? "email"
                        : field.type === "date"
                          ? "date"
                          : "text"
                  }
                  value={formData[field.id] || ""}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  error={errors[field.id]}
                />
                {field.type === "select" && field.options && (
                  <select
                    className="mt-2 w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
                    value={formData[field.id] || ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.required}
                  >
                    <option value="">Selecciona una opción</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
                {field.type === "textarea" && (
                  <textarea
                    className="mt-2 w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
                    value={formData[field.id] || ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={4}
                  />
                )}
              </div>
            ))}

            <ZenButton
              type="submit"
              className="w-full"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Enviar solicitud
            </ZenButton>
          </form>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
