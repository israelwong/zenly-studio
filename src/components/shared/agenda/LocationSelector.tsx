'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  const updateRect = useCallback(() => {
    if (containerRef.current) setDropdownRect(containerRef.current.getBoundingClientRect());
    else setDropdownRect(null);
  }, []);

  useLayoutEffect(() => {
    if (!showSuggestions) {
      setDropdownRect(null);
      return;
    }
    updateRect();
    const rafId = requestAnimationFrame(updateRect);

    const scrollParent = (() => {
      let el = containerRef.current?.parentElement ?? null;
      while (el) {
        const style = getComputedStyle(el);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && el.scrollHeight > el.clientHeight) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    })();

    const onScroll = () => updateRect();
    scrollParent?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });

    return () => {
      cancelAnimationFrame(rafId);
      scrollParent?.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [showSuggestions, updateRect]);

  // Lista única por nombre (primer id gana) para evitar duplicados visuales
  const filtered = useMemo(() => {
    const seen = new Set<string>();
    const byName = locations.filter((loc) => {
      const key = loc.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!value.trim()) return byName;
    const q = value.trim().toLowerCase();
    return byName.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        (loc.address?.toLowerCase().includes(q) ?? false)
    );
  }, [locations, value]);

  // No mostrar "Registrar como nueva" si el nombre ya existe (unicidad: sugerir vincular la existente)
  const canAddAsNew = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const normalized = trimmed.toLowerCase();
    return !locations.some(
      (loc) => loc.name.trim().toLowerCase() === normalized
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
    refetchLocations();
    onLocationUpdated?.(loc);
  };

  const handleManagerClose = () => {
    setManagerModalOpen(false);
    refetchLocations();
  };

  const popoverContent = showSuggestions && (
    <div
      className="rounded-md border border-zinc-600 bg-zinc-900 shadow-lg max-h-60 overflow-y-auto"
      onMouseDown={(e) => e.preventDefault()}
    >
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
  );

  const usePortal = typeof document !== 'undefined' && !!dropdownRect;
  const popoverEl =
    showSuggestions &&
    (usePortal && dropdownRect
      ? createPortal(
          <div
            className="fixed z-[99999]"
            style={{
              width: dropdownRect.width,
              left: dropdownRect.left,
              top: dropdownRect.bottom + 4,
            }}
          >
            {popoverContent}
          </div>,
          document.body
        )
      : <div className="absolute z-[99999] mt-1 left-0 right-0">{popoverContent}</div>);

  return (
    <div className="relative" ref={containerRef}>
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
      {popoverEl}
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
