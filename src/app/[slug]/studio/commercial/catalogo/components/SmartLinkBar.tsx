'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, Link2Off, X } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { cn } from '@/lib/utils';

export interface SmartLinkItem {
  id: string;
  name: string;
}

interface SmartLinkBarProps {
  isSelectionMode: boolean;
  onActivate: () => void;
  selectedCount: number;
  selectedItems: SmartLinkItem[];
  existingGroupSourceId: string | null;
  onCancel: () => void;
  onConfirm: (parentId: string) => void;
  onUnlink: (sourceId: string) => void | Promise<void>;
  isSaving?: boolean;
}

export function SmartLinkBar({
  isSelectionMode,
  onActivate,
  selectedCount,
  selectedItems,
  existingGroupSourceId,
  onCancel,
  onConfirm,
  onUnlink,
  isSaving = false,
}: SmartLinkBarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [parentId, setParentId] = useState<string>(selectedItems[0]?.id ?? '');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (popoverOpen && selectedItems.length > 0) {
      setParentId(selectedItems[0].id);
    }
  }, [popoverOpen, selectedItems]);

  const handleConfirm = () => {
    if (!parentId) return;
    const linkedIds = selectedItems.map((i) => i.id).filter((id) => id !== parentId);
    if (linkedIds.length === 0) {
      setPopoverOpen(false);
      return;
    }
    onConfirm(parentId);
    setPopoverOpen(false);
  };

  if (!mounted) return null;

  const content = !isSelectionMode ? (
    <div
      className={cn(
        'fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]',
        'transition-all duration-300 rounded-full p-1',
        'backdrop-blur-xl',
        'bg-gradient-to-br from-white/25 via-emerald-400/15 to-emerald-900/60',
        'border border-white/25 shadow-inner shadow-black/20'
      )}
    >
      <ZenButton
        onClick={onActivate}
        size="sm"
        className={cn(
          'rounded-full text-white px-5 py-2.5 gap-2',
          'bg-emerald-600/50 hover:bg-emerald-500/60',
          'border border-white/30 backdrop-blur-sm',
          'shadow-[inset_0_1px_0_rgba(255,255,255,.25)] shadow-lg shadow-black/30'
        )}
      >
        <Link className="h-4 w-4 shrink-0" />
        Activar Smart Link
      </ZenButton>
    </div>
  ) : (
    <div
      className={cn(
        'fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]',
        'flex items-center gap-5 px-5 py-3 rounded-xl max-w-2xl',
        'bg-zinc-900/95 border border-zinc-700 shadow-lg shadow-black/30 backdrop-blur-md',
        'transition-all duration-300'
      )}
    >
      <p className="text-sm text-emerald-100/80 flex-1 min-w-0">
        {selectedCount === 0 ? (
          <>✨ Modo Smart Link activo: Selecciona los ítems que deseas vincular entre sí (deben ser de la misma sección).</>
        ) : (
          <>
            🔗 <span className="font-semibold text-emerald-400">{selectedCount}</span>{' '}
            {selectedCount === 1 ? 'ítem seleccionado' : 'ítems seleccionados'}. Pulsa &quot;Guardar Smart Link&quot; para definir cuál de ellos será el ítem principal.
          </>
        )}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <ZenButton variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-1" />
          Cancelar
        </ZenButton>
        {existingGroupSourceId != null && (
          <ZenButton
            variant="outline"
            size="sm"
            className="border-amber-600/60 text-amber-400 hover:bg-amber-500/10"
            onClick={() => onUnlink(existingGroupSourceId)}
            disabled={isSaving}
          >
            <Link2Off className="h-4 w-4 mr-1" />
            Desvincular Grupo
          </ZenButton>
        )}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <ZenButton
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              disabled={selectedCount < 2 || isSaving}
            >
              <Link className="h-4 w-4 mr-1" />
              Guardar Smart Link
            </ZenButton>
          </PopoverTrigger>
          <PopoverContent side="top" align="center" className="w-80 bg-zinc-900 border-zinc-700 text-zinc-100 shadow-xl shadow-black/40">
            <div className="space-y-4">
              <p className="text-sm font-medium text-zinc-200">Elegir ítem padre</p>
              <p className="text-xs text-zinc-500">
                El ítem padre es el que, al ser seleccionado en una cotización, activará la inclusión automática de todos los demás miembros del grupo.
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedItems.map((item) => (
                  <label
                    key={item.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                      parentId === item.id ? 'bg-emerald-500/20 border border-emerald-500/40' : 'hover:bg-zinc-800'
                    )}
                  >
                    <input
                      type="radio"
                      name="parent"
                      checked={parentId === item.id}
                      onChange={() => setParentId(item.id)}
                      className="rounded-full border-zinc-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-zinc-200 truncate flex-1">{item.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <ZenButton variant="ghost" size="sm" onClick={() => setPopoverOpen(false)}>
                  Cerrar
                </ZenButton>
                <ZenButton
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500"
                  onClick={handleConfirm}
                  disabled={!parentId || isSaving}
                >
                  {isSaving ? 'Guardando…' : 'Confirmar'}
                </ZenButton>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
