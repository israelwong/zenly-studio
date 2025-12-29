'use client';

import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { ZenButton, ZenCheckbox } from '@/components/ui/zen';
import { obtenerUrlConexionUnificada, type GoogleResource } from '@/lib/integrations/google';
import { obtenerEstadoConexion } from '@/lib/integrations/google';
import { toast } from 'sonner';

interface GoogleBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  context?: 'personel' | 'contacts' | null;
  openFullSuite?: boolean; // Si es true, selecciona todos los recursos no conectados
}

export function GoogleBundleModal({
  isOpen,
  onClose,
  studioSlug,
  context = null,
  openFullSuite = false,
}: GoogleBundleModalProps) {
  const [selectedResources, setSelectedResources] = useState<GoogleResource[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [connectedResources, setConnectedResources] = useState<
    GoogleResource[]
  >([]);

  useEffect(() => {
    if (isOpen) {
      loadConnectionStatus();
      // Si el contexto es 'personel', marcar Contacts como seleccionado y bloqueado
      if (context === 'personel') {
        setSelectedResources(['contacts']);
      } else if (context === 'contacts') {
        setSelectedResources(['contacts']);
      }
    } else {
      // Reset al cerrar
      setSelectedResources([]);
    }
  }, [isOpen, context]);

  // Cuando se cargan los recursos conectados, NO seleccionarlos automáticamente
  // Solo seleccionar los que NO están conectados si hay contexto
  useEffect(() => {
    if (isOpen && !statusLoading && connectedResources.length > 0) {
      // Si hay contexto pero el recurso ya está conectado, no seleccionarlo
      if (context === 'personel' || context === 'contacts') {
        // Si contacts ya está conectado, no seleccionarlo
        if (connectedResources.includes('contacts')) {
          setSelectedResources([]);
        }
      }
    }
  }, [isOpen, statusLoading, connectedResources, context]);

  // Efecto separado para seleccionar todos cuando se abre con openFullSuite
  useEffect(() => {
    if (isOpen && openFullSuite && !statusLoading) {
      // Seleccionar todos los recursos no conectados
      const allResources: GoogleResource[] = ['drive', 'calendar', 'contacts'];
      const notConnected = allResources.filter(
        (r) => !connectedResources.includes(r)
      );
      // Si hay recursos no conectados, seleccionarlos todos
      if (notConnected.length > 0) {
        setSelectedResources(notConnected);
      } else {
        // Si todos están conectados, seleccionar todos para permitir reconexión
        setSelectedResources(allResources);
      }
    }
  }, [isOpen, openFullSuite, statusLoading, connectedResources]);

  const loadConnectionStatus = async () => {
    setStatusLoading(true);
    try {
      const status = await obtenerEstadoConexion(studioSlug);
      const connected: GoogleResource[] = [];

      // Verificar cada recurso independientemente: scope + email = conectado
      const hasDriveScope = status.scopes?.some((scope) =>
        scope.includes('drive')
      ) || false;
      const hasCalendarScope = status.scopes?.some((scope) =>
        scope.includes('calendar')
      ) || false;
      const hasContactsScope = status.scopes?.some((scope) =>
        scope.includes('contacts')
      ) || false;

      // Un recurso está conectado si tiene scope + email (el token ya está verificado en obtenerEstadoConexion)
      if (hasDriveScope && !!status.email) connected.push('drive');
      if (hasCalendarScope && !!status.email) connected.push('calendar');
      if (hasContactsScope && !!status.email) connected.push('contacts');

      setConnectedResources(connected);
    } catch (error) {
      console.error('Error cargando estado de conexión:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleResourceToggle = (resource: GoogleResource) => {
    // Si el contexto es 'personel' y el recurso es 'contacts', no permitir desmarcar
    if (context === 'personel' && resource === 'contacts') {
      return;
    }
    if (context === 'contacts' && resource === 'contacts') {
      return;
    }

    setSelectedResources((prev) =>
      prev.includes(resource)
        ? prev.filter((r) => r !== resource)
        : [...prev, resource]
    );
  };

  const handleActivate = async () => {
    if (selectedResources.length === 0) {
      toast.error('Selecciona al menos un servicio');
      return;
    }

    setLoading(true);
    try {
      const result = await obtenerUrlConexionUnificada(
        studioSlug,
        selectedResources,
        window.location.pathname,
        context || undefined
      );

      if (!result.success) {
        toast.error(result.error || 'Error al generar URL de conexión');
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Error activando Google Suite:', error);
      toast.error('Error al activar Google Suite');
    } finally {
      setLoading(false);
    }
  };

  const isResourceLocked = (resource: GoogleResource): boolean => {
    if (context === 'personel' && resource === 'contacts') return true;
    if (context === 'contacts' && resource === 'contacts') return true;
    return false;
  };

  const resources: { key: GoogleResource; label: string; description: string }[] =
    [
      {
        key: 'drive',
        label: 'Google Drive',
        description: 'Sincroniza entregables y archivos',
      },
      {
        key: 'calendar',
        label: 'Google Calendar',
        description: 'Sincroniza eventos y tareas',
      },
      {
        key: 'contacts',
        label: 'Google Contacts',
        description: 'Sincroniza contactos y personal',
      },
    ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            Activar ZEN Google Suite
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Selecciona los servicios de Google que deseas conectar con ZEN
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {resources.map((resource) => {
            const isSelected = selectedResources.includes(resource.key);
            const isConnected = connectedResources.includes(resource.key);
            const isLocked = isResourceLocked(resource.key);
            // Si está conectado y no está bloqueado por contexto, no permitir deseleccionarlo
            const isDisabled = isConnected && !isLocked;

            return (
              <div
                key={resource.key}
                className={`p-4 rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-emerald-950/20 border-emerald-900/50'
                    : isConnected
                    ? 'bg-green-950/10 border-green-900/30'
                    : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                } ${isLocked || isDisabled ? 'opacity-75' : 'cursor-pointer'}`}
                onClick={() => !isLocked && !isDisabled && handleResourceToggle(resource.key)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isLocked || isDisabled ? (
                      <div className="h-5 w-5 rounded border-2 border-emerald-500 bg-emerald-500/20 flex items-center justify-center">
                        <Check className="h-3 w-3 text-emerald-400" />
                      </div>
                    ) : (
                      <ZenCheckbox
                        checked={isSelected}
                        onChange={() => handleResourceToggle(resource.key)}
                        disabled={isLocked || isDisabled}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-zinc-200">
                        {resource.label}
                      </span>
                      {isConnected && (
                        <span className="text-xs text-green-400">Conectado</span>
                      )}
                      {isLocked && (
                        <span className="text-xs text-zinc-500">Requerido</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {resource.description}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <ZenButton variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </ZenButton>
          <ZenButton
            variant="primary"
            onClick={handleActivate}
            loading={loading}
            disabled={selectedResources.length === 0}
          >
            Activar ZEN Google Suite
          </ZenButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

