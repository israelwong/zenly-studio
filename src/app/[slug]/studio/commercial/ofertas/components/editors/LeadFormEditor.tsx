"use client";

import { useState } from "react";
import {
  ZenInput,
  ZenTextarea,
  ZenSwitch,
  ZenButton,
} from "@/components/ui/zen";
import { useOfferEditor } from "../OfferEditorContext";
import { EventTypesManager } from "@/components/shared/tipos-evento";
import { useParams } from "next/navigation";

export function LeadFormEditor() {
  const { leadformData, updateLeadformData } = useOfferEditor();
  const params = useParams();
  const studioSlug = params.slug as string;

  return (
    <div className="space-y-6">
      {/* Campos básicos info */}
      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <h4 className="text-sm font-medium text-zinc-300 mb-2">
          Campos básicos (siempre incluidos)
        </h4>
        <ul className="text-sm text-zinc-500 space-y-1">
          <li>✓ Nombre completo (requerido)</li>
          <li>✓ Teléfono (requerido)</li>
          <li>✓ Email (opcional)</li>
        </ul>
      </div>

      {/* Título y descripción */}
      <div className="space-y-4">
        <ZenInput
          label="Título del Formulario"
          value={leadformData.title}
          onChange={(e) => updateLeadformData({ title: e.target.value })}
          placeholder="Solicita información"
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-zinc-300">
              Descripción
            </span>
            <span className="text-xs text-zinc-500">
              {leadformData.description?.length || 0}/120
            </span>
          </div>
          <textarea
            value={leadformData.description}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 120) {
                updateLeadformData({ description: value });
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
              checked={leadformData.email_required}
              onCheckedChange={(checked) =>
                updateLeadformData({ email_required: checked })
              }
              label="Email requerido"
            />
          </div>

          {/* Tipos de Evento */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
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
              selectedTypes={leadformData.selected_event_type_ids || []}
              onChange={(types) => updateLeadformData({ selected_event_type_ids: types })}
            />

            {/* Feature: Mostrar paquetes después de registro */}
            {leadformData.selected_event_type_ids &&
              leadformData.selected_event_type_ids.length > 0 && (
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
                    checked={leadformData.show_packages_after_submit || false}
                    onCheckedChange={(checked) =>
                      updateLeadformData({ show_packages_after_submit: checked })
                    }
                    label="Mostrar paquetes relacionados"
                  />

                  {leadformData.show_packages_after_submit && (
                    <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                      <p className="text-xs text-blue-300">
                        ℹ️ El prospecto verá los paquetes disponibles según el tipo de evento seleccionado.
                        Si el tipo no tiene paquetes, se mostrará un mensaje indicándolo.
                      </p>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Fecha de interés */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ZenSwitch
                checked={leadformData.enable_interest_date}
                onCheckedChange={(checked) =>
                  updateLeadformData({ enable_interest_date: checked })
                }
                label="Solicitar fecha de interés"
              />
            </div>

            {leadformData.enable_interest_date && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <ZenSwitch
                    checked={leadformData.validate_with_calendar}
                    onCheckedChange={(checked) =>
                      updateLeadformData({ validate_with_calendar: checked })
                    }
                    label="Validar fecha de interés con agenda"
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  {leadformData.validate_with_calendar
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
          value={leadformData.success_message}
          onChange={(e) =>
            updateLeadformData({ success_message: e.target.value })
          }
          rows={2}
        />

        <ZenInput
          label="URL de Redirección (opcional)"
          value={leadformData.success_redirect_url}
          onChange={(e) =>
            updateLeadformData({ success_redirect_url: e.target.value })
          }
          placeholder="https://..."
        />
      </div>
    </div>
  );
}
