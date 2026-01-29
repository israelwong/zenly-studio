'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ZenInput, ZenTextarea } from '@/components/ui/zen';
import { Loader2 } from 'lucide-react';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import { toast } from 'sonner';

interface PublicPromiseDataFormProps {
  promiseId: string;
  studioSlug: string;
  initialData?: {
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    contact_address: string | null;
    event_type_name: string | null;
    event_date: Date | null;
    event_name: string | null;
    event_location: string | null;
  };
  onSubmit: (data: {
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    contact_address: string;
    event_name: string;
    event_location: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
  showEventTypeAndDate?: boolean;
  /** Se llama cuando cambia si el formulario tiene diferencias respecto a initialData (solo campos editables) */
  onHasChangesChange?: (hasChanges: boolean) => void;
}

function normalize(s: string | null | undefined): string {
  return (s ?? '').trim();
}

export function PublicPromiseDataForm({
  promiseId,
  studioSlug,
  initialData,
  onSubmit,
  isSubmitting = false,
  showEventTypeAndDate = true,
  onHasChangesChange,
}: PublicPromiseDataFormProps) {
  // Inicializar loading en true si no hay initialData y hay promiseId
  const [loadingPromiseData, setLoadingPromiseData] = useState(!initialData && !!promiseId);
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    contact_address: '',
    event_name: '',
    event_location: '',
    event_date: null as Date | null,
    event_type_name: null as string | null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar datos cuando se monta o cambia initialData
  useEffect(() => {
    if (initialData) {
      setFormData({
        contact_name: initialData.contact_name || '',
        contact_phone: initialData.contact_phone || '',
        contact_email: initialData.contact_email || '',
        contact_address: initialData.contact_address || '',
        event_name: initialData.event_name || '',
        event_location: initialData.event_location || '',
        event_date: initialData.event_date ? new Date(initialData.event_date) : null,
        event_type_name: initialData.event_type_name || null,
      });
      setLoadingPromiseData(false);
    } else if (promiseId) {
      loadPromiseData();
    }
  }, [promiseId, initialData]);

  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    return (
      normalize(formData.contact_name) !== normalize(initialData.contact_name) ||
      normalize(formData.contact_phone) !== normalize(initialData.contact_phone) ||
      normalize(formData.contact_email) !== normalize(initialData.contact_email ?? '') ||
      normalize(formData.contact_address) !== normalize(initialData.contact_address ?? '') ||
      normalize(formData.event_name) !== normalize(initialData.event_name ?? '') ||
      normalize(formData.event_location) !== normalize(initialData.event_location ?? '')
    );
  }, [formData, initialData]);

  useEffect(() => {
    onHasChangesChange?.(hasChanges);
  }, [hasChanges, onHasChangesChange]);

  const loadPromiseData = async () => {
    setLoadingPromiseData(true);
    try {
      const result = await getPublicPromiseData(studioSlug, promiseId);
      if (result.success && result.data?.promise) {
        const promise = result.data.promise;
        setFormData({
          contact_name: promise.contact_name || '',
          contact_phone: promise.contact_phone || '',
          contact_email: promise.contact_email || '',
          contact_address: promise.contact_address || '',
          event_name: promise.event_name || '',
          event_location: promise.event_location || '',
          event_date: promise.event_date ? new Date(promise.event_date) : null,
          event_type_name: promise.event_type_name || null,
        });
      }
    } catch (error) {
      console.error('[PublicPromiseDataForm] Error loading promise data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoadingPromiseData(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.contact_name?.trim()) {
      newErrors.contact_name = 'El nombre es requerido';
    }

    if (!formData.contact_phone?.trim()) {
      newErrors.contact_phone = 'El teléfono es requerido';
    }

    if (!formData.contact_email?.trim()) {
      newErrors.contact_email = 'El correo es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Correo electrónico inválido';
    }

    if (!formData.contact_address?.trim()) {
      newErrors.contact_address = 'La dirección es requerida';
    }

    if (!formData.event_name?.trim()) {
      newErrors.event_name = 'El nombre del evento es requerido';
    }

    if (!formData.event_location?.trim()) {
      newErrors.event_location = 'La locación del evento es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    await onSubmit({
      contact_name: formData.contact_name.trim(),
      contact_phone: formData.contact_phone.trim(),
      contact_email: formData.contact_email.trim(),
      contact_address: formData.contact_address.trim(),
      event_name: formData.event_name.trim(),
      event_location: formData.event_location.trim(),
    });
  };

