'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Info, ExternalLink } from 'lucide-react';
import { ZenInput, ZenTextarea } from '@/components/ui/zen';
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert';

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

interface Step1IdentityProps {
  formData: Partial<BookingFormData>;
  errors: Record<string, string>;
  onChange: (data: Partial<BookingFormData>) => void;
  isLoading?: boolean;
  studioSlug?: string;
}

export function Step1Identity({ formData, errors, onChange, isLoading = false, studioSlug }: Step1IdentityProps) {
  const handleFieldChange = (field: keyof BookingFormData, value: string) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton: Alerta de privacidad */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="h-4 w-4 bg-zinc-800 rounded animate-pulse shrink-0" />
            <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Skeleton: Campos del formulario */}
        <div className="space-y-4">
          {/* Nombre completo */}
          <div>
            <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="h-10 bg-zinc-800 rounded animate-pulse" />
          </div>

          {/* Teléfono y Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-10 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div>
              <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-10 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <div className="h-3 w-36 bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="h-24 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de privacidad */}
      <Alert variant="default" className="bg-blue-500/10 border-blue-500/20">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-sm text-zinc-300 mt-1">
          Usaremos estos datos únicamente para generar tu contrato de servicios profesionales.
          {studioSlug && (
            <span className="block mt-2">
              <Link
                href={`/${studioSlug}/aviso-privacidad`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors underline"
              >
                <span>Ver aviso de privacidad</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Campos del formulario */}
      <div className="space-y-4">
        <ZenInput
          label="Nombre completo"
          value={formData.contact_name || ''}
          onChange={(e) => handleFieldChange('contact_name', e.target.value)}
          error={errors.contact_name}
          required
          placeholder="Ej: Juan Pérez García"
          className="w-full"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ZenInput
            label="Teléfono"
            type="tel"
            value={formData.contact_phone || ''}
            onChange={(e) => handleFieldChange('contact_phone', e.target.value)}
            error={errors.contact_phone}
            required
            placeholder="Ej: 55 1234 5678"
          />

          <ZenInput
            label="Correo electrónico"
            type="email"
            value={formData.contact_email || ''}
            onChange={(e) => handleFieldChange('contact_email', e.target.value)}
            error={errors.contact_email}
            required
            placeholder="Ej: juan@ejemplo.com"
          />
        </div>

        <ZenTextarea
          label="Dirección completa"
          value={formData.contact_address || ''}
          onChange={(e) => handleFieldChange('contact_address', e.target.value)}
          error={errors.contact_address}
          required
          placeholder="Calle, número, colonia, ciudad, estado, código postal"
          minRows={3}
          hint="Dirección del contratante"
        />
      </div>
    </div>
  );
}
