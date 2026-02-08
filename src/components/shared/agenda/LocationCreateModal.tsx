'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Minus, Camera, CalendarDays } from 'lucide-react';
import { z } from 'zod';
import { ZenDialog, ZenButton, ZenInput } from '@/components/ui/zen';
import {
  createQuickLocationByStudioSlug,
  updateLocationByStudioSlug,
} from '@/lib/actions/studio/locations/locations.actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LocationOption } from './LocationSelector';

const MAPS_ERROR_MSG = 'La URL de Google Maps no es válida';

const mapsLinkSchema = z
  .string()
  .optional()
  .refine((v) => !v || v.trim() === '' || z.string().url().safeParse(v.trim()).success, {
    message: MAPS_ERROR_MSG,
  });

const phonePartSchema = z
  .string()
  .refine((v) => !v || /^\d{1,10}$/.test(v.replace(/\s/g, '')), {
    message: 'Solo números, máx. 10 dígitos',
  });

function parsePhonesFromDb(phone: string | null): string[] {
  if (!phone || !phone.trim()) return [''];
  return phone
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

function serializePhonesForDb(phones: string[]): string | undefined {
  const trimmed = phones.map((p) => p.trim().replace(/\s/g, '')).filter(Boolean);
  if (trimmed.length === 0) return undefined;
  return trimmed.join(', ');
}

const TAG_SESSION = 'SESSION';
const TAG_EVENT = 'EVENT';

function tagsToToggles(tags: string[]): { session: boolean; event: boolean } {
  return {
    session: tags.includes(TAG_SESSION),
    event: tags.includes(TAG_EVENT),
  };
}

function togglesToTags(session: boolean, event: boolean): string[] {
  const out: string[] = [];
  if (session) out.push(TAG_SESSION);
  if (event) out.push(TAG_EVENT);
  return out;
}

interface LocationCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  initialName?: string;
  initialData?: LocationOption | null;
  onSuccess: (location: LocationOption) => void;
}

