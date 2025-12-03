"use client";

import { useState } from "react";
import {
  ZenInput,
  ZenTextarea,
  ZenSwitch,
  ZenButton,
  ZenBadge,
} from "@/components/ui/zen";
import { useOfferEditor } from "../OfferEditorContext";
import { Plus, Trash2 } from "lucide-react";
import { LeadFormField } from "@/lib/actions/schemas/offer-schemas";
import { toast } from "sonner";
import cuid from "cuid";

export function LeadFormEditor() {
  const { leadformData, updateLeadformData } = useOfferEditor();

  const [newField, setNewField] = useState<Partial<LeadFormField>>({
    type: "text",
    label: "",
    required: false,
  });
  const [newSubject, setNewSubject] = useState("");
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);

  const handleAddField = () => {
    if (!newField.label || !newField.type) {
      toast.error("Completa el tipo y la etiqueta del campo");
      return;
    }

    const field: LeadFormField = {
      id: cuid(),
      type: newField.type as LeadFormField["type"],
      label: newField.label,
      required: newField.required || false,
      placeholder: newField.placeholder,
      options: newField.type === "select" ? newField.options : undefined,
    };

    updateLeadformData({
      fields_config: {
        fields: [...leadformData.fields_config.fields, field],
      },
    });

    setNewField({ type: "text", label: "", required: false });
    setShowFieldForm(false);
    toast.success("Campo agregado");
  };

  const handleRemoveField = (id: string) => {
    updateLeadformData({
      fields_config: {
        fields: leadformData.fields_config.fields.filter((f) => f.id !== id),
      },
    });
    toast.success("Campo eliminado");
  };

  const handleAddSubject = () => {
    if (!newSubject.trim()) {
      toast.error("Escribe una opción de asunto");
      return;
    }

    const subjects = leadformData.subject_options || [];
    if (subjects.includes(newSubject.trim())) {
      toast.error("Esta opción ya existe");
      return;
    }

    updateLeadformData({
      subject_options: [...subjects, newSubject.trim()],
    });

    setNewSubject("");
    setShowSubjectForm(false);
    toast.success("Opción de asunto agregada");
  };

  const handleRemoveSubject = (subject: string) => {
    updateLeadformData({
      subject_options: (leadformData.subject_options || []).filter(
        (s) => s !== subject
      ),
    });
    toast.success("Opción eliminada");
  };

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

        <ZenTextarea
          label="Descripción"
          value={leadformData.description}
          onChange={(e) => updateLeadformData({ description: e.target.value })}
          placeholder="Completa el formulario para obtener más información"
          rows={2}
        />
      </div>

      {/* Asunto personalizable */}
      <div className="border-t border-zinc-800 pt-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-zinc-300">
            Opciones de Asunto
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            El usuario podrá seleccionar el motivo de su consulta
          </p>
        </div>

        {leadformData.subject_options && leadformData.subject_options.length > 0 && (
          <div className="space-y-2 mb-3">
            {leadformData.subject_options.map((subject, index) => (
              <div
                key={index}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center justify-between"
              >
                <span className="text-sm text-zinc-300">{subject}</span>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSubject(subject)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </ZenButton>
              </div>
            ))}
          </div>
        )}

        {!showSubjectForm ? (
          <ZenButton
            variant="outline"
            size="sm"
            onClick={() => setShowSubjectForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar Opción
          </ZenButton>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
            <ZenInput
              label="Opción de asunto"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Ej: Cotización de sesión"
            />
            <div className="flex gap-2">
              <ZenButton onClick={handleAddSubject} size="sm">
                Agregar
              </ZenButton>
              <ZenButton
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSubjectForm(false);
                  setNewSubject("");
                }}
              >
                Cancelar
              </ZenButton>
            </div>
          </div>
        )}
      </div>

      {/* Fecha de interés */}
      <div className="border-t border-zinc-800 pt-4">
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
            <div className="ml-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <div className="flex items-center gap-3">
                <ZenSwitch
                  checked={leadformData.validate_with_calendar}
                  onCheckedChange={(checked) =>
                    updateLeadformData({ validate_with_calendar: checked })
                  }
                  label="Validar con agenda"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {leadformData.validate_with_calendar
                  ? "Solo se mostrarán fechas disponibles en tu agenda"
                  : "El usuario podrá seleccionar cualquier fecha"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Campos personalizados */}
      <div className="border-t border-zinc-800 pt-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-zinc-300">
            Campos Personalizados
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Agrega campos adicionales según tus necesidades
          </p>
        </div>

        {leadformData.fields_config.fields.length > 0 && (
          <div className="space-y-2 mb-3">
            {leadformData.fields_config.fields.map((field) => (
              <div
                key={field.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-300">
                      {field.label}
                    </span>
                    <ZenBadge variant="secondary" size="sm">
                      {field.type}
                    </ZenBadge>
                    {field.required && (
                      <ZenBadge variant="destructive" size="sm">
                        Requerido
                      </ZenBadge>
                    )}
                  </div>
                </div>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveField(field.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </ZenButton>
              </div>
            ))}
          </div>
        )}

        {!showFieldForm ? (
          <ZenButton
            variant="outline"
            size="sm"
            onClick={() => setShowFieldForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar Campo
          </ZenButton>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Tipo de Campo
              </label>
              <select
                value={newField.type}
                onChange={(e) =>
                  setNewField((prev) => ({
                    ...prev,
                    type: e.target.value as LeadFormField["type"],
                  }))
                }
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
              >
                <option value="text">Texto</option>
                <option value="textarea">Área de Texto</option>
                <option value="email">Email</option>
                <option value="phone">Teléfono</option>
                <option value="select">Select</option>
                <option value="date">Fecha</option>
              </select>
            </div>

            <ZenInput
              label="Etiqueta"
              value={newField.label || ""}
              onChange={(e) =>
                setNewField((prev) => ({ ...prev, label: e.target.value }))
              }
              placeholder="Ej: Mensaje adicional"
            />

            <ZenInput
              label="Placeholder (opcional)"
              value={newField.placeholder || ""}
              onChange={(e) =>
                setNewField((prev) => ({
                  ...prev,
                  placeholder: e.target.value,
                }))
              }
              placeholder="Texto de ayuda"
            />

            {newField.type === "select" && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Opciones (una por línea)
                </label>
                <textarea
                  value={newField.options?.join("\n") || ""}
                  onChange={(e) =>
                    setNewField((prev) => ({
                      ...prev,
                      options: e.target.value
                        .split("\n")
                        .filter((opt) => opt.trim()),
                    }))
                  }
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
                  rows={4}
                  placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <ZenSwitch
                checked={newField.required || false}
                onCheckedChange={(checked) =>
                  setNewField((prev) => ({ ...prev, required: checked }))
                }
                label="Campo Requerido"
              />
            </div>

            <div className="flex gap-2">
              <ZenButton onClick={handleAddField} size="sm">
                Agregar Campo
              </ZenButton>
              <ZenButton
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowFieldForm(false);
                  setNewField({ type: "text", label: "", required: false });
                }}
              >
                Cancelar
              </ZenButton>
            </div>
          </div>
        )}
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
