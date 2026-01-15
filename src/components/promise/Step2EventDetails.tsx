'use client';

import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { ZenInput } from '@/components/ui/zen';
import { formatDisplayDateLong } from '@/lib/utils/date-formatter';

interface BookingFormData {
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  event_name: string;
  event_location: string;
  event_date: Date | null;
  event_type_name: string | null;
}

interface Step2EventDetailsProps {
  formData: Partial<BookingFormData>;
  errors: Record<string, string>;
  onChange: (data: Partial<BookingFormData>) => void;
  isLoading?: boolean;
}

export function Step2EventDetails({ formData, errors, onChange, isLoading = false }: Step2EventDetailsProps) {
  const handleFieldChange = (field: keyof BookingFormData, value: string) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  // Usar formatDisplayDateLong que usa métodos UTC exclusivamente
  const formatDate = (date: Date | null): string => {
    if (!date) return 'No definida';
    return formatDisplayDateLong(date);
  };

  // Determinar tipo de evento y labels correspondientes
  const eventTypeName = formData.event_type_name?.toLowerCase() || '';
  const isBoda = eventTypeName.includes('boda') || eventTypeName.includes('matrimonio');
  const isXVAnos = 
    eventTypeName.includes('xv años') || 
    eventTypeName.includes('quinceañera') || 
    eventTypeName.includes('15 años');

  // Determinar qué campos mostrar según el tipo de evento
  const getEventNameFields = () => {
    if (isBoda) {
      // Para bodas: dos campos separados
      // Intentar separar por " y " o " & " o solo usar el valor completo si no hay separador
      const eventNameStr = formData.event_name || '';
      const separator = eventNameStr.includes(' y ') ? ' y ' : (eventNameStr.includes(' & ') ? ' & ' : null);
      const names = separator ? eventNameStr.split(separator).map(s => s.trim()) : [eventNameStr, ''];
      const novioName = names[0] || '';
      const noviaName = names[1] || '';

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ZenInput
            label="Nombre del novio"
            value={novioName}
            onChange={(e) => {
              const novio = e.target.value.trim();
              const novia = noviaName.trim();
              const newValue = novio && novia ? `${novio} y ${novia}` : novio;
              handleFieldChange('event_name', newValue);
            }}
            error={errors.event_name && !novioName ? 'Requerido' : undefined}
            required
            placeholder="Ej: Juan Pérez"
          />
          <ZenInput
            label="Nombre de la novia"
            value={noviaName}
            onChange={(e) => {
              const novio = novioName.trim();
              const novia = e.target.value.trim();
              const newValue = novio && novia ? `${novio} y ${novia}` : (novio || novia);
              handleFieldChange('event_name', newValue);
            }}
            error={errors.event_name && !noviaName ? 'Requerido' : undefined}
            required
            placeholder="Ej: María González"
          />
        </div>
      );
    }

    if (isXVAnos) {
      return (
        <ZenInput
          label="Nombre de la quinceañera"
          value={formData.event_name || ''}
          onChange={(e) => handleFieldChange('event_name', e.target.value)}
          error={errors.event_name}
          required
          placeholder="Ej: Sofía Martínez"
        />
      );
    }

    // Para otros tipos de evento
    return (
      <ZenInput
        label="Nombre del/de los festejado(s)"
        value={formData.event_name || ''}
        onChange={(e) => handleFieldChange('event_name', e.target.value)}
        error={errors.event_name}
        required
        placeholder="Ej: Carlos y Ana"
      />
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton: Fecha del evento */}
        <div>
          <div className="h-3 w-28 bg-zinc-800 rounded animate-pulse mb-2" />
          <div className="flex items-center gap-3 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="h-4 w-4 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="h-3 w-64 bg-zinc-800 rounded animate-pulse mt-1" />
        </div>

        {/* Skeleton: Tipo de evento */}
        <div>
          <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
          <div className="h-10 bg-zinc-800 rounded animate-pulse" />
        </div>

        {/* Skeleton: Nombre del/de los festejado(s) */}
        <div>
          <div className="h-3 w-40 bg-zinc-800 rounded animate-pulse mb-2" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-10 bg-zinc-800 rounded animate-pulse" />
            <div className="h-10 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Skeleton: Locación */}
        <div>
          <div className="h-3 w-36 bg-zinc-800 rounded animate-pulse mb-2" />
          <div className="h-10 bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fecha del evento (Read-only) */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Fecha del evento
        </label>
        <div className="flex items-center gap-3 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400">
          <Calendar className="h-4 w-4 text-zinc-500 shrink-0" />
          <span>{formatDate(formData.event_date)}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          La fecha está vinculada a tu cotización y no puede modificarse aquí.
        </p>
      </div>

      {/* Tipo de evento (Read-only) */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Tipo de evento
        </label>
        <div className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400">
          {formData.event_type_name || 'No definido'}
        </div>
      </div>

      {/* Nombre del/de los festejado(s) - Lógica condicional */}
      <div>
        {getEventNameFields()}
      </div>

      {/* Locación del evento */}
      <div>
        <ZenInput
          label="Lugar o sede del evento"
          value={formData.event_location || ''}
          onChange={(e) => handleFieldChange('event_location', e.target.value)}
          error={errors.event_location}
          required
          placeholder="Ej: Salón Los Jardines, Av. Reforma 123, CDMX"
          icon={MapPin}
          hint="Nombre del salón, dirección o locación donde se realizará el evento"
        />
      </div>
    </div>
  );
}
