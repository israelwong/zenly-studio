'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, Plus, Settings2, X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ZenInput } from '@/components/ui/zen';
import { getLocationsByStudioSlug } from '@/lib/actions/studio/locations/locations.actions';
import { LocationCreateModal } from './LocationCreateModal';
import { LocationManagerModal } from './LocationManagerModal';

export interface LocationOption {
  id: string;
  name: string;
  address: string | null;
  maps_link: string | null;
  phone: string | null;
  permit_cost: string | null;
  tags: string[];
}

interface LocationSelectorProps {
  studioSlug: string;
  value: string;
  onValueChange: (name: string) => void;
  selectedLocation: LocationOption | null;
  onSelect: (location: LocationOption) => void;
  onClear?: () => void;
  onLocationUpdated?: (location: LocationOption) => void;
  onLocationDeleted?: (locationId: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function LocationSelector({
  studioSlug,
  value,
  onValueChange,
  selectedLocation,
  onSelect,
  onClear,
  onLocationUpdated,
  onLocationDeleted,
  placeholder = 'Ej: Hacienda del Bosque',
  className,
  disabled,
}: LocationSelectorProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalInitialName, setCreateModalInitialName] = useState('');
  const [createModalInitialData, setCreateModalInitialData] = useState<LocationOption | null>(null);
  const [managerModalOpen, setManagerModalOpen] = useState(false);

  const refetchLocations = useCallback(() => {
    if (!studioSlug) return;
    getLocationsByStudioSlug(studioSlug)
      .then((res) => {
        if (res.success && res.data) setLocations(res.data);
        else setLocations([]);
      });
  }, [studioSlug]);

  useEffect(() => {
    if (!showSuggestions || !studioSlug) return;
    setLoading(true);
    getLocationsByStudioSlug(studioSlug)
      .then((res) => {
        if (res.success && res.data) setLocations(res.data);
        else setLocations([]);
      })
      .finally(() => setLoading(false));
  }, [showSuggestions, studioSlug]);

  const filtered = useMemo(() => {
    if (!value.trim()) return locations;
    const q = value.trim().toLowerCase();
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        (loc.address?.toLowerCase().includes(q) ?? false)
    );
  }, [locations, value]);

  const canAddAsNew = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    return !locations.some(
      (loc) => loc.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
  }, [locations, value]);

  const handleSelect = (loc: LocationOption) => {
    onSelect(loc);
    setShowSuggestions(false);
  };

  const openCreateWithName = () => {
    setCreateModalInitialName(value.trim());
    setCreateModalInitialData(null);
    setCreateModalOpen(true);
    setShowSuggestions(false);
  };

  const openManageLocations = () => {
    setManagerModalOpen(true);
    setShowSuggestions(false);
  };

  const openEditSelected = () => {
    if (!selectedLocation) return;
    setCreateModalInitialData(selectedLocation);
    setCreateModalInitialName('');
    setCreateModalOpen(true);
  };

  const handleCreateOrEditSuccess = (loc: LocationOption) => {
    if (createModalInitialData?.id === loc.id) {
      onSelect(loc);
    } else if (!createModalInitialData) {
      handleSelect(loc);
    } else {
      onSelect(loc);
    }
    setCreateModalOpen(false);
    setCreateModalInitialData(null);
    setCreateModalInitialName('');
    onLocationUpdated?.(loc);
  };

  const handleManagerClose = () => {
    setManagerModalOpen(false);
    refetchLocations();
  };

  return (
    <div className="relative">
      <div className="relative">
        <ZenInput
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            className,
            (selectedLocation && onClear) || selectedLocation ? 'pr-16' : ''
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {selectedLocation && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                openEditSelected();
              }}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
              aria-label="Editar locación"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {selectedLocation && onClear && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onClear();
                setShowSuggestions(false);
              }}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
              aria-label="Desvincular locación"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {showSuggestions && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-600 bg-zinc-900 shadow-lg max-h-60 overflow-y-auto">
          {canAddAsNew && (
            <button
              type="button"
              onClick={openCreateWithName}
              className="w-full px-3 py-2 text-left text-sm text-blue-400 hover:bg-zinc-800 flex items-center gap-2 transition-colors border-b border-zinc-700"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Registrar &quot;{value.trim().length > 40 ? value.trim().slice(0, 40) + '…' : value.trim()}&quot; como nueva locación
            </button>
          )}
          {loading ? (
            <div className="py-4 text-center text-xs text-zinc-500">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-zinc-500">
              {canAddAsNew ? null : 'Escribe para buscar o registrar una locación.'}
            </div>
          ) : (
            filtered.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => handleSelect(loc)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-between gap-2'
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      selectedLocation?.id === loc.id ? 'opacity-100 text-emerald-400' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{loc.name}</span>
                  {loc.address && (
                    <span className="text-xs text-zinc-500 truncate hidden sm:inline"> · {loc.address}</span>
                  )}
                </span>
              </button>
            ))
          )}
          <button
            type="button"
            onClick={openManageLocations}
            className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-zinc-800 flex items-center gap-2 transition-colors border-t border-zinc-700"
          >
            <Settings2 className="h-4 w-4 shrink-0" />
            Gestionar locaciones
          </button>
        </div>
      )}
      <LocationCreateModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setCreateModalInitialData(null);
          setCreateModalInitialName('');
        }}
        studioSlug={studioSlug}
        initialName={createModalInitialName}
        initialData={createModalInitialData}
        onSuccess={handleCreateOrEditSuccess}
      />
      <LocationManagerModal
        isOpen={managerModalOpen}
        onClose={handleManagerClose}
        studioSlug={studioSlug}
        onLocationUpdated={onLocationUpdated}
        onLocationDeleted={onLocationDeleted}
        onRefetch={refetchLocations}
      />
    </div>
  );
}
