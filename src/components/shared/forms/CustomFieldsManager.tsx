"use client";

import { useState } from "react";
import {
  ZenInput,
  ZenSwitch,
  ZenButton,
  ZenBadge,
} from "@/components/ui/zen";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import cuid from "cuid";

/**
 * CustomFieldsManager
 * 
 * Componente reutilizable para gestionar campos personalizados en formularios.
 * Omitido temporalmente del LeadForm para simplificar y maximizar conversión.
 * 
 * @future Puede integrarse en otros módulos que requieran campos dinámicos:
 * - ZEN Events (campos de registro personalizados)
 * - ZEN Contracts (cláusulas personalizadas)
 * - ZEN Surveys (encuestas dinámicas)
 * 
 * @example
 * ```tsx
 * <CustomFieldsManager
 *   fields={formData.custom_fields}
 *   onChange={(fields) => setFormData({ custom_fields: fields })}
 *   allowedTypes={['text', 'textarea', 'select', 'number']}
 *   maxFields={5}
 * />
 * ```
 */

export type CustomFieldType = "text" | "textarea" | "select" | "number" | "date" | "email" | "tel";

export interface CustomField {
  id: string;
  type: CustomFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // Para type="select"
}

interface CustomFieldsManagerProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  allowedTypes?: CustomFieldType[];
  maxFields?: number;
  showTitle?: boolean;
  title?: string;
  description?: string;
}