export function LocationCreateModal({
  isOpen,
  onClose,
  studioSlug,
  initialName = '',
  initialData = null,
  onSuccess,
}: LocationCreateModalProps) {
  const isEdit = Boolean(initialData?.id);
  const [name, setName] = useState(initialData?.name ?? initialName);
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [mapsLink, setMapsLink] = useState(initialData?.maps_link ?? '');
  const [permitCost, setPermitCost] = useState(initialData?.permit_cost ?? '');
  const [sessionSelected, setSessionSelected] = useState(false);
  const [eventSelected, setEventSelected] = useState(false);
  const [phones, setPhones] = useState<string[]>(['']);
  const [mapsLinkError, setMapsLinkError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setAddress(initialData.address ?? '');
        setMapsLink(initialData.maps_link ?? '');
        setPermitCost(initialData.permit_cost ?? '');
        const t = tagsToToggles(initialData.tags ?? []);
        setSessionSelected(t.session);
        setEventSelected(t.event);
        setPhones(parsePhonesFromDb(initialData.phone));
      } else {
        setName(initialName);
        setAddress('');
        setMapsLink('');
        setPermitCost('');
        setSessionSelected(false);
        setEventSelected(false);
        setPhones(['']);
      }
      setMapsLinkError(null);
    }
  }, [isOpen, initialName, initialData]);

  const PHONE_MAX_DIGITS = 10;

  const updatePhone = (index: number, value: string) => {
    const next = [...phones];
    next[index] = value.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
    setPhones(next);
  };

  const addPhone = () => {
    setPhones((prev) => [...prev, '']);
  };

  const removePhone = (index: number) => {
    if (phones.length <= 1) return;
    setPhones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMapsLinkError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('El nombre es requerido');
      return;
    }

    const locationTags = togglesToTags(sessionSelected, eventSelected);
    if (locationTags.length === 0) {
      toast.error('Selecciona al menos un tipo de locación (Sesión o Evento)');
      return;
    }

    const mapsResult = mapsLinkSchema.safeParse(mapsLink?.trim() || '');
    if (!mapsResult.success) {
      setMapsLinkError(MAPS_ERROR_MSG);
      return;
    }

    const phoneSerialized = serializePhonesForDb(phones);
    if (phoneSerialized) {
      const parts = phoneSerialized.split(',').map((p) => p.trim());
      for (const part of parts) {
        const r = phonePartSchema.safeParse(part);
        if (!r.success) {
          toast.error('Los teléfonos solo pueden contener números');
          return;
        }
      }
    }

    setLoading(true);
    try {
      const payload = {
        name: trimmedName,
        address: address.trim() || undefined,
        maps_link: mapsLink.trim() || undefined,
        phone: phoneSerialized,
        permit_cost: permitCost.trim() || undefined,
        tags: locationTags,
      };
      if (isEdit && initialData?.id) {
        const res = await updateLocationByStudioSlug(studioSlug, initialData.id, payload);
        if (res.success && res.data) {
          const loc: LocationOption = {
            id: res.data.id,
            name: res.data.name,
            address: res.data.address,
            maps_link: res.data.maps_link,
            phone: res.data.phone,
            permit_cost: res.data.permit_cost,
            tags: res.data.tags ?? initialData.tags ?? [],
          };
          onSuccess(loc);
          toast.success('Locación actualizada');
          onClose();
        } else {
          toast.error(res.error ?? 'Error al actualizar locación');
        }
      } else {
        const res = await createQuickLocationByStudioSlug(studioSlug, payload);
        if (res.success && res.data) {
          const loc: LocationOption = {
            id: res.data.id,
            name: res.data.name,
            address: res.data.address,
            maps_link: res.data.maps_link,
            phone: res.data.phone,
            permit_cost: res.data.permit_cost,
            tags: res.data.tags ?? [],
          };
          onSuccess(loc);
          toast.success('Locación creada');
          onClose();
        } else {
          toast.error(res.error ?? 'Error al crear locación');
        }
      }
    } catch {
      toast.error(isEdit ? 'Error al actualizar locación' : 'Error al crear locación');
    } finally {
      setLoading(false);
    }
  };

  const fieldGroup = 'space-y-1.5';

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar locación' : 'Nueva locación'}
      description={
        isEdit
          ? 'Modifica los datos de la locación.'
          : 'Completa los datos de la locación para usarla en agendamientos.'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className={fieldGroup}>
          <label className="block text-sm font-medium text-zinc-300">
            Nombre <span className="text-red-500">*</span>
          </label>
          <ZenInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Hacienda del Bosque"
            className="w-full"
            required
          />
        </div>
        <div className={fieldGroup}>
          <label className="block text-sm font-medium text-zinc-300">Dirección</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Dirección completa"
            rows={2}
            className="w-full resize-none min-h-[72px] py-2.5 px-3 rounded-md border border-zinc-600 bg-zinc-900 text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>
        <div className={fieldGroup}>
          <label className="block text-sm font-medium text-zinc-300">Link de Google Maps</label>
          <ZenInput
            type="text"
            value={mapsLink}
            onChange={(e) => {
              setMapsLink(e.target.value);
              if (mapsLinkError) setMapsLinkError(null);
            }}
            placeholder="https://maps.google.com/..."
            className="w-full"
          />
          {mapsLinkError && (
            <p className="text-red-500 text-xs mt-1">{mapsLinkError}</p>
          )}
        </div>
        <div className={fieldGroup}>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tipo de locación</label>
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={() => setEventSelected((s) => !s)}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-sm font-medium transition-colors min-w-0',
                eventSelected
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                  : 'bg-zinc-800/60 border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
              )}
            >
              <CalendarDays className="h-4 w-4 shrink-0 opacity-80" />
              Evento
            </button>
            <button
              type="button"
              onClick={() => setSessionSelected((s) => !s)}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-sm font-medium transition-colors min-w-0',
                sessionSelected
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                  : 'bg-zinc-800/60 border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
              )}
            >
              <Camera className="h-4 w-4 shrink-0 opacity-80" />
              Sesión
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-1">Elige al menos uno. Puedes marcar ambos.</p>
        </div>
        <div className={fieldGroup}>
          <label className="block text-sm font-medium text-zinc-300">Costo de permiso (Opcional)</label>
          <ZenInput
            type="text"
            value={permitCost}
            onChange={(e) => setPermitCost(e.target.value)}
            placeholder="Ej: $1,500 o $1,000 - $3,000"
            className="w-full"
          />
        </div>
        <div className={fieldGroup}>
          <label className="block text-sm font-medium text-zinc-300">Teléfono</label>
          <p className="text-xs text-zinc-500">Solo números, máximo 10 dígitos por número.</p>
          <div className="space-y-2">
            {phones.map((value, index) => (
              <div key={index} className="relative w-full">
                <ZenInput
                  type="tel"
                  inputMode="numeric"
                  maxLength={PHONE_MAX_DIGITS}
                  value={value}
                  onChange={(e) => updatePhone(index, e.target.value)}
                  placeholder={index === 0 ? '10 dígitos' : 'Otro número'}
                  className={`w-full ${phones.length > 1 && index < phones.length - 1 ? 'pr-9' : ''}`}
                />
                {phones.length > 1 && index < phones.length - 1 && (
                  <button
                    type="button"
                    onClick={() => removePhone(index)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-700/50 transition-colors"
                    title="Quitar número"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <ZenButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={addPhone}
            className="w-full justify-start text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 -ml-1"
          >
            <Plus className="h-4 w-4 shrink-0" />
            Añadir otro número
          </ZenButton>
        </div>
        <div className="flex gap-2 pt-4">
          <ZenButton type="button" variant="outline" onClick={onClose} className="flex-1 min-w-0">
            Cancelar
          </ZenButton>
          <ZenButton type="submit" loading={loading} disabled={!name.trim()} className="flex-1 min-w-0">
            {isEdit ? 'Guardar cambios' : 'Guardar locación'}
          </ZenButton>
        </div>
      </form>
    </ZenDialog>
  );
}
