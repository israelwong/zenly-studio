"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ZenButton, ZenInput, ZenBadge, ZenCalendar, type ZenCalendarProps } from "@/components/ui/zen";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/shadcn/popover";
import { checkDateAvailability } from "@/lib/actions/studio/offers/offer-availability.actions";
import { validatePhoneBeforeSubmit, validateEmailBeforeSubmit } from "@/lib/actions/studio/offers/offer-submissions.actions";
import { LeadFormFieldsConfig, LeadFormField } from "@/lib/actions/schemas/offer-schemas";
import { formatDisplayDate } from "@/lib/utils/date-formatter";
import { Loader2, CalendarIcon, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

// Tipo específico para ZenCalendar con mode="single"
type ZenCalendarSingleProps = Omit<ZenCalendarProps, 'mode' | 'selected' | 'onSelect'> & {
  mode: 'single';
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
};

export interface OfferLeadFormFieldsProps {
  fieldsConfig: LeadFormFieldsConfig;
  emailRequired?: boolean;
  enableInterestDate?: boolean;
  validateWithCalendar?: boolean;
  enableEventName?: boolean; // Solicitar nombre del evento
  eventNameRequired?: boolean; // Nombre del evento obligatorio
  enableEventDuration?: boolean; // Solicitar horas de cobertura
  eventDurationRequired?: boolean; // Horas de cobertura obligatorias
  eventTypeId?: string | null;
  eventTypeName?: string | null; // Nombre del tipo de evento para placeholder dinámico
  studioId: string;
  studioSlug: string; // ✅ NUEVO: Para validación de teléfono
  isPreview?: boolean;
  onSubmit: (data: {
    name: string;
    phone: string;
    email: string;
    interest_date?: string;
    event_name?: string;
    event_type_id?: string | null;
  }) => Promise<void> | void;
  onSuccess?: () => void; // Callback opcional después de submit exitoso
  initialData?: Record<string, string>;
  submitLabel?: string;
  isPreparingPackages?: boolean;
  preparingMessage?: string;
}

/**
 * Componente compartido de campos de formulario para ofertas
 * Contiene solo la lógica del formulario sin tracking, cover ni redirección
 */
export function OfferLeadFormFields({
  fieldsConfig,
  emailRequired = false,
  enableInterestDate = false,
  validateWithCalendar = false,
  enableEventName = false,
  eventNameRequired = false,
  enableEventDuration = false,
  eventDurationRequired = false,
  eventTypeId,
  eventTypeName,
  studioId,
  studioSlug,
  isPreview = false,
  onSubmit,
  onSuccess,
  initialData = {},
  submitLabel = "Solicitar información",
  isPreparingPackages = false,
  preparingMessage = "Preparando información de paquetes disponibles para tu revisión...",
}: OfferLeadFormFieldsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phoneConflict, setPhoneConflict] = useState<{
    type: 'phone_different_email' | 'duplicate_request';
    existingEmail?: string;
    existingDate?: string;
  } | null>(null);
  const [emailConflict, setEmailConflict] = useState<{
    type: 'email_different_phone';
    existingPhone?: string;
  } | null>(null);
  const [dateAvailability, setDateAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
  }>({ checking: false, available: null });
  const [pastDateAlert, setPastDateAlert] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

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

  // Función para obtener placeholder según tipo de evento
  const getEventNamePlaceholder = (): string => {
    if (!eventTypeName) {
      return "Nombre del/los festejado(s)";
    }
    const eventTypeLower = eventTypeName.toLowerCase();
    if (eventTypeLower.includes('boda') || eventTypeLower.includes('matrimonio')) {
      return "Nombre de los novios (Ej: Ana y Juan)";
    }
    if (eventTypeLower.includes('xv') || eventTypeLower.includes('quince') || eventTypeLower.includes('15')) {
      return "Nombre de la festejada";
    }
    return "Nombre del/los festejado(s)";
  };

  // Agregar campo de nombre del evento si está habilitado
  if (enableEventName) {
    basicFields.push({
      id: "event_name",
      type: "text",
      label: "Nombre del evento",
      required: eventNameRequired,
      placeholder: getEventNamePlaceholder(),
    });
  }

  // Agregar campo de horas de cobertura si está habilitado
  if (enableEventDuration) {
    basicFields.push({
      id: "event_duration",
      type: "number",
      label: "Tiempo de cobertura (horas)",
      required: eventDurationRequired,
      placeholder: "Ej: 6",
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
        const cleanPhone = value.replace(/\D/g, "");
        if (cleanPhone.length !== 10) {
          newErrors[field.id] = "El teléfono debe tener exactamente 10 dígitos";
        } else if (!/^\d{10}$/.test(cleanPhone)) {
          newErrors[field.id] = "El teléfono solo debe contener números";
        }
      }

      if (value && field.type === "number") {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue <= 0) {
          newErrors[field.id] = "La duración debe ser un número positivo";
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

    setIsSubmitting(true);
    setPhoneConflict(null); // Limpiar conflictos previos
    setEmailConflict(null); // Limpiar conflictos de email previos

    try {
      const cleanPhone = formData.phone.replace(/\D/g, "");

      // Validar teléfono antes de enviar
      const phoneValidation = await validatePhoneBeforeSubmit(
        studioSlug,
        cleanPhone,
        formData.email || undefined,
        formData.interest_date || undefined
      );

      if (!phoneValidation.success && phoneValidation.conflict) {
        setPhoneConflict(phoneValidation.conflict);
        setIsSubmitting(false);
        return;
      }

      // Validar email si está presente
      if (formData.email) {
        const emailValidation = await validateEmailBeforeSubmit(
          studioSlug,
          formData.email,
          cleanPhone
        );

        if (!emailValidation.success && emailValidation.conflict) {
          setEmailConflict(emailValidation.conflict);
          setIsSubmitting(false);
          return;
        }
      }

      await onSubmit({
        name: formData.name,
        phone: cleanPhone,
        email: formData.email || "",
        interest_date: formData.interest_date,
        event_name: formData.event_name || undefined,
        event_duration: formData.event_duration || undefined,
        event_type_id: eventTypeId,
      });

      // Si es preview, limpiar el formulario después del submit exitoso
      if (isPreview) {
        setFormData(initialData);
        setErrors({});
        setPhoneConflict(null);
        setEmailConflict(null);
        setDateAvailability({ checking: false, available: null });
        setPastDateAlert(false);
      }

      // Llamar callback de éxito si existe
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("[OfferLeadFormFields] Error:", error);
      toast.error("Error al enviar el formulario. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Alert de fecha pasada */}
      {pastDateAlert && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-400 mb-1">
                Fecha no disponible
              </h4>
              <p className="text-sm text-zinc-300">
                La fecha seleccionada ya ha pasado. Por favor, elige una fecha futura para tu evento.
              </p>
              <ZenButton
                size="sm"
                variant="ghost"
                onClick={() => setPastDateAlert(false)}
                className="mt-3"
              >
                Entendido
              </ZenButton>
            </div>
          </div>
        </div>
      )}

      {/* Alerts de conflicto */}
      {phoneConflict && (
        <div className="space-y-3">
          {phoneConflict.type === 'phone_different_email' ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-400 mb-1">
                    Verifica tu número
                  </h4>
                  <p className="text-sm text-zinc-300">
                    El número de teléfono que ingresaste está registrado con el correo{" "}
                    <span className="font-semibold">{phoneConflict.existingEmail}</span>.
                  </p>
                  <p className="text-sm text-zinc-400 mt-2">
                    ¿El número ingresado es correcto? Si es así, usa el mismo correo electrónico asociado.
                  </p>
                  <ZenButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setPhoneConflict(null)}
                    className="mt-3"
                  >
                    Corregir datos
                  </ZenButton>
                </div>
              </div>
            </div>
          ) : phoneConflict.type === 'duplicate_request' ? (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-400 mb-1">
                    Solicitud duplicada
                  </h4>
                  <p className="text-sm text-zinc-300">
                    Ya has solicitado información para esta fecha{phoneConflict.existingDate && ` (${formatDisplayDate(phoneConflict.existingDate)})`}.
                  </p>
                  <p className="text-sm text-zinc-400 mt-2">
                    Te contactaremos lo antes posible. Si necesitas información para otra fecha, selecciona una diferente.
                  </p>
                  <ZenButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setPhoneConflict(null)}
                    className="mt-3"
                  >
                    Cambiar fecha
                  </ZenButton>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Alert de conflicto de email */}
      {emailConflict && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-400 mb-1">
                Verifica tu correo electrónico
              </h4>
              <p className="text-sm text-zinc-300">
                El email que ingresaste está registrado con el número{" "}
                <span className="font-semibold">{emailConflict.existingPhone}</span>.
              </p>
              <p className="text-sm text-zinc-400 mt-2">
                ¿El email ingresado es correcto? Si es así, usa el mismo número de teléfono asociado.
              </p>
              <ZenButton
                size="sm"
                variant="ghost"
                onClick={() => setEmailConflict(null)}
                className="mt-3"
              >
                Corregir datos
              </ZenButton>
            </div>
          </div>
        </div>
      )}

      {allFields.map((field) => (
        <div key={field.id}>
          {/* Campo de fecha con ZenCalendar */}
          {field.type === "date" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 block mb-2">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <ZenButton
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${!formData[field.id] && "text-zinc-500"
                      } ${errors[field.id] && "border-red-500"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData[field.id]
                      ? (() => {
                        // Parsear fecha usando UTC para evitar problemas de zona horaria
                        const [year, month, day] = formData[field.id].split('-');
                        // Crear fecha usando UTC con mediodía como buffer
                        const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
                        return format(utcDate, "PPP", { locale: es });
                      })()
                      : field.placeholder || "Selecciona una fecha"}
                  </ZenButton>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <ZenCalendar
                    mode="single"
                    selected={formData[field.id] ? (() => {
                      // Parsear fecha usando UTC para evitar problemas de zona horaria
                      const [year, month, day] = formData[field.id].split('-');
                      // Crear fecha usando UTC con mediodía como buffer
                      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
                    })() : undefined}
                    onSelect={(date: Date | undefined) => {
                      if (date) {
                        // Verificar si es fecha pasada usando UTC
                        const todayUtc = new Date();
                        todayUtc.setUTCHours(12, 0, 0, 0);
                        const selectedDateUtc = new Date(Date.UTC(
                          date.getUTCFullYear(),
                          date.getUTCMonth(),
                          date.getUTCDate(),
                          12, 0, 0
                        ));

                        // Comparar solo fechas (sin hora) usando UTC
                        const todayDateOnly = new Date(Date.UTC(
                          todayUtc.getUTCFullYear(),
                          todayUtc.getUTCMonth(),
                          todayUtc.getUTCDate()
                        ));
                        const selectedDateOnly = new Date(Date.UTC(
                          selectedDateUtc.getUTCFullYear(),
                          selectedDateUtc.getUTCMonth(),
                          selectedDateUtc.getUTCDate()
                        ));

                        if (selectedDateOnly < todayDateOnly) {
                          setPastDateAlert(true);
                          return;
                        }

                        // Formatear fecha usando métodos UTC para evitar offset
                        const year = date.getUTCFullYear();
                        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                        const day = String(date.getUTCDate()).padStart(2, '0');
                        const dateString = `${year}-${month}-${day}`;

                        handleInputChange(field.id, dateString);
                        setPastDateAlert(false);
                        setDatePopoverOpen(false); // Cerrar popover
                      }
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    initialFocus={true}
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
                    : field.type === "number"
                      ? "number"
                      : "text"
              }
              value={formData[field.id] || ""}
              onChange={(e) => {
                // Si es teléfono, filtrar solo dígitos
                if (field.type === "phone") {
                  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                  handleInputChange(field.id, digitsOnly);
                } else if (field.type === "number") {
                  // Solo permitir números positivos
                  const numValue = e.target.value.replace(/\D/g, "");
                  handleInputChange(field.id, numValue);
                } else {
                  handleInputChange(field.id, e.target.value);
                }
              }}
              placeholder={field.placeholder}
              required={field.required}
              error={errors[field.id]}
              maxLength={field.type === "phone" ? 10 : undefined}
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

      {isPreparingPackages && (
        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
            <p className="text-sm text-blue-300">{preparingMessage}</p>
          </div>
        </div>
      )}
      {!isPreparingPackages && (
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
          {submitLabel}
        </ZenButton>
      )}
    </form>
  );
}
