'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ZenDialog, ZenButton, ZenInput } from '@/components/ui/zen';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import {
  getStudioShareDefaults,
  updateStudioGlobalSettings,
  type StudioGlobalSettings,
} from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';

const CAPACIDAD_UPDATED_EVENT = 'capacidad-operativa-updated';

export interface CapacidadOperativaModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  /** Llamado tras guardar (para que el layout pueda cerrar catálogo, etc.) */
  onSaved?: () => void;
}

export function CapacidadOperativaModal({
  isOpen,
  onClose,
  studioSlug,
  onSaved,
}: CapacidadOperativaModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState<string>('1');
  const [defaults, setDefaults] = useState<StudioGlobalSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !studioSlug) return;
    setError(null);
    setLoading(true);
    getStudioShareDefaults(studioSlug)
      .then((res) => {
        if (res.success && res.data) {
          setDefaults(res.data);
          setValue(String(res.data.max_events_per_day ?? 1));
        } else {
          setError(res.error ?? 'Error al cargar');
        }
      })
      .catch(() => setError('Error al cargar'))
      .finally(() => setLoading(false));
  }, [isOpen, studioSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(value, 10);
    if (Number.isNaN(num) || num < 1) {
      setError('El valor debe ser al menos 1');
      return;
    }
    if (!defaults) return;
    setSaving(true);
    setError(null);
    const result = await updateStudioGlobalSettings(studioSlug, {
      ...defaults,
      max_events_per_day: num,
    });
    setSaving(false);
    if (result.success) {
      toast.success('Capacidad operativa actualizada');
      onClose();
      onSaved?.();
      // Despachar tras cerrar para que el formulario revalide con el nuevo límite ya persistido
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent(CAPACIDAD_UPDATED_EVENT));
      }, 0);
    } else {
      setError(result.error ?? 'Error al guardar');
      toast.error(result.error);
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Capacidad Operativa"
      description="Máximo de eventos que puedes agendar por día en el estudio"
      maxWidth="md"
      zIndex={10100}
      closeOnClickOutside={false}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {loading ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40 bg-zinc-800" />
              <Skeleton className="h-10 w-full bg-zinc-800" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Skeleton className="h-9 w-20 bg-zinc-800" />
              <Skeleton className="h-9 w-24 bg-zinc-800" />
            </div>
          </div>
        ) : (
          <>
            <ZenInput
              type="number"
              min={1}
              label="Eventos máximos por día"
              value={value}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') {
                  setValue(v);
                  return;
                }
                const n = parseInt(v, 10);
                if (!Number.isNaN(n) && n < 1) {
                  setValue('1');
                  return;
                }
                setValue(v);
              }}
              onBlur={() => {
                const n = parseInt(value, 10);
                if (value === '' || Number.isNaN(n) || n < 1) {
                  setValue('1');
                }
              }}
              error={error ?? undefined}
              disabled={saving}
            />
            <div className="flex justify-end gap-2 pt-1">
              <ZenButton type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </ZenButton>
              <ZenButton type="submit" loading={saving}>
                Guardar
              </ZenButton>
            </div>
          </>
        )}
      </form>
    </ZenDialog>
  );
}

/** Nombre del evento que se dispara al guardar capacidad (para que EventFormModal revalide). */
export { CAPACIDAD_UPDATED_EVENT };
