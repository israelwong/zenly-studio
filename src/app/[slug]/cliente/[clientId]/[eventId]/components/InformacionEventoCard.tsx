'use client';

import { useState } from 'react';
import { Edit2, Check, X, Calendar, MapPin, Tag } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenInput, ZenButton } from '@/components/ui/zen';
import { useEvento } from '../context/EventoContext';
import { actualizarEventoInfo } from '@/lib/actions/cliente/eventos.actions';
import { useToast } from '@/hooks/useToast';
import type { ClientEventDetail } from '@/types/client';

interface InformacionEventoCardProps {
  slug: string;
  clientId: string;
  eventId: string;
}

function formatFecha(fecha: string): string {
  try {
    const fechaSolo = fecha.split('T')[0];
    const fechaObj = new Date(fechaSolo + 'T00:00:00');

    return fechaObj.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (error) {
    return 'Fecha no disponible';
  }
}

export function InformacionEventoCard({ slug, clientId, eventId }: InformacionEventoCardProps) {
  const { evento } = useEvento();
  const { addToast } = useToast();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [nameValue, setNameValue] = useState(evento.name || '');
  const [locationValue, setLocationValue] = useState(evento.event_location || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveName = async () => {
    if (nameValue.trim() === (evento.name || '').trim()) {
      setIsEditingName(false);
      return;
    }

    setIsSaving(true);
    try {
      const result = await actualizarEventoInfo(eventId, clientId, {
        name: nameValue.trim() || null,
      });

      if (result.success) {
        addToast({
          type: 'success',
          message: 'Nombre del evento actualizado',
        });
        setIsEditingName(false);
        // Actualizar el contexto si es necesario
        window.location.reload();
      } else {
        addToast({
          type: 'error',
          message: result.message || 'Error al actualizar el nombre',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Error al actualizar el nombre del evento',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelName = () => {
    setNameValue(evento.name || '');
    setIsEditingName(false);
  };

  const handleSaveLocation = async () => {
    if (locationValue.trim() === (evento.event_location || '').trim()) {
      setIsEditingLocation(false);
      return;
    }

    setIsSaving(true);
    try {
      const result = await actualizarEventoInfo(eventId, clientId, {
        event_location: locationValue.trim() || null,
      });

      if (result.success) {
        addToast({
          type: 'success',
          message: 'Sede del evento actualizada',
        });
        setIsEditingLocation(false);
        window.location.reload();
      } else {
        addToast({
          type: 'error',
          message: result.message || 'Error al actualizar la sede',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Error al actualizar la sede del evento',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelLocation = () => {
    setLocationValue(evento.event_location || '');
    setIsEditingLocation(false);
  };

  return (
    <ZenCard>
      <ZenCardHeader>
        <ZenCardTitle>Información del Evento</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="space-y-4">
        {/* Nombre del evento */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-400">Nombre del evento</label>
            {!isEditingName && (
              <button
                onClick={() => setIsEditingName(true)}
                className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors"
                aria-label="Editar nombre"
              >
                <Edit2 className="h-4 w-4 text-zinc-400" />
              </button>
            )}
          </div>
          {isEditingName ? (
            <div className="space-y-2">
              <ZenInput
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                placeholder="Nombre del evento"
                disabled={isSaving}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <ZenButton
                  size="sm"
                  variant="primary"
                  onClick={handleSaveName}
                  disabled={isSaving}
                >
                  <Check className="h-4 w-4" />
                  Guardar
                </ZenButton>
                <ZenButton
                  size="sm"
                  variant="secondary"
                  onClick={handleCancelName}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </ZenButton>
              </div>
            </div>
          ) : (
            <p className="text-base text-zinc-100 font-medium">
              {evento.name || 'Sin nombre'}
            </p>
          )}
        </div>

        {/* Sede del evento */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-400">Sede</label>
            {!isEditingLocation && (
              <button
                onClick={() => setIsEditingLocation(true)}
                className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors"
                aria-label="Editar sede"
              >
                <Edit2 className="h-4 w-4 text-zinc-400" />
              </button>
            )}
          </div>
          {isEditingLocation ? (
            <div className="space-y-2">
              <ZenInput
                value={locationValue}
                onChange={(e) => setLocationValue(e.target.value)}
                placeholder="Sede del evento"
                disabled={isSaving}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <ZenButton
                  size="sm"
                  variant="primary"
                  onClick={handleSaveLocation}
                  disabled={isSaving}
                >
                  <Check className="h-4 w-4" />
                  Guardar
                </ZenButton>
                <ZenButton
                  size="sm"
                  variant="secondary"
                  onClick={handleCancelLocation}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </ZenButton>
              </div>
            </div>
          ) : (
            <p className="text-base text-zinc-100">
              {evento.event_location || 'Sin sede especificada'}
            </p>
          )}
        </div>

        {/* Información adicional (solo lectura) */}
        <div className="pt-4 border-t border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Calendar className="h-4 w-4 text-zinc-500" />
            <span>{formatFecha(evento.event_date)}</span>
          </div>

          {evento.event_type && (
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Tag className="h-4 w-4 text-zinc-500" />
              <span>{evento.event_type.name}</span>
            </div>
          )}

          {evento.address && (
            <div className="flex items-start gap-2 text-sm text-zinc-300">
              <MapPin className="h-4 w-4 text-zinc-500 mt-0.5" />
              <span>{evento.address}</span>
            </div>
          )}
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

