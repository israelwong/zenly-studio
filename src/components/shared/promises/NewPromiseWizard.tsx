'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ZenDialog, ZenInput, ZenCard, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { toast } from 'sonner';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import { es } from 'date-fns/locale';
import { CalendarIcon, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { createPromise, getEventTypes } from '@/lib/actions/studio/commercial/promises';
import { getContacts, getAcquisitionChannels, getSocialNetworks, createContact } from '@/lib/actions/studio/commercial/contacts';
import { obtenerCrewMembers } from '@/lib/actions/studio/crew/crew.actions';
import { verificarDisponibilidadFecha, type AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import { getLocationsByStudioSlug } from '@/lib/actions/studio/locations/locations.actions';
import type { CreatePromiseData } from '@/lib/actions/schemas/promises-schemas';
import { TipoEventoEnrichedModal } from '@/components/shared/tipos-evento/TipoEventoEnrichedModal';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';

const STEPS = [
  { id: 1, title: 'Disponibilidad', description: 'Fecha de interés' },
  { id: 2, title: 'El Prospecto', description: 'Contacto y canal' },
  { id: 3, title: 'El Evento', description: 'Tipo y detalles' },
] as const;

type FormState = Omit<CreatePromiseData, 'interested_dates'> & {
  eventDate?: string;
};

interface NewPromiseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  onSuccess?: () => void;
  zIndex?: number;
}

function formatDateForServer(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateSafe(date: Date | string | null): Date {
  if (!date) return new Date();
  if (typeof date === 'string') {
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
    }
    const isoDate = new Date(date);
    if (!Number.isNaN(isoDate.getTime())) {
      return new Date(Date.UTC(
        isoDate.getUTCFullYear(),
        isoDate.getUTCMonth(),
        isoDate.getUTCDate(),
        12, 0, 0
      ));
    }
    return new Date(date);
  }
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    12, 0, 0
  ));
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(-10);
}

const initialFormState: FormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  event_type_id: '',
  event_location: '',
  event_name: '',
  duration_hours: undefined,
  acquisition_channel_id: '',
  social_network_id: undefined,
  referrer_contact_id: undefined,
  referrer_name: undefined,
  referrer_id: undefined,
  referrer_type: undefined,
  notes: '',
};

