'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock, Settings, Edit2, Trash2, X, CalendarIcon } from 'lucide-react';
import { ZenDialog, ZenInput, ZenButton, ZenTextarea, ZenConfirmModal } from '@/components/ui/zen';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import { toUtcDateOnly } from '@/lib/utils/date-only';
import { es } from 'date-fns/locale';
import {
  upsertReminder,
  getReminderByPromise,
  deleteReminder,
  type Reminder
} from '@/lib/actions/studio/commercial/promises/reminders.actions';
import {
  getReminderSubjects,
  createReminderSubject,
  updateReminderSubject,
  deleteReminderSubject,
  type ReminderSubject
} from '@/lib/actions/studio/commercial/promises/reminder-subjects.actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReminderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  promiseId: string;
  existingReminder?: Reminder | null;
  onSuccess?: (reminder: Reminder) => void;
  onDeleted?: () => void;
  zIndex?: number;
}

export function ReminderFormModal({
  isOpen,
  onClose,
  studioSlug,
  promiseId,
  existingReminder,
  onSuccess,
  onDeleted,
  zIndex = 10050,
}: ReminderFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [subjects, setSubjects] = useState<ReminderSubject[]>([]);
  const [subjectText, setSubjectText] = useState('');
  const [description, setDescription] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<ReminderSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [month, setMonth] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [errors, setErrors] = useState<{ subject?: string; date?: string }>({});
  const [showManageModal, setShowManageModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Helper para formatear fecha como YYYY-MM-DD sin zona horaria
  const formatDateForServer = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /** Parsea fecha a UTC noon (Calendar-Only, ver MANEJO_FECHAS.md) */
  const parseDateSafe = (date: Date | string | null): Date => {
    if (!date) return new Date();
    const parsed = toUtcDateOnly(date);
    return parsed ?? new Date();
  };

  // Cargar asuntos al abrir
  useEffect(() => {
    if (isOpen) {
      setInitializing(true);
      const initializeModal = async () => {
        await loadSubjects();
        if (existingReminder) {
          setSubjectText(existingReminder.subject_text);
          setDescription(existingReminder.description || '');
          setSelectedSubjectId(existingReminder.subject_id);
          const date = parseDateSafe(existingReminder.reminder_date);
          setSelectedDate(date);
          setMonth(date);
          setReminderDate(formatDateForServer(date));
          // No mostrar sugerencias si ya hay un asunto definido
          setShowSuggestions(false);
        } else {
          // Resetear formulario; fecha por defecto: mañana (UTC, ver MANEJO_FECHAS.md)
          setSubjectText('');
          setDescription('');
          setSelectedSubjectId(null);
          const now = new Date();
          const tomorrowUtc = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
            12, 0, 0
          ));
          setSelectedDate(tomorrowUtc);
          setMonth(tomorrowUtc);
          setReminderDate(formatDateForServer(tomorrowUtc));
          // No mostrar sugerencias automáticamente
          setShowSuggestions(false);
        }
        setErrors({});
        setInitializing(false);
      };
      initializeModal();
    } else {
      setInitializing(false);
    }
  }, [isOpen, existingReminder]);

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const loadSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const result = await getReminderSubjects(studioSlug, {
        includeInactive: false,
        orderBy: 'order',
      });
      if (result.success && result.data) {
        setSubjects(result.data);
      }
    } catch (error) {
      console.error('Error cargando asuntos:', error);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSubjectInputChange = (value: string) => {
    setSubjectText(value);
    setSelectedSubjectId(null);
    setErrors(prev => ({ ...prev, subject: undefined }));

    // Solo mostrar sugerencias si el usuario está escribiendo
    if (value.trim()) {
      // Filtrar sugerencias
      const filtered = subjects.filter(s =>
        s.text.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      // Si está vacío, no mostrar sugerencias
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (subject: ReminderSubject) => {
    setSubjectText(subject.text);
    setSelectedSubjectId(subject.id);
    setShowSuggestions(false);
    setErrors(prev => ({ ...prev, subject: undefined }));
  };

  /** Hoy en UTC (mediodía) para opciones rápidas (ver MANEJO_FECHAS.md) */
  const getTodayUtc = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  };

  const handleQuickDate = (days: number) => {
    const todayUtc = getTodayUtc();
    const targetUtc = new Date(Date.UTC(
      todayUtc.getUTCFullYear(),
      todayUtc.getUTCMonth(),
      todayUtc.getUTCDate() + days,
      12, 0, 0
    ));
    setSelectedDate(targetUtc);
    setMonth(targetUtc);
    setReminderDate(formatDateForServer(targetUtc));
    setErrors(prev => ({ ...prev, date: undefined }));
  };

  // Verificar si una opción rápida está seleccionada (interpretación relativa en UTC)
  const isQuickDateSelected = (days: number): boolean => {
    if (!selectedDate) return false;
    const todayUtc = getTodayUtc();
    const targetUtc = new Date(Date.UTC(
      todayUtc.getUTCFullYear(),
      todayUtc.getUTCMonth(),
      todayUtc.getUTCDate() + days,
      12, 0, 0
    ));
    const selectedNormalized = new Date(Date.UTC(
      selectedDate.getUTCFullYear(),
      selectedDate.getUTCMonth(),
      selectedDate.getUTCDate(),
      12, 0, 0
    ));
    return selectedNormalized.getTime() === targetUtc.getTime();
  };

  // Sincronizar selectedDate con reminderDate
  useEffect(() => {
    if (selectedDate) {
      setReminderDate(formatDateForServer(selectedDate));
    }
  }, [selectedDate]);

  const handleSubmit = async () => {
    // Validar
    const newErrors: { subject?: string; date?: string } = {};

    if (!subjectText.trim()) {
      newErrors.subject = 'El asunto es requerido';
    }

    if (!reminderDate) {
      newErrors.date = 'La fecha es requerida';
    } else {
      const selectedUtc = toUtcDateOnly(reminderDate);
      const now = new Date();
      const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
      if (selectedUtc && selectedUtc.getTime() < todayUtc.getTime()) {
        newErrors.date = 'La fecha no puede ser en el pasado';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      let finalSubjectId = selectedSubjectId;

      // Si no hay subjectId seleccionado, buscar si existe o crear uno nuevo
      if (!finalSubjectId) {
        const existingSubject = subjects.find(
          s => s.text.toLowerCase() === subjectText.trim().toLowerCase()
        );

        if (existingSubject) {
          finalSubjectId = existingSubject.id;
        } else {
          // Crear nuevo asunto
          const createResult = await createReminderSubject(studioSlug, {
            text: subjectText.trim(),
          });

          if (createResult.success && createResult.data) {
            finalSubjectId = createResult.data.id;
            // Recargar lista de asuntos
            await loadSubjects();
          } else {
            toast.error(createResult.error || 'Error al crear asunto');
            return;
          }
        }
      }

      const result = await upsertReminder(studioSlug, {
        promiseId,
        subjectId: finalSubjectId,
        subjectText: subjectText.trim(),
        description: description.trim() || null,
        reminderDate: new Date(reminderDate),
      });

      if (result.success && result.data) {
        toast.success(existingReminder ? 'Seguimiento actualizado' : 'Seguimiento creado');
        // Disparar evento para actualizar contador y side sheet
        window.dispatchEvent(new CustomEvent('reminder-updated'));
        onSuccess?.(result.data);
        onClose();
      } else {
        toast.error(result.error || 'Error al guardar seguimiento');
      }
    } catch (error) {
      console.error('Error guardando seguimiento:', error);
      toast.error('Error al guardar seguimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => setShowDeleteConfirm(true);

  const handleDeleteConfirm = async () => {
    if (!existingReminder) return;
    setIsDeleting(true);
    try {
      const result = await deleteReminder(studioSlug, existingReminder.id);
      if (result.success) {
        toast.success('Seguimiento eliminado');
        window.dispatchEvent(new CustomEvent('reminder-updated'));
        setShowDeleteConfirm(false);
        onDeleted?.();
        onClose();
      } else {
        toast.error(result.error || 'Error al eliminar seguimiento');
      }
    } catch (error) {
      console.error('Error eliminando seguimiento:', error);
      toast.error('Error al eliminar seguimiento');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={onClose}
        title={existingReminder ? 'Editar Seguimiento' : 'Agendar Seguimiento'}
        description="Configura el siguiente paso para esta promesa"
        onSave={handleSubmit}
        onCancel={onClose}
        saveLabel={existingReminder ? 'Actualizar' : 'Guardar'}
        cancelLabel="Cancelar"
        isLoading={loading}
        maxWidth="md"
        zIndex={zIndex}
        footerLeftContent={
          <ZenButton variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </ZenButton>
        }
        showDeleteButton={!!existingReminder}
        onDelete={handleDeleteClick}
        deleteOnRight={!!existingReminder}
        deleteLabel="Eliminar"
      >
        {initializing ? (
          <div className="space-y-4">
            {/* Skeleton: Asunto */}
            <div className="space-y-2">
              <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
            </div>

            {/* Skeleton: Descripción */}
            <div className="space-y-2">
              <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
              <div className="h-20 w-full bg-zinc-800 rounded animate-pulse" />
            </div>

            {/* Skeleton: Fecha */}
            <div className="space-y-2">
              <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse" />
                <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
                <div className="h-8 w-28 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Input de Asunto con Autocompletado */}
            <div className="relative">
            <ZenInput
              ref={inputRef}
              label="Asunto"
              value={subjectText}
              onChange={(e) => handleSubjectInputChange(e.target.value)}
              onFocus={() => {
                // Solo mostrar sugerencias al hacer focus si hay texto o si no hay asunto definido
                if (subjectText.trim()) {
                  const filtered = subjects.filter(s =>
                    s.text.toLowerCase().includes(subjectText.toLowerCase())
                  );
                  setFilteredSuggestions(filtered);
                  setShowSuggestions(true);
                } else if (!existingReminder) {
                  // Si no hay reminder existente y el input está vacío, mostrar todos
                  setFilteredSuggestions(subjects);
                  setShowSuggestions(true);
                }
                // Si hay reminder existente y el input está vacío, no mostrar sugerencias
              }}
              onBlur={() => {
                // Ocultar sugerencias al perder el foco (con delay para permitir clicks en las sugerencias)
                setTimeout(() => {
                  setShowSuggestions(false);
                }, 200);
              }}
              placeholder="Escribe el asunto del seguimiento"
              error={errors.subject}
              required
              disabled={loadingSubjects}
            />

            {/* Lista de sugerencias */}
            {showSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 mt-1 w-full rounded-md border border-zinc-600 bg-zinc-900 shadow-lg max-h-60 overflow-y-auto"
              >
                {filteredSuggestions.length > 0 ? (
                  <>
                    {filteredSuggestions.map((subject) => (
                      <button
                        key={subject.id}
                        type="button"
                        onClick={() => handleSelectSuggestion(subject)}
                        className={cn(
                          "flex w-full items-center px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 transition-colors",
                          selectedSubjectId === subject.id && "bg-blue-600/20 text-blue-400"
                        )}
                      >
                        {subject.text}
                      </button>
                    ))}
                    {/* Item especial: Gestionar asuntos */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuggestions(false);
                        setShowManageModal(true);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors border-t border-zinc-700"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Gestionar asuntos</span>
                    </button>
                    {/* Si el texto no coincide con ningún asunto, mostrar opción para crear */}
                    {subjectText.trim() && !filteredSuggestions.some(s =>
                      s.text.toLowerCase() === subjectText.trim().toLowerCase()
                    ) && (
                        <button
                          type="button"
                          onClick={() => {
                            // El asunto se creará automáticamente al guardar
                            setShowSuggestions(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors border-t border-zinc-700"
                        >
                          <span className="text-emerald-400">+</span>
                          <span>Crear asunto "{subjectText.trim()}"</span>
                        </button>
                      )}
                  </>
                ) : subjectText.trim() ? (
                  <>
                    {/* Si hay texto pero no hay coincidencias, mostrar opción para crear */}
                    <button
                      type="button"
                      onClick={() => {
                        // El asunto se creará automáticamente al guardar
                        setShowSuggestions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors"
                    >
                      <span className="text-emerald-400">+</span>
                      <span>Crear asunto "{subjectText.trim()}"</span>
                    </button>
                    {/* Item especial: Gestionar asuntos */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuggestions(false);
                        setShowManageModal(true);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors border-t border-zinc-700"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Gestionar asuntos</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Si no hay texto, solo mostrar gestionar asuntos */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuggestions(false);
                        setShowManageModal(true);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Gestionar asuntos</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Descripción */}
          <ZenTextarea
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción adicional del seguimiento (opcional)"
            rows={3}
            maxLength={500}
          />

          {/* Selector de Fecha */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 block mb-2">
              Fecha del seguimiento <span className="text-red-400">*</span>
            </label>

            {/* Botones rápidos */}
            <div className="flex items-center gap-2 flex-wrap">
              <ZenButton
                type="button"
                variant={isQuickDateSelected(1) ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickDate(1)}
                className={cn(
                  "text-xs",
                  isQuickDateSelected(1) && "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30"
                )}
              >
                Mañana
              </ZenButton>
              <ZenButton
                type="button"
                variant={isQuickDateSelected(3) ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickDate(3)}
                className={cn(
                  "text-xs",
                  isQuickDateSelected(3) && "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30"
                )}
              >
                En 3 días
              </ZenButton>
              <ZenButton
                type="button"
                variant={isQuickDateSelected(7) ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickDate(7)}
                className={cn(
                  "text-xs",
                  isQuickDateSelected(7) && "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30"
                )}
              >
                En 1 semana
              </ZenButton>
            </div>

            {/* Selector de fecha con Calendar */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCalendarOpen(!calendarOpen);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm bg-zinc-900 border rounded-lg text-zinc-300 hover:border-zinc-600 transition-colors",
                    errors.date ? "border-red-500" : "border-zinc-700"
                  )}
                >
                  <span className={!selectedDate ? 'text-zinc-500' : ''}>
                    {selectedDate ? formatDisplayDate(selectedDate) : 'Seleccionar fecha'}
                  </span>
                  <CalendarIcon className="h-4 w-4 text-zinc-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 bg-zinc-900 border-zinc-700 z-9999 overflow-visible"
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="p-3">
                  <Calendar
                    mode="single"
                    required
                    selected={selectedDate}
                    onSelect={(date: Date | undefined) => {
                      if (!date) {
                        return;
                      }

                      // Normalizar fecha a mediodía UTC para evitar problemas de zona horaria
                      const normalizedDate = new Date(Date.UTC(
                        date.getUTCFullYear(),
                        date.getUTCMonth(),
                        date.getUTCDate(),
                        12, 0, 0
                      ));

                      setSelectedDate(normalizedDate);
                      setReminderDate(formatDateForServer(normalizedDate));
                      setMonth(normalizedDate);
                      setErrors(prev => ({ ...prev, date: undefined }));
                    }}
                    month={month}
                    onMonthChange={setMonth}
                    numberOfMonths={1}
                    locale={es}
                    buttonVariant="ghost"
                    className="border border-zinc-700 rounded-lg"
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                  />
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-700 mt-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarOpen(false);
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarOpen(false);
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Mensaje de error */}
            {errors.date && (
              <p className="text-xs text-red-500 mt-1">{errors.date}</p>
            )}
          </div>
          </div>
        )}
      </ZenDialog>

      <ZenConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { if (!isDeleting) setShowDeleteConfirm(false); }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar seguimiento"
        description="¿Estás seguro de que deseas eliminar este seguimiento? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
        loadingText="Eliminando..."
        zIndex={zIndex + 100}
      />

      {/* Modal de Gestión de Asuntos */}
      <ManageSubjectsModal
        isOpen={showManageModal}
        onClose={() => {
          setShowManageModal(false);
          loadSubjects();
        }}
        studioSlug={studioSlug}
        subjects={subjects}
        onSubjectsUpdated={loadSubjects}
        zIndex={zIndex + 50}
      />
    </>
  );
}

// =============================================================================
// MODAL DE GESTIÓN DE ASUNTOS (exportado para uso en SeguimientoMinimalCard)
// =============================================================================

export interface ManageSubjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  subjects: ReminderSubject[];
  onSubjectsUpdated: () => void;
  zIndex?: number;
}

export function ManageSubjectsModal({
  isOpen,
  onClose,
  studioSlug,
  subjects: initialSubjects,
  onSubjectsUpdated,
  zIndex = 10100,
}: ManageSubjectsModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<ReminderSubject[]>(initialSubjects);

  // Sincronizar subjects cuando cambian desde el padre
  useEffect(() => {
    setSubjects(initialSubjects);
  }, [initialSubjects]);

  const handleEdit = (subject: ReminderSubject) => {
    setEditingId(subject.id);
    setEditText(subject.text);
  };

  const handleSaveEdit = async (subjectId: string) => {
    if (!editText.trim()) {
      toast.error('El texto no puede estar vacío');
      return;
    }

    try {
      const result = await updateReminderSubject(studioSlug, subjectId, {
        text: editText.trim(),
      });

      if (result.success) {
        toast.success('Asunto actualizado');
        setEditingId(null);
        setEditText('');
        onSubjectsUpdated();
        // Recargar subjects localmente
        const updatedResult = await getReminderSubjects(studioSlug, {
          includeInactive: false,
          orderBy: 'order',
        });
        if (updatedResult.success && updatedResult.data) {
          setSubjects(updatedResult.data);
        }
      } else {
        toast.error(result.error || 'Error al actualizar asunto');
      }
    } catch (error) {
      console.error('Error actualizando asunto:', error);
      toast.error('Error al actualizar asunto');
    }
  };

  const handleDelete = async (subjectId: string) => {
    if (!deletingId) return;

    try {
      const result = await deleteReminderSubject(studioSlug, subjectId);

      if (result.success) {
        toast.success('Asunto eliminado');
        setDeletingId(null);
        onSubjectsUpdated();
        // Recargar subjects localmente
        const updatedResult = await getReminderSubjects(studioSlug, {
          includeInactive: false,
          orderBy: 'order',
        });
        if (updatedResult.success && updatedResult.data) {
          setSubjects(updatedResult.data);
        }
      } else {
        toast.error(result.error || 'Error al eliminar asunto');
      }
    } catch (error) {
      console.error('Error eliminando asunto:', error);
      toast.error('Error al eliminar asunto');
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Gestionar Asuntos"
      description="Edita o elimina asuntos de la librería"
      onCancel={onClose}
      cancelLabel="Cerrar"
      maxWidth="md"
      zIndex={zIndex}
    >
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {subjects.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">
            No hay asuntos disponibles
          </p>
        ) : (
          subjects.map((subject) => (
            <div
              key={subject.id}
              className="flex items-center gap-2 p-3 rounded-md border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              {editingId === subject.id ? (
                <>
                  <ZenInput
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEdit(subject.id);
                      } else if (e.key === 'Escape') {
                        setEditingId(null);
                        setEditText('');
                      }
                    }}
                    autoFocus
                  />
                  <ZenButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSaveEdit(subject.id)}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    Guardar
                  </ZenButton>
                  <ZenButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setEditText('');
                    }}
                    className="text-zinc-400 hover:text-zinc-300"
                  >
                    <X className="h-4 w-4" />
                  </ZenButton>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="text-sm text-zinc-200">{subject.text}</p>
                    {subject.usage_count > 0 && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Usado {subject.usage_count} vez{subject.usage_count !== 1 ? 'es' : ''}
                      </p>
                    )}
                  </div>
                  <ZenButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(subject)}
                    className="text-zinc-400 hover:text-blue-400"
                  >
                    <Edit2 className="h-4 w-4" />
                  </ZenButton>
                  {deletingId === subject.id ? (
                    <div className="flex items-center gap-1">
                      <ZenButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(subject.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Confirmar
                      </ZenButton>
                      <ZenButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(null)}
                        className="text-zinc-400 hover:text-zinc-300"
                      >
                        <X className="h-4 w-4" />
                      </ZenButton>
                    </div>
                  ) : (
                    <ZenButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(subject.id)}
                      className="text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </ZenButton>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </ZenDialog>
  );
}
