'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CalendarIcon, Settings } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton, ZenInput } from '@/components/ui/zen';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import { es } from 'date-fns/locale';
import {
  getReminderByPromise,
  upsertReminder,
  deleteReminder,
  type Reminder,
} from '@/lib/actions/studio/commercial/promises/reminders.actions';
import {
  getReminderSubjects,
  createReminderSubject,
  type ReminderSubject,
} from '@/lib/actions/studio/commercial/promises/reminder-subjects.actions';
import { ReminderFormModal, ManageSubjectsModal } from '@/components/shared/reminders';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const getTodayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
};

interface SeguimientoMinimalCardProps {
  studioSlug: string;
  promiseId: string;
  onSuccess?: () => void;
  /** Datos iniciales del servidor. Si está definido (null o item), no se hace fetch en mount ni skeleton. */
  initialReminder?: Reminder | null;
}

export function SeguimientoMinimalCard({ studioSlug, promiseId, onSuccess, initialReminder: initialReminderProp }: SeguimientoMinimalCardProps) {
  const hasInitial = initialReminderProp !== undefined;
  const [reminder, setReminder] = useState<Reminder | null>(hasInitial ? (initialReminderProp ?? null) : null);
  const [loading, setLoading] = useState(!hasInitial);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjects, setSubjects] = useState<ReminderSubject[]>([]);
  const [subjectText, setSubjectText] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<ReminderSubject[]>([]);
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [month, setMonth] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [errors, setErrors] = useState<{ subject?: string; date?: string }>({});
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hasInitial) {
      setLoading(false);
      getReminderSubjects(studioSlug, { includeInactive: false, orderBy: 'order' }).then((subjectsRes) => {
        if (subjectsRes.success && subjectsRes.data) setSubjects(subjectsRes.data);
      });
      return;
    }
    let cancelled = false;
    const load = async () => {
      const [reminderRes, subjectsRes] = await Promise.all([
        getReminderByPromise(studioSlug, promiseId),
        getReminderSubjects(studioSlug, { includeInactive: false, orderBy: 'order' }),
      ]);
      if (cancelled) return;
      if (reminderRes.success && reminderRes.data) setReminder(reminderRes.data);
      if (subjectsRes.success && subjectsRes.data) setSubjects(subjectsRes.data);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [studioSlug, promiseId, hasInitial]);

  useEffect(() => {
    if (!loading && !reminder && selectedDate === undefined) {
      const tomorrow = new Date(Date.UTC(
        getTodayUtc().getUTCFullYear(),
        getTodayUtc().getUTCMonth(),
        getTodayUtc().getUTCDate() + 1,
        12, 0, 0
      ));
      setSelectedDate(tomorrow);
      setMonth(tomorrow);
    }
  }, [loading, reminder, selectedDate]);

  const loadSubjects = async () => {
    setLoadingSubjects(true);
    const result = await getReminderSubjects(studioSlug, { includeInactive: false, orderBy: 'order' });
    if (result.success && result.data) setSubjects(result.data);
    setLoadingSubjects(false);
  };

  const handleSubjectInputChange = (value: string) => {
    setSubjectText(value);
    setSelectedSubjectId(null);
    setErrors((e) => ({ ...e, subject: undefined }));
    if (value.trim()) {
      setFilteredSuggestions(subjects.filter((s) => s.text.toLowerCase().includes(value.toLowerCase())));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (subject: ReminderSubject) => {
    setSubjectText(subject.text);
    setSelectedSubjectId(subject.id);
    setShowSuggestions(false);
    setErrors((e) => ({ ...e, subject: undefined }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current && !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const handleQuickDate = (days: number) => {
    const target = new Date(Date.UTC(
      getTodayUtc().getUTCFullYear(),
      getTodayUtc().getUTCMonth(),
      getTodayUtc().getUTCDate() + days,
      12, 0, 0
    ));
    setSelectedDate(target);
    setMonth(target);
    setErrors((e) => ({ ...e, date: undefined }));
  };

  const isQuickSelected = (days: number) => {
    if (!selectedDate) return false;
    const target = new Date(Date.UTC(
      getTodayUtc().getUTCFullYear(),
      getTodayUtc().getUTCMonth(),
      getTodayUtc().getUTCDate() + days,
      12, 0, 0
    ));
    return selectedDate.getTime() === target.getTime();
  };

  const handleSubmit = async () => {
    const newErrors: { subject?: string; date?: string } = {};
    if (!subjectText.trim()) newErrors.subject = 'El asunto es requerido';
    if (!selectedDate) newErrors.date = 'La fecha es requerida';
    else {
      const todayUtc = getTodayUtc();
      if (selectedDate.getTime() < todayUtc.getTime()) newErrors.date = 'La fecha no puede ser en el pasado';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      let subjectId = selectedSubjectId ?? subjects.find((s) => s.text.toLowerCase() === subjectText.trim().toLowerCase())?.id ?? null;
      if (!subjectId) {
        const createRes = await createReminderSubject(studioSlug, { text: subjectText.trim() });
        if (createRes.success && createRes.data) {
          subjectId = createRes.data.id;
          setSubjects((prev) => [createRes.data!, ...prev]);
        }
      }

      const result = await upsertReminder(studioSlug, {
        promiseId,
        subjectId,
        subjectText: subjectText.trim(),
        description: description.trim() || null,
        reminderDate: selectedDate!,
      });

      if (result.success && result.data) {
        setReminder(result.data);
        setSubjectText('');
        setDescription('');
        const tomorrow = new Date(Date.UTC(
          getTodayUtc().getUTCFullYear(),
          getTodayUtc().getUTCMonth(),
          getTodayUtc().getUTCDate() + 1,
          12, 0, 0
        ));
        setSelectedDate(tomorrow);
        setMonth(tomorrow);
        setErrors({});
        toast.success('Seguimiento programado');
        window.dispatchEvent(new CustomEvent('reminder-updated'));
        onSuccess?.();
      } else {
        toast.error(result.error ?? 'Error al guardar');
      }
    } catch {
      toast.error('Error al guardar seguimiento');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!reminder) return;
    setClearing(true);
    try {
      const result = await deleteReminder(studioSlug, reminder.id);
      if (result.success) {
        setReminder(null);
        setSubjectText('');
        setSelectedSubjectId(null);
        setDescription('');
        const tomorrow = new Date(Date.UTC(
          getTodayUtc().getUTCFullYear(),
          getTodayUtc().getUTCMonth(),
          getTodayUtc().getUTCDate() + 1,
          12, 0, 0
        ));
        setSelectedDate(tomorrow);
        setMonth(tomorrow);
        setErrors({});
        toast.success('Seguimiento eliminado');
        window.dispatchEvent(new CustomEvent('reminder-updated'));
        onSuccess?.();
      } else {
        toast.error(result.error ?? 'Error al eliminar');
      }
    } catch {
      toast.error('Error al eliminar seguimiento');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <ZenCard variant="outlined" className="border-zinc-800">
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3">
          <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
        </ZenCardHeader>
        <ZenCardContent className="p-4 space-y-3">
          <div className="h-9 w-full bg-zinc-800 rounded animate-pulse" />
          <div className="h-16 w-full bg-zinc-800 rounded animate-pulse" />
          <div className="h-8 w-full bg-zinc-800 rounded animate-pulse" />
        </ZenCardContent>
      </ZenCard>
    );
  }

  if (reminder) {
    return (
      <>
        <ZenCard variant="outlined" className="border-zinc-800">
          <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
            <div className="flex items-center justify-between">
              <ZenCardTitle className="text-sm font-medium">Recordatorio de seguimiento</ZenCardTitle>
              <div className="flex items-center gap-1.5">
                <ZenButton
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-200"
                  onClick={() => setShowEditModal(true)}
                  title="Editar seguimiento"
                >
                  Editar
                </ZenButton>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                  onClick={handleClear}
                  disabled={clearing}
                  loading={clearing}
                  title="Limpiar seguimiento"
                >
                  Limpiar
                </ZenButton>
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-3">
            <p className="text-xs text-zinc-400 truncate" title={reminder.subject_text}>
              {reminder.subject_text}
            </p>
            <p className="text-xs font-medium text-emerald-400/90 mt-1">
              {formatDisplayDate(reminder.reminder_date)}
            </p>
          </ZenCardContent>
        </ZenCard>
        <ReminderFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          studioSlug={studioSlug}
          promiseId={promiseId}
          existingReminder={reminder}
          onSuccess={(r) => {
            setReminder(r);
            setShowEditModal(false);
            onSuccess?.();
          }}
          onDeleted={() => {
            setReminder(null);
            setShowEditModal(false);
            onSuccess?.();
          }}
        />
      </>
    );
  }

  return (
    <>
    <ZenCard variant="outlined" className="border-zinc-800">
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
        <ZenCardTitle className="text-sm font-medium">Recordatorio de seguimiento</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-4 space-y-3">
        <div className="space-y-1">
          <div className="relative">
            <ZenInput
              ref={inputRef}
              value={subjectText}
              onChange={(e) => handleSubjectInputChange(e.target.value)}
              onFocus={() => {
                if (subjectText.trim()) {
                  setFilteredSuggestions(subjects.filter((s) => s.text.toLowerCase().includes(subjectText.toLowerCase())));
                  setShowSuggestions(true);
                } else {
                  setFilteredSuggestions(subjects);
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Escribe el asunto del seguimiento"
              error={errors.subject}
              required
              disabled={saving || loadingSubjects}
              className={errors.subject ? 'border-red-500' : ''}
            />
            {showSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 mt-1 w-full rounded-md border border-zinc-600 bg-zinc-900 shadow-lg max-h-60 overflow-y-auto"
              >
                {filteredSuggestions.length > 0 ? (
                  <>
                    {filteredSuggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSuggestion(s)}
                        className={cn(
                          'flex w-full items-center px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 transition-colors',
                          selectedSubjectId === s.id && 'bg-blue-600/20 text-blue-400'
                        )}
                      >
                        {s.text}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setShowSuggestions(false); setShowManageModal(true); }}
                      className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors border-t border-zinc-700"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Gestionar asuntos</span>
                    </button>
                    {subjectText.trim() && !filteredSuggestions.some((s) => s.text.toLowerCase() === subjectText.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => setShowSuggestions(false)}
                        className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors border-t border-zinc-700"
                      >
                        <span className="text-emerald-400">+</span>
                        <span>Crear asunto &quot;{subjectText.trim().length > 40 ? subjectText.trim().slice(0, 40) + '…' : subjectText.trim()}&quot;</span>
                      </button>
                    )}
                  </>
                ) : subjectText.trim() ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors"
                    >
                      <span className="text-emerald-400">+</span>
                      <span>Crear asunto &quot;{subjectText.trim().length > 40 ? subjectText.trim().slice(0, 40) + '…' : subjectText.trim()}&quot;</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowSuggestions(false); setShowManageModal(true); }}
                      className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors border-t border-zinc-700"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Gestionar asuntos</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setShowSuggestions(false); setShowManageModal(true); }}
                    className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Gestionar asuntos</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <ZenButton
              type="button"
              variant={isQuickSelected(1) ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleQuickDate(1)}
              className={cn('text-[11px] h-7 w-full', isQuickSelected(1) && 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50')}
            >
              Mañana
            </ZenButton>
            <ZenButton
              type="button"
              variant={isQuickSelected(3) ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleQuickDate(3)}
              className={cn('text-[11px] h-7 w-full', isQuickSelected(3) && 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50')}
            >
              En 3 días
            </ZenButton>
            <ZenButton
              type="button"
              variant={isQuickSelected(7) ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleQuickDate(7)}
              className={cn('text-[11px] h-7 w-full', isQuickSelected(7) && 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50')}
            >
              En 1 semana
            </ZenButton>
          </div>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-xs bg-zinc-900 border rounded-lg text-zinc-300 hover:border-zinc-600',
                  errors.date ? 'border-red-500' : 'border-zinc-700'
                )}
              >
                <span className={!selectedDate ? 'text-zinc-500' : ''}>
                  {selectedDate ? formatDisplayDate(selectedDate) : 'Elegir fecha'}
                </span>
                <CalendarIcon className="h-3.5 w-3.5 text-zinc-500" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700" align="start" sideOffset={4}>
              <div className="p-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      const norm = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
                      setSelectedDate(norm);
                      setMonth(norm);
                      setCalendarOpen(false);
                      setErrors((e) => ({ ...e, date: undefined }));
                    }
                  }}
                  month={month}
                  onMonthChange={setMonth}
                  locale={es}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </div>
            </PopoverContent>
          </Popover>
          {errors.date && <p className="text-[11px] text-red-400">{errors.date}</p>}
        </div>

        <div className="flex gap-2">
          <ZenButton
            type="button"
            size="sm"
            variant="outline"
            onClick={handleClear}
            disabled={!reminder || saving || clearing}
          >
            {clearing ? '…' : 'Limpiar'}
          </ZenButton>
          <ZenButton
            type="button"
            size="sm"
            className="flex-1"
            onClick={handleSubmit}
            disabled={saving || clearing || !subjectText.trim() || !selectedDate}
          >
            {saving ? 'Guardando…' : 'Programar seguimiento'}
          </ZenButton>
        </div>
      </ZenCardContent>
    </ZenCard>

    <ManageSubjectsModal
      isOpen={showManageModal}
      onClose={() => {
        setShowManageModal(false);
        loadSubjects();
      }}
      studioSlug={studioSlug}
      subjects={subjects}
      onSubjectsUpdated={loadSubjects}
    />
  </>
  );
}
