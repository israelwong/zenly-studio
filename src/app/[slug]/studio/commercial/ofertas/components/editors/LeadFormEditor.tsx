"use client";

import { useState } from "react";
import {
  ZenInput,
  ZenTextarea,
  ZenSwitch,
  ZenButton,
} from "@/components/ui/zen";
import { useOfferEditor } from "../OfferEditorContext";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export function LeadFormEditor() {
  const { leadformData, updateLeadformData } = useOfferEditor();

  const [newSubject, setNewSubject] = useState("");
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubjectIndex, setEditingSubjectIndex] = useState<number | null>(null);
  const [editingSubjectValue, setEditingSubjectValue] = useState("");

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

  const handleStartEditSubject = (index: number, currentValue: string) => {
    setEditingSubjectIndex(index);
    setEditingSubjectValue(currentValue);
  };

  const handleSaveEditSubject = (index: number) => {
    if (!editingSubjectValue.trim()) {
      toast.error("El asunto no puede estar vacío");
      return;
    }

    const subjects = [...(leadformData.subject_options || [])];
    if (subjects[index] !== editingSubjectValue.trim() && subjects.includes(editingSubjectValue.trim())) {
      toast.error("Esta opción ya existe");
      return;
    }

    subjects[index] = editingSubjectValue.trim();
    updateLeadformData({
      subject_options: subjects,
    });

    setEditingSubjectIndex(null);
    setEditingSubjectValue("");
    toast.success("Opción actualizada");
  };

  const handleCancelEditSubject = () => {
    setEditingSubjectIndex(null);
    setEditingSubjectValue("");
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-300">
              Descripción
            </label>
            <span className="text-xs text-zinc-500">
              {leadformData.description?.length || 0}/120
            </span>
          </div>
          <ZenTextarea
            value={leadformData.description}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 120) {
                updateLeadformData({ description: value });
              }
            }}
            placeholder="Completa el formulario para obtener más información"
            rows={2}
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

          {/* Asunto personalizable */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
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
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex items-center gap-2"
                  >
                    {editingSubjectIndex === index ? (
                      <>
                        <input
                          type="text"
                          value={editingSubjectValue}
                          onChange={(e) => setEditingSubjectValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveEditSubject(index);
                            } else if (e.key === "Escape") {
                              handleCancelEditSubject();
                            }
                          }}
                          className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          autoFocus
                        />
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveEditSubject(index)}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          Guardar
                        </ZenButton>
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEditSubject}
                          className="text-zinc-400 hover:text-zinc-300"
                        >
                          Cancelar
                        </ZenButton>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-zinc-300">{subject}</span>
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEditSubject(index, subject)}
                          className="text-zinc-400 hover:text-zinc-300"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </ZenButton>
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSubject(subject)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ZenButton>
                      </>
                    )}
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
