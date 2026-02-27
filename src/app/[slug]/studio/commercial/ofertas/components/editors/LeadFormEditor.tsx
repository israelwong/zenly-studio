"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";
import {
  ZenInput,
  ZenTextarea,
  ZenSwitch,
  ZenButton,
} from "@/components/ui/zen";
import { EventTypesManager, TipoEventoSelector } from "@/components/shared/tipos-evento";
import { verificarPaquetesPorTipoEvento } from "@/lib/actions/studio/negocio/paquetes.actions";

export interface LeadFormConfig {
  title: string;
  description: string;
  email_required: boolean;
  selected_event_type_ids?: string[]; // Para LEADFORMS GENÉRICOS: múltiples tipos (array)
  show_packages_after_submit?: boolean;
  enable_interest_date: boolean;
  validate_with_calendar: boolean;
  enable_event_name: boolean; // Solicitar nombre del evento
  event_name_required: boolean; // Nombre del evento obligatorio
  enable_event_duration: boolean; // Solicitar horas de servicio
  event_duration_required: boolean; // Horas de servicio obligatorias
  success_message: string;
  success_redirect_url: string;
}

interface LeadFormEditorProps {
  studioSlug: string;
  formData: LeadFormConfig;
  onUpdate: (updates: Partial<LeadFormConfig>) => void;
  mode?: "single" | "multiple"; // single: ofertas (UN tipo), multiple: leadforms genéricos (múltiples)
  eventTypeId?: string | null; // Para modo single (ofertas): viene de formData del context padre
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
}

export function LeadFormEditor({
  studioSlug,
  formData,
  onUpdate,
  mode = "single", // Default: ofertas (un tipo de evento)
  eventTypeId = null,
  onSave,
  onCancel,
  isSaving = false,
}: LeadFormEditorProps) {
  const router = useRouter();
  const [hasPackages, setHasPackages] = useState<boolean | null>(null);
  const [packagesCount, setPackagesCount] = useState<number>(0);

  // Verificar si el tipo de evento tiene paquetes
  useEffect(() => {
    if (mode === "single" && eventTypeId) {
      verificarPaquetesPorTipoEvento(studioSlug, eventTypeId).then((result) => {
        setHasPackages(result.hasPackages);
        setPackagesCount(result.count);
      });
    } else {
      setHasPackages(null);
      setPackagesCount(0);
    }
  }, [mode, eventTypeId, studioSlug]);

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
          {mode === "multiple" && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              {/* Modo MULTIPLE: Para leadforms genéricos - múltiples tipos de evento */}
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
            </div>
          )}

          {/* Fecha de interés */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="mb-3">
              <h4 className="text-sm font-medium text-zinc-300">
                Fecha de interés
              </h4>
              <p className="text-xs text-zinc-500 mt-1">
                Solicita al prospecto la fecha en que planea su evento
              </p>
            </div>

            <div className="space-y-4">
              <ZenSwitch
                checked={formData.enable_interest_date}
                onCheckedChange={(checked) =>
                  onUpdate({ enable_interest_date: checked })
                }
                label="Solicitar fecha de interés"
              />

              {formData.enable_interest_date && (
                <div className="space-y-2 pl-4 border-l-2 border-zinc-700/50">
                  <ZenSwitch
                    checked={formData.validate_with_calendar}
                    onCheckedChange={(checked) =>
                      onUpdate({ validate_with_calendar: checked })
                    }
                    label="Validar fecha de interés con agenda"
                  />
                  <p className="text-xs text-zinc-500">
                    {formData.validate_with_calendar
                      ? "Solo se mostrarán fechas disponibles en tu agenda"
                      : "El usuario podrá seleccionar cualquier fecha"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Nombre del evento */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="mb-3">
              <h4 className="text-sm font-medium text-zinc-300">
                Nombre del evento
              </h4>
              <p className="text-xs text-zinc-500 mt-1">
                Te ayuda a nombrar el evento desde un principio para estar organizado, sabemos que en ocasiones quien solicita la información no es el festejado (novia, mamá, padrinos)
              </p>
            </div>

            <div className="space-y-4">
              <ZenSwitch
                checked={formData.enable_event_name || false}
                onCheckedChange={(checked) =>
                  onUpdate({ enable_event_name: checked })
                }
                label="Solicitar nombre del evento"
              />

              {formData.enable_event_name && (
                <div className="space-y-2 pl-4 border-l-2 border-zinc-700/50">
                  <ZenSwitch
                    checked={formData.event_name_required || false}
                    onCheckedChange={(checked) =>
                      onUpdate({ event_name_required: checked })
                    }
                    label="Nombre del evento obligatorio"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Duración del evento */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="mb-3">
              <h4 className="text-sm font-medium text-zinc-300">
                Horas de servicio
              </h4>
              <p className="text-xs text-zinc-500 mt-1">
                Solicita las horas totales de cobertura técnica y artística durante el servicio para calcular mejor las cotizaciones y paquetes dinámicos
              </p>
            </div>

            <div className="space-y-4">
              <ZenSwitch
                checked={formData.enable_event_duration || false}
                onCheckedChange={(checked) =>
                  onUpdate({ enable_event_duration: checked })
                }
                label="Solicitar horas de servicio"
              />

              {formData.enable_event_duration && (
                <div className="space-y-2 pl-4 border-l-2 border-zinc-700/50">
                  <ZenSwitch
                    checked={formData.event_duration_required || false}
                    onCheckedChange={(checked) =>
                      onUpdate({ event_duration_required: checked })
                    }
                    label="Horas de servicio obligatorias"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Mostrar paquetes después de registro (modo SINGLE - ofertas) */}
          {mode === "single" && eventTypeId && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
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
                  <div className="flex items-start gap-2">
                    {hasPackages === null ? (
                      <p className="text-xs text-blue-300">
                        ℹ️ Verificando paquetes disponibles...
                      </p>
                    ) : hasPackages ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-300">
                          El prospecto verá {packagesCount} paquete{packagesCount !== 1 ? 's' : ''} disponible{packagesCount !== 1 ? 's' : ''} del tipo de evento asociado después de registrarse.
                        </p>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-300">
                          Este tipo de evento no tiene paquetes asociados. El prospecto verá un mensaje indicando que no hay paquetes disponibles.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success - Solo mostrar si NO se muestran paquetes después del submit */}
      {!formData.show_packages_after_submit && (
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
      )}

      {/* Botones de acción en la parte inferior */}
      <div className="mt-6 pt-6 border-t border-zinc-800 flex items-center justify-end gap-2">
        <ZenButton
          variant="ghost"
          size="md"
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              router.back();
            }
          }}
          disabled={isSaving}
        >
          Cancelar
        </ZenButton>
        <ZenButton
          variant="primary"
          size="md"
          fullWidth
          onClick={async () => {
            if (onSave) {
              await onSave();
            }
          }}
          loading={isSaving}
          disabled={isSaving}
        >
          Actualizar leadform
        </ZenButton>
      </div>
    </div>
  );
}
