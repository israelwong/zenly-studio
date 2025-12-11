"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ZenButton, ZenInput, ZenBadge, ZenCalendar, type ZenCalendarProps } from "@/components/ui/zen";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/shadcn/popover";
import { checkDateAvailability } from "@/lib/actions/studio/offers/offer-availability.actions";
import { LeadFormFieldsConfig, LeadFormField } from "@/lib/actions/schemas/offer-schemas";
import { Loader2, CalendarIcon } from "lucide-react";
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
  eventTypeId?: string | null;
  studioId: string;
  isPreview?: boolean;
  onSubmit: (data: {
    name: string;
    phone: string;
    email: string;
    interest_date?: string;
  }) => Promise<void> | void;
  initialData?: Record<string, string>;
  submitLabel?: string;
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
  studioId,
  isPreview = false,
  onSubmit,
  initialData = {},
  submitLabel = "Enviar solicitud",
}: OfferLeadFormFieldsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dateAvailability, setDateAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
  }>({ checking: false, available: null });

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

    // Si es preview, solo validar
    if (isPreview) {
      toast.success("Preview: Formulario validado correctamente");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || "",
        interest_date: formData.interest_date,
      });
    } catch (error) {
      console.error("[OfferLeadFormFields] Error:", error);
      toast.error("Error al enviar el formulario. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
                    mode="single"
                    selected={formData[field.id] ? new Date(formData[field.id]) : undefined}
                    onSelect={(date: Date | undefined) => {
                      if (date) {
                        const dateString = format(date, "yyyy-MM-dd");
                        handleInputChange(field.id, dateString);
                      }
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
        {submitLabel}
      </ZenButton>
    </form>
  );
}
