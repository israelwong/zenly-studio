"use client";

import {
  ZenInput,
  ZenTextarea,
  ZenSwitch,
} from "@/components/ui/zen";
import { EventTypesManager, TipoEventoSelector } from "@/components/shared/tipos-evento";

export interface LeadFormConfig {
  title: string;
  description: string;
  email_required: boolean;
  event_type_id?: string | null; // Para OFERTAS: UN tipo de evento (single)
  selected_event_type_ids?: string[]; // Para LEADFORMS GENÉRICOS: múltiples tipos (array)
  show_packages_after_submit?: boolean;
  enable_interest_date: boolean;
  validate_with_calendar: boolean;
  success_message: string;
  success_redirect_url: string;
}

interface LeadFormEditorProps {
  studioSlug: string;
  formData: LeadFormConfig;
  onUpdate: (updates: Partial<LeadFormConfig>) => void;
  mode?: "single" | "multiple"; // single: ofertas (UN tipo), multiple: leadforms genéricos (múltiples)
}

export function LeadFormEditor({
  studioSlug,
  formData,
  onUpdate,
  mode = "single" // Default: ofertas (un tipo de evento)
}: LeadFormEditorProps) {
  return (
    <div className="space-y-6">
      {/* Campos básicos info */}
      {/* Título y descripción */}
      <div className="space-y-4">
        <ZenInput
          label="Título del Formulario"
          value={formData.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Solicita información"
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-zinc-300">
              Descripción
            </span>
            <span className="text-xs text-zinc-500">
              {formData.description?.length || 0}/120
            </span>
          </div>
          <textarea
            value={formData.description}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 120) {
                onUpdate({ description: value });
              }
            }}
            placeholder="Completa el formulario para obtener más información"
            rows={2}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-all duration-200 outline-none focus:ring-[3px] focus:border-zinc-600 focus:ring-zinc-500/20 resize-none"
          />
        </div>
      </div>

      {/* Personalización del formulario */}
      <div className="border-t border-zinc-800 pt-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-zinc-300">
            Personalización
          </h3>
        </div>
        <div className="space-y-4">
          {/* Email requerido */}
          <div className="flex items-center gap-3">
            <ZenSwitch
              checked={formData.email_required}
              onCheckedChange={(checked) =>
                onUpdate({ email_required: checked })
              }
              label="Email requerido"
            />
          </div>

          {/* Tipos de Evento */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            {mode === "single" ? (
              <>
                {/* Modo SINGLE: Para ofertas - UN tipo de evento */}
                <TipoEventoSelector
                  studioSlug={studioSlug}
                  selectedEventTypeId={formData.event_type_id || null}
                  onChange={(eventTypeId) => onUpdate({ event_type_id: eventTypeId })}
                  label="Tipo de Evento"
                  hint="Asocia esta oferta a un tipo de evento específico"
                  showBadge={false}
                />

                {/* Feature: Mostrar paquetes después de registro */}
                {formData.event_type_id && (
                  <div className="border-t border-zinc-800 pt-4 mt-4">
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-zinc-300">
                        Después de registrarse
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1">
                        Opcional: Mostrar paquetes del tipo de evento asociado
                      </p>
                    </div>

                    <ZenSwitch
                      checked={formData.show_packages_after_submit || false}
                      onCheckedChange={(checked) =>
                        onUpdate({ show_packages_after_submit: checked })
                      }
                      label="Mostrar paquetes relacionados"
                    />

                    {formData.show_packages_after_submit && (
                      <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                        <p className="text-xs text-blue-300">
                          ℹ️ El prospecto verá los paquetes disponibles del tipo de evento asociado.
                          Si no hay paquetes, se mostrará un mensaje indicándolo.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Modo MULTIPLE: Para leadforms genéricos - múltiples tipos */}
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-zinc-300">
                    Tipos de Evento
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    El usuario seleccionará el tipo de evento que le interesa
                  </p>
                </div>

                <EventTypesManager
                  studioSlug={studioSlug}
                  selectedTypes={formData.selected_event_type_ids || []}
                  onChange={(types) => onUpdate({ selected_event_type_ids: types })}
                />

                {/* Feature: Mostrar paquetes después de registro */}
                {formData.selected_event_type_ids &&
                  formData.selected_event_type_ids.length > 0 && (
                    <div className="border-t border-zinc-800 pt-4 mt-4">
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-zinc-300">
                          Después de registrarse
                        </h4>
                        <p className="text-xs text-zinc-500 mt-1">
                          Opcional: Mostrar paquetes del tipo de evento seleccionado
                        </p>
                      </div>

                      <ZenSwitch
                        checked={formData.show_packages_after_submit || false}
                        onCheckedChange={(checked) =>
                          onUpdate({ show_packages_after_submit: checked })
                        }
                        label="Mostrar paquetes relacionados"
                      />

                      {formData.show_packages_after_submit && (
                        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                          <p className="text-xs text-blue-300">
                            ℹ️ El prospecto verá los paquetes disponibles según el tipo de evento seleccionado.
                            Si el tipo no tiene paquetes, se mostrará un mensaje indicándolo.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
              </>
            )}
          </div>

          {/* Fecha de interés */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ZenSwitch
                checked={formData.enable_interest_date}
                onCheckedChange={(checked) =>
                  onUpdate({ enable_interest_date: checked })
                }
                label="Solicitar fecha de interés"
              />
            </div>

            {formData.enable_interest_date && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <ZenSwitch
                    checked={formData.validate_with_calendar}
                    onCheckedChange={(checked) =>
                      onUpdate({ validate_with_calendar: checked })
                    }
                    label="Validar fecha de interés con agenda"
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  {formData.validate_with_calendar
                    ? "Solo se mostrarán fechas disponibles en tu agenda"
                    : "El usuario podrá seleccionar cualquier fecha"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success */}
      <div className="border-t border-zinc-800 pt-4 space-y-4">
        <ZenTextarea
          label="Mensaje de Éxito"
          value={formData.success_message}
          onChange={(e) =>
            onUpdate({ success_message: e.target.value })
          }
          rows={2}
        />
      </div>
    </div>
  );
}
