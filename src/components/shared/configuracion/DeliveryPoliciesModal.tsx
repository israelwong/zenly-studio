'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ZenDialog, ZenButton } from '@/components/ui/zen';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { DeliveryPoliciesForm, type DeliveryPoliciesValue } from '@/components/shared/settings/DeliveryPoliciesForm';
import {
  getStudioShareDefaults,
  updateStudioGlobalSettings,
  type StudioGlobalSettings,
} from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';

export interface DeliveryPoliciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  onSaved?: () => void;
}

export function DeliveryPoliciesModal({
  isOpen,
  onClose,
  studioSlug,
  onSaved,
}: DeliveryPoliciesModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState<StudioGlobalSettings | null>(null);
  const [value, setValue] = useState<DeliveryPoliciesValue>({
    dias_entrega_default: '',
    dias_seguridad_default: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !studioSlug) return;
    setError(null);
    setLoading(true);
    getStudioShareDefaults(studioSlug)
      .then((res) => {
        if (res.success && res.data) {
          setDefaults(res.data);
          setValue({
            dias_entrega_default: res.data.dias_entrega_default ?? '',
            dias_seguridad_default: res.data.dias_seguridad_default ?? '',
          });
        } else {
          setError(res.error ?? 'Error al cargar');
        }
      })
      .catch(() => setError('Error al cargar'))
      .finally(() => setLoading(false));
  }, [isOpen, studioSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaults) return;
    const diasEntrega = value.dias_entrega_default === '' ? null : value.dias_entrega_default;
    const diasSeguridad = value.dias_seguridad_default === '' ? null : value.dias_seguridad_default;
    setSaving(true);
    setError(null);
    const result = await updateStudioGlobalSettings(studioSlug, {
      ...defaults,
      dias_entrega_default: diasEntrega,
      dias_seguridad_default: diasSeguridad,
    });
    setSaving(false);
    if (result.success) {
      toast.success('Políticas de entrega actualizadas');
      onClose();
      onSaved?.();
    } else {
      setError(result.error ?? 'Error al guardar');
      toast.error(result.error);
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Políticas de Entrega"
      description="Configura los tiempos estándar de entrega para tus clientes"
      maxWidth="lg"
      zIndex={10100}
      closeOnClickOutside={false}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {loading ? (
          <div className="space-y-5">
            <Skeleton className="h-24 w-full bg-zinc-800 rounded-md" />
            <Skeleton className="h-4 w-3/4 bg-zinc-800" />
            <div className="flex justify-end gap-2 pt-1">
              <Skeleton className="h-9 w-20 bg-zinc-800" />
              <Skeleton className="h-9 w-24 bg-zinc-800" />
            </div>
          </div>
        ) : (
          <>
            <DeliveryPoliciesForm
              value={value}
              onChange={setValue}
              showTitle={false}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
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