export function CustomFieldsManager({
  fields,
  onChange,
  allowedTypes = ["text", "textarea", "select"],
  maxFields,
  showTitle = true,
  title = "Campos Personalizados",
  description = "Agrega campos adicionales según tus necesidades",
}: CustomFieldsManagerProps) {
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [newField, setNewField] = useState<Partial<CustomField>>({
    type: "text",
    label: "",
    required: false,
  });
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldData, setEditingFieldData] = useState<Partial<CustomField>>({});
  const [editingFieldOption, setEditingFieldOption] = useState<{ fieldId: string; index: number } | null>(null);
  const [editingFieldOptionValue, setEditingFieldOptionValue] = useState("");
  const [newFieldOption, setNewFieldOption] = useState("");
  const [showFieldOptionForm, setShowFieldOptionForm] = useState<string | null>(null);
  const [showNewFieldOptionForm, setShowNewFieldOptionForm] = useState(false);
  const [newFieldOptionValue, setNewFieldOptionValue] = useState("");

  const handleAddField = () => {
    if (!newField.label || !newField.type) {
      toast.error("Completa el tipo y la etiqueta del campo");
      return;
    }

    if (maxFields && fields.length >= maxFields) {
      toast.error(`Máximo ${maxFields} campos personalizados permitidos`);
      return;
    }

    const field: CustomField = {
      id: cuid(),
      type: newField.type as CustomFieldType,
      label: newField.label,
      required: newField.required || false,
      placeholder: newField.placeholder,
      options: newField.type === "select" ? newField.options : undefined,
    };

    onChange([...fields, field]);
    setNewField({ type: "text", label: "", required: false });
    setShowFieldForm(false);
    toast.success("Campo agregado");
  };

  const handleRemoveField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
    toast.success("Campo eliminado");
  };

  const handleStartEditField = (field: CustomField) => {
    setEditingFieldId(field.id);
    setEditingFieldData({ ...field });
  };

  const handleSaveEditField = () => {
    if (!editingFieldData.label || !editingFieldData.type) {
      toast.error("Completa el tipo y la etiqueta del campo");
      return;
    }

    onChange(
      fields.map((f) =>
        f.id === editingFieldId ? { ...editingFieldData } as CustomField : f
      )
    );

    setEditingFieldId(null);
    setEditingFieldData({});
    toast.success("Campo actualizado");
  };

  const handleCancelEditField = () => {
    setEditingFieldId(null);
    setEditingFieldData({});
  };

  const handleStartEditFieldOption = (fieldId: string, index: number, currentValue: string) => {
    setEditingFieldOption({ fieldId, index });
    setEditingFieldOptionValue(currentValue);
  };

  const handleSaveEditFieldOption = () => {
    if (!editingFieldOption || !editingFieldOptionValue.trim()) {
      toast.error("La opción no puede estar vacía");
      return;
    }

    const field = fields.find((f) => f.id === editingFieldOption.fieldId);
    if (!field || !field.options) return;

    const updatedOptions = [...field.options];
    if (updatedOptions[editingFieldOption.index] !== editingFieldOptionValue.trim() && updatedOptions.includes(editingFieldOptionValue.trim())) {
      toast.error("Esta opción ya existe");
      return;
    }

    updatedOptions[editingFieldOption.index] = editingFieldOptionValue.trim();

    onChange(
      fields.map((f) =>
        f.id === editingFieldOption.fieldId ? { ...f, options: updatedOptions } : f
      )
    );

    setEditingFieldOption(null);
    setEditingFieldOptionValue("");
    toast.success("Opción actualizada");
  };

  const handleCancelEditFieldOption = () => {
    setEditingFieldOption(null);
    setEditingFieldOptionValue("");
  };

  const handleAddFieldOption = (fieldId: string) => {
    if (!newFieldOption.trim()) {
      toast.error("Escribe una opción");
      return;
    }

    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    const currentOptions = field.options || [];
    if (currentOptions.includes(newFieldOption.trim())) {
      toast.error("Esta opción ya existe");
      return;
    }

    const updatedOptions = [...currentOptions, newFieldOption.trim()];
    onChange(
      fields.map((f) =>
        f.id === fieldId ? { ...f, options: updatedOptions } : f
      )
    );

    setNewFieldOption("");
    setShowFieldOptionForm(null);
    toast.success("Opción agregada");
  };

  const handleRemoveFieldOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;

    const updatedOptions = field.options.filter((_, i) => i !== optionIndex);
    onChange(
      fields.map((f) =>
        f.id === fieldId ? { ...f, options: updatedOptions } : f
      )
    );
  };

  const getFieldTypeLabel = (type: CustomFieldType) => {
    const labels: Record<CustomFieldType, string> = {
      text: "Texto",
      textarea: "Área de Texto",
      select: "Select",
      number: "Número",
      date: "Fecha",
      email: "Email",
      tel: "Teléfono",
    };
    return labels[type] || type;
  };

  return (
    <div className="border-t border-zinc-800 pt-4">
      {showTitle && (
        <div className="mb-3">
          <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
          {description && (
            <p className="text-xs text-zinc-500 mt-1">{description}</p>
          )}
          {maxFields && (
            <p className="text-xs text-zinc-400 mt-1">
              {fields.length}/{maxFields} campos usados
            </p>
          )}
        </div>
      )}

      {fields.length > 0 && (
        <div className="space-y-3 mb-3">
          {fields.map((field) => (
            <div
              key={field.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-3"
            >
              {editingFieldId === field.id ? (
                <>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">
                        Tipo de Campo
                      </label>
                      <select
                        value={editingFieldData.type}
                        onChange={(e) =>
                          setEditingFieldData((prev) => ({
                            ...prev,
                            type: e.target.value as CustomFieldType,
                          }))
                        }
                        className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300"
                      >
                        {allowedTypes.map((type) => (
                          <option key={type} value={type}>
                            {getFieldTypeLabel(type)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <ZenInput
                      label="Etiqueta"
                      value={editingFieldData.label || ""}
                      onChange={(e) =>
                        setEditingFieldData((prev) => ({
                          ...prev,
                          label: e.target.value,
                        }))
                      }
                      size="sm"
                    />
                    <ZenInput
                      label="Placeholder (opcional)"
                      value={editingFieldData.placeholder || ""}
                      onChange={(e) =>
                        setEditingFieldData((prev) => ({
                          ...prev,
                          placeholder: e.target.value,
                        }))
                      }
                      size="sm"
                    />
                    <div className="flex items-center gap-2">
                      <ZenSwitch
                        checked={editingFieldData.required || false}
                        onCheckedChange={(checked) =>
                          setEditingFieldData((prev) => ({
                            ...prev,
                            required: checked,
                          }))
                        }
                        label="Campo Requerido"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-zinc-800">
                    <ZenButton onClick={handleSaveEditField} size="sm">
                      Guardar
                    </ZenButton>
                    <ZenButton
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditField}
                    >
                      Cancelar
                    </ZenButton>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-300">
                        {field.label}
                      </span>
                      <ZenBadge variant="secondary" size="sm">
                        {getFieldTypeLabel(field.type)}
                      </ZenBadge>
                      {field.required && (
                        <ZenBadge variant="destructive" size="sm">
                          Requerido
                        </ZenBadge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEditField(field)}
                        className="text-zinc-400 hover:text-zinc-300"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </ZenButton>
                      <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveField(field.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </ZenButton>
                    </div>
                  </div>
                  {field.type === "select" && (
                    <div className="mt-2 pt-2 border-t border-zinc-800 space-y-2">
                      <p className="text-xs text-zinc-500 mb-1">Opciones:</p>
                      {field.options && field.options.length > 0 && (
                        <div className="space-y-1.5">
                          {field.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className="bg-zinc-800 border border-zinc-700 rounded p-2 flex items-center gap-2"
                            >
                              {editingFieldOption?.fieldId === field.id && editingFieldOption.index === optIndex ? (
                                <>
                                  <input
                                    type="text"
                                    value={editingFieldOptionValue}
                                    onChange={(e) => setEditingFieldOptionValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleSaveEditFieldOption();
                                      } else if (e.key === "Escape") {
                                        handleCancelEditFieldOption();
                                      }
                                    }}
                                    className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    autoFocus
                                  />
                                  <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSaveEditFieldOption}
                                    className="text-emerald-400 hover:text-emerald-300"
                                  >
                                    Guardar
                                  </ZenButton>
                                  <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelEditFieldOption}
                                    className="text-zinc-400 hover:text-zinc-300"
                                  >
                                    Cancelar
                                  </ZenButton>
                                </>
                              ) : (
                                <>
                                  <span className="flex-1 text-sm text-zinc-300">{option}</span>
                                  <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStartEditFieldOption(field.id, optIndex, option)}
                                    className="text-zinc-400 hover:text-zinc-300"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </ZenButton>
                                  <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveFieldOption(field.id, optIndex)}
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
                      {showFieldOptionForm === field.id ? (
                        <div className="bg-zinc-800 border border-zinc-700 rounded p-2 space-y-2">
                          <input
                            type="text"
                            value={newFieldOption}
                            onChange={(e) => setNewFieldOption(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleAddFieldOption(field.id);
                              } else if (e.key === "Escape") {
                                setShowFieldOptionForm(null);
                                setNewFieldOption("");
                              }
                            }}
                            placeholder="Nueva opción"
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <ZenButton onClick={() => handleAddFieldOption(field.id)} size="sm">
                              Agregar
                            </ZenButton>
                            <ZenButton
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowFieldOptionForm(null);
                                setNewFieldOption("");
                              }}
                            >
                              Cancelar
                            </ZenButton>
                          </div>
                        </div>
                      ) : (
                        <ZenButton
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFieldOptionForm(field.id)}
                          className="w-full"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Agregar Opción
                        </ZenButton>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!showFieldForm ? (
        <ZenButton
          variant="outline"
          size="sm"
          onClick={() => setShowFieldForm(true)}
          disabled={maxFields ? fields.length >= maxFields : false}
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
                  type: e.target.value as CustomFieldType,
                }))
              }
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
            >
              {allowedTypes.map((type) => (
                <option key={type} value={type}>
                  {getFieldTypeLabel(type)}
                </option>
              ))}
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
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">
                Opciones
              </label>
              {newField.options && newField.options.length > 0 && (
                <div className="space-y-1.5">
                  {newField.options.map((option, index) => (
                    <div
                      key={index}
                      className="bg-zinc-800 border border-zinc-700 rounded p-2 flex items-center gap-2"
                    >
                      <span className="flex-1 text-xs text-zinc-300">{option}</span>
                      <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updated = newField.options?.filter((_, i) => i !== index);
                          setNewField((prev) => ({ ...prev, options: updated }));
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </ZenButton>
                    </div>
                  ))}
                </div>
              )}
              {showNewFieldOptionForm ? (
                <div className="bg-zinc-800 border border-zinc-700 rounded p-2 space-y-2">
                  <input
                    type="text"
                    value={newFieldOptionValue}
                    onChange={(e) => setNewFieldOptionValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (newFieldOptionValue.trim()) {
                          setNewField((prev) => ({
                            ...prev,
                            options: [...(prev.options || []), newFieldOptionValue.trim()],
                          }));
                          setNewFieldOptionValue("");
                          setShowNewFieldOptionForm(false);
                        }
                      } else if (e.key === "Escape") {
                        setShowNewFieldOptionForm(false);
                        setNewFieldOptionValue("");
                      }
                    }}
                    placeholder="Nueva opción"
                    className="w-full px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <ZenButton
                      onClick={() => {
                        if (newFieldOptionValue.trim()) {
                          setNewField((prev) => ({
                            ...prev,
                            options: [...(prev.options || []), newFieldOptionValue.trim()],
                          }));
                          setNewFieldOptionValue("");
                          setShowNewFieldOptionForm(false);
                        }
                      }}
                      size="sm"
                    >
                      Agregar
                    </ZenButton>
                    <ZenButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewFieldOptionForm(false);
                        setNewFieldOptionValue("");
                      }}
                    >
                      Cancelar
                    </ZenButton>
                  </div>
                </div>
              ) : (
                <ZenButton
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewFieldOptionForm(true)}
                  className="w-full"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar Opción
                </ZenButton>
              )}
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
  );
}