export function NewPromiseWizard({
  isOpen,
  onClose,
  studioSlug,
  onSuccess,
  zIndex = 10050,
}: NewPromiseWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [eventDate, setEventDate] = useState<string | undefined>();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [month, setMonth] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [conflictosPorFecha, setConflictosPorFecha] = useState<Map<string, AgendaItem[]>>(new Map());

  const [eventTypes, setEventTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [acquisitionChannels, setAcquisitionChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [socialNetworks, setSocialNetworks] = useState<Array<{ id: string; name: string }>>([]);
  const [allContacts, setAllContacts] = useState<Array<{ id: string; name: string; phone: string; email: string | null; status?: string; type?: 'contact' | 'crew' }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  const [nameInput, setNameInput] = useState('');
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [filteredContactSuggestions, setFilteredContactSuggestions] = useState<Array<{ id: string; name: string; phone: string; email: string | null }>>([]);
  const [selectedContactIndex, setSelectedContactIndex] = useState(-1);

  const [referrerInputValue, setReferrerInputValue] = useState('');
  const [showReferrerSuggestions, setShowReferrerSuggestions] = useState(false);
  const [filteredReferrerContacts, setFilteredReferrerContacts] = useState<Array<{ id: string; name: string; phone: string; status?: string; type?: 'contact' | 'crew' }>>([]);
  const [selectedReferrerIndex, setSelectedReferrerIndex] = useState(-1);
  const [showCreateReferrerModal, setShowCreateReferrerModal] = useState(false);
  const [newReferrerName, setNewReferrerName] = useState('');
  const [newReferrerPhone, setNewReferrerPhone] = useState('');
  const [isCreatingReferrer, setIsCreatingReferrer] = useState(false);
  const [referrerSearchQuery, setReferrerSearchQuery] = useState('');
  const [showTipoEventoModal, setShowTipoEventoModal] = useState(false);

  const eventTypeSelectRef = useRef<HTMLSelectElement>(null);

  const getReferidosChannelId = (): string | undefined =>
    acquisitionChannels.find((c) =>
      c.name.toLowerCase().includes('referido') || c.name.toLowerCase().includes('referral')
    )?.id;
  const getRedesSocialesChannelId = (): string | undefined =>
    acquisitionChannels.find((c) =>
      c.name.toLowerCase().includes('red') || c.name.toLowerCase().includes('social')
    )?.id;

  const loadCatalogues = useCallback(async () => {
    const [et, ch, sn, loc] = await Promise.all([
      getEventTypes(studioSlug).then((r) => r.success && r.data ? r.data : []),
      getAcquisitionChannels().then((r) => r.success && r.data ? r.data.map((c) => ({ id: c.id, name: c.name })) : []),
      getSocialNetworks().then((r) => r.success && r.data ? r.data.map((n) => ({ id: n.id, name: n.name })) : []),
      getLocationsByStudioSlug(studioSlug).then((r) => r.success && r.data ? r.data.map((l) => ({ id: l.id, name: l.name })) : []),
    ]);
    setEventTypes(et);
    setAcquisitionChannels(ch);
    setSocialNetworks(sn);
    setLocations(loc);
  }, [studioSlug]);

  const loadContacts = useCallback(async () => {
    const [contactsResult, crewResult] = await Promise.all([
      getContacts(studioSlug, { page: 1, limit: 100, status: 'all' }),
      obtenerCrewMembers(studioSlug),
    ]);
    const combined: Array<{ id: string; name: string; phone: string; email: string | null; status?: string; type?: 'contact' | 'crew' }> = [];
    if (contactsResult.success && contactsResult.data) {
      combined.push(...contactsResult.data.contacts.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email || null,
        status: c.status || 'prospecto',
        type: 'contact' as const,
      })));
    }
    if (crewResult.success && crewResult.data) {
      crewResult.data
        .filter((m) => m.phone?.trim())
        .forEach((m) => {
          combined.push({
            id: m.id,
            name: m.name,
            phone: m.phone!,
            email: m.email || null,
            status: 'personal',
            type: 'crew' as const,
          });
        });
    }
    setAllContacts(combined);
  }, [studioSlug]);

  useEffect(() => {
    if (isOpen) {
      setIsInitialLoading(true);
      Promise.all([loadCatalogues(), loadContacts()]).finally(() => setIsInitialLoading(false));
    }
  }, [isOpen, loadCatalogues, loadContacts]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setFormData(initialFormState);
      setEventDate(undefined);
      setSelectedDates([]);
      setMonth(undefined);
      setNameInput('');
      setReferrerInputValue('');
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedDates.length > 1) {
      setSelectedDates((prev) => [prev[0]]);
      return;
    }
    if (selectedDates.length === 1 && isNaN(selectedDates[0].getTime())) {
      setSelectedDates([]);
      setEventDate(undefined);
    }
    if (selectedDates.length === 0 && eventDate !== undefined) setEventDate(undefined);
  }, [selectedDates, eventDate]);

  useEffect(() => {
    if (selectedDates.length > 0) {
      const d = selectedDates[0];
      d.setHours(0, 0, 0, 0);
      setEventDate(formatDateForServer(d));
    } else {
      setEventDate(undefined);
    }
  }, [selectedDates]);

  useEffect(() => {
    if (selectedDates.length === 0) {
      setConflictosPorFecha(new Map());
      return;
    }
    const date = selectedDates[0];
    const dateKey = date.toISOString().split('T')[0];
    verificarDisponibilidadFecha(studioSlug, date, undefined, undefined, undefined)
      .then((result) => {
        if (result.success && result.data && result.data.length > 0) {
          setConflictosPorFecha(new Map([[dateKey, result.data]]));
        } else {
          setConflictosPorFecha(new Map());
        }
      })
      .catch(() => setConflictosPorFecha(new Map()));
  }, [selectedDates, studioSlug]);

  const handleNameChange = (value: string) => {
    setNameInput(value);
    setSelectedContactIndex(-1);
    if (value.includes('@')) {
      const afterAt = value.split('@').pop() || '';
      const search = afterAt.trim();
      const filtered = search
        ? allContacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
        : allContacts.slice(0, 10);
      setFilteredContactSuggestions(filtered);
      setShowContactSuggestions(true);
      setFormData((prev) => ({ ...prev, name: '' }));
    } else {
      setShowContactSuggestions(false);
      setFormData((prev) => ({ ...prev, name: value }));
    }
  };

  const handleSelectContact = (contact: { id: string; name: string; phone: string; email: string | null }) => {
    setNameInput(`@${contact.name}`);
    setFormData((prev) => ({
      ...prev,
      name: contact.name,
      phone: normalizePhone(contact.phone || ''),
      email: contact.email || undefined,
    }));
    setShowContactSuggestions(false);
    setSelectedContactIndex(-1);
  };

  const handleReferrerSelect = (contact: { id: string; name: string; phone: string; status?: string; type?: 'contact' | 'crew' }) => {
    setReferrerInputValue(`@${contact.name}`);
    const refType = contact.type === 'crew' ? 'STAFF' : 'CONTACT';
    setFormData((prev) => ({
      ...prev,
      referrer_id: contact.id,
      referrer_type: refType,
      referrer_contact_id: undefined,
      referrer_name: undefined,
    }));
    setShowReferrerSuggestions(false);
    setSelectedReferrerIndex(-1);
  };

  const handleCreateReferrerContact = async () => {
    if (!newReferrerName.trim() || !newReferrerPhone.trim()) {
      toast.error('Nombre y teléfono son requeridos');
      return;
    }
    const normalized = normalizePhone(newReferrerPhone);
    if (normalized.length !== 10) {
      toast.error('El teléfono debe tener 10 dígitos');
      return;
    }
    setIsCreatingReferrer(true);
    try {
      const result = await createContact(studioSlug, {
        name: newReferrerName.trim(),
        phone: normalized,
        status: 'prospecto',
      });
      if (result.success && result.data) {
        await loadContacts();
        setReferrerInputValue(`@${result.data.name}`);
        setFormData((prev) => ({
          ...prev,
          referrer_id: result.data!.id,
          referrer_type: 'CONTACT',
          referrer_contact_id: undefined,
          referrer_name: undefined,
        }));
        setShowCreateReferrerModal(false);
        setNewReferrerName('');
        setNewReferrerPhone('');
        setShowReferrerSuggestions(false);
        toast.success('Contacto creado y asociado como referido');
      } else {
        toast.error(result.error || 'Error al crear contacto');
      }
    } catch {
      toast.error('Error al crear contacto');
    } finally {
      setIsCreatingReferrer(false);
    }
  };

  const handleTipoEventoCreated = useCallback((newTipo: TipoEventoData) => {
    setEventTypes((prev) => [...prev, { id: newTipo.id, name: newTipo.nombre }]);
    setFormData((prev) => ({ ...prev, event_type_id: newTipo.id }));
    toast.success(`Tipo de evento "${newTipo.nombre}" creado y seleccionado`);
  }, []);

  const canGoNext = () => {
    if (step === 1) return selectedDates.length === 1;
    if (step === 2) {
      const hasName = formData.name?.trim();
      const phoneOk = normalizePhone(formData.phone || '').length === 10;
      const hasChannel = formData.acquisition_channel_id && formData.acquisition_channel_id !== 'none';
      return !!hasName && phoneOk && !!hasChannel;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 2) {
      const newErrors: Record<string, string> = {};
      if (!formData.name?.trim()) newErrors.name = 'El nombre es requerido';
      const ph = normalizePhone(formData.phone || '');
      if (!ph || ph.length !== 10) newErrors.phone = ph.length === 0 ? 'El teléfono es requerido' : 'El teléfono debe tener 10 dígitos';
      if (!formData.acquisition_channel_id || formData.acquisition_channel_id === 'none') newErrors.acquisition_channel_id = 'El canal es requerido';
      if (formData.email?.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) newErrors.email = 'Email inválido';
      }
      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
        toast.error('Completa los campos requeridos');
        return;
      }
    }
    setErrors({});
    if (step < 3) setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!formData.event_type_id || formData.event_type_id === 'none') newErrors.event_type_id = 'El tipo de evento es requerido';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('Completa el tipo de evento');
      return;
    }

    setLoading(true);
    try {
      const eventLocation = formData.event_type_id && formData.event_type_id !== 'none'
        ? (formData.event_location || '').trim() || undefined
        : undefined;
      const durationHours = formData.event_type_id && formData.event_type_id !== 'none' && formData.duration_hours
        ? formData.duration_hours
        : undefined;

      const payload: CreatePromiseData = {
        ...formData,
        phone: normalizePhone(formData.phone || ''),
        event_location: eventLocation,
        duration_hours: durationHours,
        interested_dates: eventDate ? [eventDate] : undefined,
      };

      const result = await createPromise(studioSlug, payload);
      if (result.success && result.data?.promise_id) {
        toast.success('Promesa registrada exitosamente');
        onClose();
        window.dispatchEvent(new CustomEvent('close-overlays'));
        router.push(`/${studioSlug}/studio/commercial/promises/${result.data!.promise_id}`);
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(result.error || 'Error al registrar promesa');
      }
    } catch {
      toast.error('Error al registrar promesa');
    } finally {
      setLoading(false);
    }
  };

  const formatDatesDisplay = () =>
    selectedDates.length === 0 ? 'Seleccionar fecha' : formatDisplayDate(selectedDates[0]);

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    if (showContactSuggestions && filteredContactSuggestions.length > 0 && selectedContactIndex >= 0 && selectedContactIndex < filteredContactSuggestions.length) {
      e.preventDefault();
      handleSelectContact(filteredContactSuggestions[selectedContactIndex]);
    }
    if (showReferrerSuggestions && filteredReferrerContacts.length > 0 && selectedReferrerIndex >= 0 && selectedReferrerIndex < filteredReferrerContacts.length) {
      e.preventDefault();
      handleReferrerSelect(filteredReferrerContacts[selectedReferrerIndex]);
    }
  };

  const nameInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showContactSuggestions || !filteredContactSuggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedContactIndex((i) => (i < filteredContactSuggestions.length - 1 ? i + 1 : i));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedContactIndex((i) => (i > 0 ? i - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowContactSuggestions(false);
      setSelectedContactIndex(-1);
    }
  };

  const referrerInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showReferrerSuggestions || !filteredReferrerContacts.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedReferrerIndex((i) => (i < filteredReferrerContacts.length - 1 ? i + 1 : i));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedReferrerIndex((i) => (i > 0 ? i - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowReferrerSuggestions(false);
      setSelectedReferrerIndex(-1);
    }
  };

  const isReferidos = formData.acquisition_channel_id === getReferidosChannelId();
  const isRedes = formData.acquisition_channel_id === getRedesSocialesChannelId();

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Promesa"
      description="Registra una nueva promesa en 3 pasos"
      maxWidth="xl"
      hideActions
      zIndex={zIndex}
    >
      {/* Stepper */}
      <div className="flex items-center justify-between mb-6">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === s.id ? 'bg-emerald-600 text-white' : step > s.id ? 'bg-emerald-600/50 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                {step > s.id ? '✓' : s.id}
              </div>
              <span className="text-xs mt-1 text-zinc-400">{s.title}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="h-5 w-5 text-zinc-500" />}
          </React.Fragment>
        ))}
      </div>

      {isInitialLoading && step === 1 ? (
        <div className="space-y-4">
          <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
          <div className="h-64 bg-zinc-800 rounded animate-pulse" />
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); step < 3 ? handleNext() : handleSubmit(); }} onKeyDown={handleFormKeyDown} className="space-y-4">
          {/* ——— Paso 1: Disponibilidad ——— */}
          {step === 1 && (
            <>
              <label className="text-sm font-medium text-zinc-300 block mb-2">Fecha de interés</label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setCalendarOpen(!calendarOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 hover:border-zinc-600"
                  >
                    <span className={selectedDates.length === 0 ? 'text-zinc-500' : ''}>{formatDatesDisplay()}</span>
                    <CalendarIcon className="h-4 w-4 text-zinc-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700 z-[9999]" align="start" sideOffset={4}>
                  <div className="p-3">
                    <Calendar
                      mode="single"
                      selected={selectedDates[0]}
                      onSelect={(date) => {
                        if (!date) return;
                        const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
                        setSelectedDates([normalized]);
                        setEventDate(formatDateForServer(normalized));
                        setMonth(normalized);
                      }}
                      month={month}
                      onMonthChange={setMonth}
                      numberOfMonths={1}
                      locale={es}
                      className="border border-zinc-700 rounded-lg"
                    />
                    <div className="flex justify-end gap-2 pt-3 border-t border-zinc-700 mt-3">
                      <ZenButton type="button" variant="ghost" onClick={() => setCalendarOpen(false)}>Cancelar</ZenButton>
                      <ZenButton type="button" variant="primary" onClick={() => setCalendarOpen(false)}>Confirmar</ZenButton>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-zinc-400">La fecha puede estar ocupada; es informativo. Puedes crear la promesa de todos modos.</p>
              {selectedDates.length > 0 && (() => {
                const fecha = selectedDates[0];
                const dateKey = fecha.toISOString().split('T')[0];
                const conflictos = conflictosPorFecha.get(dateKey);
                if (!conflictos?.length) return null;
                return (
                  <ZenCard variant="outlined" className="bg-amber-900/20 border-amber-700/50 mt-2">
                    <ZenCardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <p className="text-xs font-medium text-amber-300">{formatDisplayDate(fecha)} ya está programada:</p>
                          {conflictos.map((c) => (
                            <div key={c.id} className="text-xs text-amber-200/80">
                              {c.contexto === 'promise' ? `Promesa: ${c.contact_name || 'Sin nombre'}` : `Evento: ${c.event_name || 'Sin nombre'}`}
                              {c.time && ` — ${c.time}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    </ZenCardContent>
                  </ZenCard>
                );
              })()}
            </>
          )}

          {/* ——— Paso 2: El Prospecto ——— */}
          {step === 2 && (
            <>
              <div className="relative">
                <ZenInput
                  label="Nombre"
                  value={nameInput}
                  onChange={(e) => { handleNameChange(e.target.value); setErrors((prev) => ({ ...prev, name: '' })); }}
                  onKeyDown={nameInputKeyDown}
                  onFocus={() => nameInput.includes('@') && setShowContactSuggestions(true)}
                  placeholder="Nombre o @contacto existente"
                  error={errors.name}
                />
                {showContactSuggestions && filteredContactSuggestions.length > 0 && (
                  <div className="absolute z-[9999] mt-1 w-full rounded-md border border-zinc-600 bg-zinc-900 shadow-lg max-h-48 overflow-y-auto">
                    {filteredContactSuggestions.map((contact, index) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleSelectContact(contact)}
                        onMouseEnter={() => setSelectedContactIndex(index)}
                        className={`w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 flex items-center gap-2 ${selectedContactIndex === index ? 'bg-zinc-800' : ''}`}
                      >
                        <span className="font-medium">{contact.name}</span>
                        <span className="text-zinc-400 text-xs">({contact.phone})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ZenInput
                  label="Teléfono"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: normalizePhone(e.target.value) }))}
                  error={errors.phone}
                  placeholder="10 dígitos"
                />
                <ZenInput
                  label="Email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value || undefined }))}
                  error={errors.email}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 block">Dirección (opcional)</label>
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value || undefined }))}
                  placeholder="Dirección del cliente"
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <ZenInput
                label="Nota o comentarios"
                value={formData.notes || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Ej: Prima de María"
                maxLength={500}
              />
              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">Canal de Adquisición <span className="text-red-500">*</span></label>
                <select
                  value={formData.acquisition_channel_id || 'none'}
                  onChange={(e) => {
                    const value = e.target.value === 'none' ? '' : e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      acquisition_channel_id: value,
                      ...(value !== getRedesSocialesChannelId() ? { social_network_id: undefined } : {}),
                      ...(value !== getReferidosChannelId() ? { referrer_id: undefined, referrer_type: undefined, referrer_contact_id: undefined, referrer_name: undefined } : {}),
                    }));
                    setReferrerInputValue(value !== getReferidosChannelId() ? '' : referrerInputValue);
                    setShowReferrerSuggestions(false);
                    setErrors((prev) => ({ ...prev, acquisition_channel_id: '' }));
                  }}
                  className={`w-full px-3 py-2.5 h-10 bg-zinc-900 border rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.acquisition_channel_id ? 'border-red-500' : 'border-zinc-700'}`}
                >
                  <option value="none">{acquisitionChannels.length === 0 ? 'Cargando...' : 'Seleccionar canal'}</option>
                  {acquisitionChannels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.acquisition_channel_id && <p className="mt-1 text-xs text-red-500">{errors.acquisition_channel_id}</p>}
              </div>
              {isRedes && (
                <div>
                  <label className="text-sm font-medium text-zinc-300 block mb-2">Red Social</label>
                  <select
                    value={formData.social_network_id || 'none'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, social_network_id: e.target.value === 'none' ? undefined : e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="none">Seleccionar red social</option>
                    {socialNetworks.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                </div>
              )}
              {isReferidos && (
                <div className="relative">
                  <label className="text-sm font-medium text-zinc-300 block mb-2">Referido por</label>
                  <ZenInput
                    placeholder="Escribe nombre o @nombre del contacto..."
                    value={referrerInputValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      setReferrerInputValue(value);
                      setSelectedReferrerIndex(-1);
                      if (value.includes('@')) {
                        const afterAt = value.split('@').pop() || '';
                        const search = afterAt.trim();
                        const filtered = search ? allContacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())) : allContacts.slice(0, 10);
                        setFilteredReferrerContacts(filtered.map((c) => ({ id: c.id, name: c.name, phone: c.phone, status: c.status, type: c.type })));
                        setShowReferrerSuggestions(true);
                        setFormData((prev) => ({ ...prev, referrer_name: undefined }));
                      } else {
                        setReferrerSearchQuery(value.trim());
                        if (value.trim()) {
                          const filtered = allContacts.filter((c) => c.name.toLowerCase().includes(value.trim().toLowerCase()));
                          setFilteredReferrerContacts(filtered.map((c) => ({ id: c.id, name: c.name, phone: c.phone, status: c.status, type: c.type })));
                          setShowReferrerSuggestions(true);
                        } else setShowReferrerSuggestions(false);
                        setFormData((prev) => ({ ...prev, referrer_name: value || undefined, referrer_id: undefined, referrer_type: undefined, referrer_contact_id: undefined }));
                      }
                    }}
                    onKeyDown={referrerInputKeyDown}
                    onFocus={() => {
                      if (referrerInputValue.includes('@')) {
                        const afterAt = referrerInputValue.split('@').pop() || '';
                        const search = afterAt.trim();
                        const filtered = search ? allContacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())) : allContacts.slice(0, 10);
                        setFilteredReferrerContacts(filtered.map((c) => ({ id: c.id, name: c.name, phone: c.phone, status: c.status, type: c.type })));
                      } else if (referrerInputValue.trim()) {
                        const filtered = allContacts.filter((c) => c.name.toLowerCase().includes(referrerInputValue.trim().toLowerCase()));
                        setFilteredReferrerContacts(filtered.map((c) => ({ id: c.id, name: c.name, phone: c.phone, status: c.status, type: c.type })));
                      }
                      setShowReferrerSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => { setShowReferrerSuggestions(false); setSelectedReferrerIndex(-1); }, 200)}
                  />
                  {showReferrerSuggestions && (
                    <div className="absolute z-[9999] mt-1 w-full rounded-md border border-zinc-600 bg-zinc-900 shadow-lg max-h-48 overflow-y-auto">
                      {filteredReferrerContacts.map((contact, index) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => handleReferrerSelect(contact)}
                          onMouseEnter={() => setSelectedReferrerIndex(index)}
                          className={`w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 flex items-center gap-2 ${selectedReferrerIndex === index ? 'bg-zinc-800' : ''}`}
                        >
                          <span className="font-medium">{contact.name}</span>
                          <span className="text-zinc-400 text-xs">({contact.phone})</span>
                        </button>
                      ))}
                      {referrerSearchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => { setNewReferrerName(referrerSearchQuery); setShowCreateReferrerModal(true); setShowReferrerSuggestions(false); }}
                          className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 border-t border-zinc-700"
                        >
                          + Crear contacto &quot;{referrerSearchQuery}&quot;
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ——— Paso 3: El Evento ——— */}
          {step === 3 && (
            <>
              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">Tipo de Evento <span className="text-red-500">*</span></label>
                <select
                  ref={eventTypeSelectRef}
                  value={formData.event_type_id || 'none'}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'create_new') {
                      setShowTipoEventoModal(true);
                      if (eventTypeSelectRef.current) eventTypeSelectRef.current.value = formData.event_type_id || 'none';
                      return;
                    }
                    setFormData((prev) => ({ ...prev, event_type_id: v === 'none' ? '' : v, ...(v === 'none' ? { event_location: '' } : {}) }));
                    setErrors((prev) => ({ ...prev, event_type_id: '' }));
                  }}
                  className={`w-full px-3 py-2.5 h-10 bg-zinc-900 border rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.event_type_id ? 'border-red-500' : 'border-zinc-700'}`}
                >
                  <option value="none">{eventTypes.length === 0 ? 'Cargando...' : 'Seleccionar tipo de evento'}</option>
                  {eventTypes.map((et) => <option key={et.id} value={et.id}>{et.name}</option>)}
                  <option value="create_new" className="text-emerald-400 font-medium">+ Crear evento</option>
                </select>
                {errors.event_type_id && <p className="mt-1 text-xs text-red-500">{errors.event_type_id}</p>}
              </div>
              <ZenInput
                label="Nombre del/los festajado/s"
                placeholder="Ej: Ana, Ana y Roberto"
                value={formData.event_name || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, event_name: e.target.value || undefined }))}
              />
              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">Lugar del Evento</label>
                <input
                  list="location-suggestions"
                  type="text"
                  placeholder="Ej: Salón de eventos, o elige una locación registrada"
                  value={formData.event_location || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, event_location: e.target.value }))}
                  disabled={!formData.event_type_id || formData.event_type_id === 'none'}
                  className="w-full px-3 py-2.5 h-10 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
                <datalist id="location-suggestions">
                  {locations.map((l) => <option key={l.id} value={l.name} />)}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">Duración (horas)</label>
                <ZenInput
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Ej: 6"
                  value={formData.duration_hours?.toString() ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData((prev) => ({ ...prev, duration_hours: v === '' ? undefined : (parseInt(v, 10) || undefined) }));
                  }}
                  disabled={!formData.event_type_id || formData.event_type_id === 'none'}
                  className="w-full h-10 disabled:opacity-50"
                />
              </div>
            </>
          )}

          {/* Footer: Atrás / Siguiente o Crear */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <div>
              {step > 1 && (
                <ZenButton type="button" variant="ghost" onClick={() => { setStep((s) => s - 1); setErrors({}); }}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
                </ZenButton>
              )}
            </div>
            <div className="flex gap-2">
              {step < 3 ? (
                <ZenButton type="submit" variant="primary" disabled={!canGoNext()}>
                  Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                </ZenButton>
              ) : (
                <ZenButton type="submit" variant="primary" loading={loading}>
                  Crear Promesa
                </ZenButton>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Modal crear referido */}
      <ZenDialog
        isOpen={showCreateReferrerModal}
        onClose={() => { setShowCreateReferrerModal(false); setNewReferrerName(''); setNewReferrerPhone(''); }}
        title="Crear Contacto Referido"
        description="Datos mínimos para crear el contacto"
        maxWidth="sm"
        zIndex={zIndex + 10}
      >
        <div className="space-y-4">
          <ZenInput label="Nombre" value={newReferrerName} onChange={(e) => setNewReferrerName(e.target.value)} placeholder="Nombre" required />
          <ZenInput
            label="Teléfono"
            type="tel"
            value={newReferrerPhone}
            onChange={(e) => setNewReferrerPhone(normalizePhone(e.target.value))}
            placeholder="10 dígitos"
            required
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <ZenButton variant="ghost" onClick={() => { setShowCreateReferrerModal(false); setNewReferrerName(''); setNewReferrerPhone(''); }} disabled={isCreatingReferrer}>Cancelar</ZenButton>
            <ZenButton variant="primary" onClick={handleCreateReferrerContact} loading={isCreatingReferrer} disabled={!newReferrerName.trim() || normalizePhone(newReferrerPhone).length !== 10}>Crear y Asociar</ZenButton>
          </div>
        </div>
      </ZenDialog>

      <TipoEventoEnrichedModal
        isOpen={showTipoEventoModal}
        onClose={() => setShowTipoEventoModal(false)}
        onSuccess={handleTipoEventoCreated}
        studioSlug={studioSlug}
        zIndex={zIndex + 10}
      />
    </ZenDialog>
  );
}