  // Usar formatDisplayDate que usa métodos UTC exclusivamente
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return formatDisplayDate(date);
  };

  const getEventNameLabel = (eventTypeName: string | null): string => {
    if (!eventTypeName) return 'Nombre del evento';

    const eventTypeLower = eventTypeName.toLowerCase();

    if (eventTypeLower.includes('xv años') || eventTypeLower.includes('quinceañera') || eventTypeLower.includes('15 años')) {
      return 'Nombre de la quinceañera';
    }

    if (eventTypeLower.includes('boda') || eventTypeLower.includes('matrimonio')) {
      return 'Nombre de los novios';
    }

    return 'Nombre del/de los festejado/s';
  };

  if (loadingPromiseData && !initialData) {
    return (
      <div className="space-y-4">
        {/* Skeleton: Datos de contacto */}
        <div className="border-t border-zinc-800 pt-4">
          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
          <div className="h-3 w-full bg-zinc-800 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-10 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div>
              <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-10 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="sm:col-span-2">
              <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-10 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="sm:col-span-2">
              <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-20 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Skeleton: Datos del evento */}
        {showEventTypeAndDate && (
          <div className="border-t border-zinc-800 pt-4">
            <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
                <div className="h-10 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div>
                <div className="h-3 w-28 bg-zinc-800 rounded animate-pulse mb-2" />
                <div className="h-10 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* Skeleton: Nombre y locación */}
        <div className={showEventTypeAndDate ? 'border-t border-zinc-800 pt-4' : ''}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <div className="h-3 w-36 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-10 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="sm:col-span-2">
              <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-10 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Datos de contacto */}
      <div className="border-t border-zinc-800 pt-4">
        <h5 className="text-sm font-semibold text-zinc-300 mb-2">Datos de contacto</h5>
        <p className="text-xs text-zinc-400 mb-4">
          Datos necesarios para poder generar tu contrato de prestación de servicios profesionales
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ZenInput
            label="Nombre"
            value={formData.contact_name}
            onChange={(e) => {
              setFormData({ ...formData, contact_name: e.target.value });
              if (errors.contact_name) {
                setErrors({ ...errors, contact_name: '' });
              }
            }}
            error={errors.contact_name}
            required
            disabled={isSubmitting}
          />
          <ZenInput
            label="Teléfono"
            value={formData.contact_phone}
            onChange={(e) => {
              setFormData({ ...formData, contact_phone: e.target.value });
              if (errors.contact_phone) {
                setErrors({ ...errors, contact_phone: '' });
              }
            }}
            error={errors.contact_phone}
            required
            disabled={isSubmitting}
          />
          <ZenInput
            label="Correo electrónico"
            type="email"
            value={formData.contact_email}
            onChange={(e) => {
              setFormData({ ...formData, contact_email: e.target.value });
              if (errors.contact_email) {
                setErrors({ ...errors, contact_email: '' });
              }
            }}
            error={errors.contact_email}
            required
            disabled={isSubmitting}
            className="sm:col-span-2"
          />
          <ZenTextarea
            label="Dirección"
            value={formData.contact_address}
            onChange={(e) => {
              setFormData({ ...formData, contact_address: e.target.value });
              if (errors.contact_address) {
                setErrors({ ...errors, contact_address: '' });
              }
            }}
            error={errors.contact_address}
            required
            disabled={isSubmitting}
            rows={3}
            className="sm:col-span-2"
          />
        </div>
      </div>

      {/* Datos del evento */}
      {showEventTypeAndDate && (
        <div className="border-t border-zinc-800 pt-4">
          <h5 className="text-sm font-semibold text-zinc-300 mb-4">Datos del evento</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tipo de evento - solo lectura */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Tipo de evento
              </label>
              <div className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400">
                {formData.event_type_name || 'No definido'}
              </div>
            </div>
            {/* Fecha del evento - solo lectura */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Fecha del evento
              </label>
              <div className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400">
                {formData.event_date ? formatDate(formData.event_date) : 'No definida'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nombre y locación del evento */}
      <div className={showEventTypeAndDate ? 'border-t border-zinc-800 pt-4' : ''}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nombre del evento - label dinámico */}
          <ZenInput
            label={getEventNameLabel(formData.event_type_name)}
            value={formData.event_name}
            onChange={(e) => {
              setFormData({ ...formData, event_name: e.target.value });
              if (errors.event_name) {
                setErrors({ ...errors, event_name: '' });
              }
            }}
            error={errors.event_name}
            required
            disabled={isSubmitting}
            className="sm:col-span-2"
          />
          {/* Locación del evento */}
          <ZenInput
            label="Locación del evento"
            value={formData.event_location}
            onChange={(e) => {
              setFormData({ ...formData, event_location: e.target.value });
              if (errors.event_location) {
                setErrors({ ...errors, event_location: '' });
              }
            }}
            error={errors.event_location}
            required
            disabled={isSubmitting}
            className="sm:col-span-2"
          />
        </div>
      </div>
    </form>
  );
}

