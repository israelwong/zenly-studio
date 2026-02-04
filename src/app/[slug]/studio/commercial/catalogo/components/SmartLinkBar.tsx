'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, Link2Off, X, Layers } from 'lucide-react';
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
        'animate-in fade-in slide-in-from-bottom-2 duration-300',
        'transition-all duration-300'
      )}
    >
      <ZenButton
        onClick={onActivate}
        size="sm"
        className={cn(
          'rounded-full text-white px-5 py-2.5 gap-2',
          // Efecto cristal líquido translúcido (glassmorphism)
          'bg-emerald-600/40 backdrop-blur-xl',
          'hover:bg-emerald-500/50',
          'border border-white/20 shadow-2xl shadow-black/60',
          'transition-all duration-200 hover:scale-105'
        )}
      >
        <Link className="h-4 w-4 shrink-0" />
        <span className="font-semibold">Activar Smart Link</span>
      </ZenButton>
    </div>
  ) : (
    <div
      className={cn(
        // Posicionamiento flotante con animación
        'fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]',
        'animate-in slide-in-from-bottom-4 duration-300',
        // Layout y espaciado generoso (más ancho para evitar apretujamiento)
        'flex items-center gap-8 px-8 py-3 rounded-xl max-w-5xl min-w-[800px]',
        // Efecto cristal líquido translúcido (glassmorphism)
        'bg-zinc-900/40 backdrop-blur-xl',
        'border border-white/10 shadow-2xl shadow-black/60',
        // Efecto de hover sutil
        'transition-all duration-300'
      )}
    >
      {/* Lado izquierdo: Status con icono */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0 h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Layers className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          {selectedCount === 0 ? (
            <div>
              <p className="text-sm font-medium text-zinc-100">Modo Smart Link activo</p>
              <p className="text-xs text-zinc-400">Selecciona ítems de la misma sección para vincular</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-zinc-100">
                <span className="text-emerald-400 font-semibold">{selectedCount}</span> {selectedCount === 1 ? 'ítem vinculado' : 'ítems vinculados'}
              </p>
              <p className="text-xs text-zinc-400">Define el ítem principal al guardar</p>
            </div>
          )}
        </div>
      </div>

      {/* Lado derecho: Acciones con jerarquía clara */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Botón secundario: Cancelar */}
        <ZenButton 
          variant="ghost" 
          size="sm" 
          onClick={onCancel} 
          disabled={isSaving}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
          Cancelar
        </ZenButton>

        {/* Botón terciario: Desvincular (si existe grupo) */}
        {existingGroupSourceId != null && (
          <ZenButton
            variant="outline"
            size="sm"
            className="border-amber-600/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-600/60"
            onClick={() => onUnlink(existingGroupSourceId)}
            disabled={isSaving}
          >
            <Link2Off className="h-4 w-4" />
            Desvincular
          </ZenButton>
        )}

        {/* Botón primario: Guardar Smart Link */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <ZenButton
              variant="primary"
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={selectedCount < 2 || isSaving}
            >
              <Link className="h-4 w-4" />
              Guardar Smart Link
            </ZenButton>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="center" 
            className="w-80 bg-zinc-900/95 backdrop-blur-sm border-zinc-700 text-zinc-100 shadow-xl shadow-black/40"
          >
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-zinc-100 mb-1">Elegir ítem padre</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  El ítem padre activará automáticamente todos los demás ítems del grupo al ser seleccionado en una cotización.
                </p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedItems.map((item) => (
                  <label
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                      parentId === item.id 
                        ? 'bg-purple-500/20 border border-purple-500/40 shadow-sm' 
                        : 'hover:bg-zinc-800 border border-transparent'
                    )}
                  >
                    <input
                      type="radio"
                      name="parent"
                      checked={parentId === item.id}
                      onChange={() => setParentId(item.id)}
                      className="rounded-full border-zinc-600 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-sm text-zinc-200 truncate flex-1 font-medium">{item.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <ZenButton 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPopoverOpen(false)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  Cerrar
                </ZenButton>
                <ZenButton
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
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
