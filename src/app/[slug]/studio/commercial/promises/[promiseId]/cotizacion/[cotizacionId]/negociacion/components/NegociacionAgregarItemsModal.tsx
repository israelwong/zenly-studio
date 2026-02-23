'use client';

import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/shadcn/dialog';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { getCatalogShell } from '@/lib/actions/studio/config/catalogo.actions';
import { calcularPrecio } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { CotizacionItem } from '@/lib/utils/negociacion-calc';
import type { SeccionData, ServicioData } from '@/lib/actions/schemas/catalogo-schemas';
import { cn } from '@/lib/utils';

interface NegociacionAgregarItemsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
  configPrecios: ConfiguracionPrecios | null;
  existingItemIds: Set<string>;
  onAddItems: (items: CotizacionItem[]) => void;
}

function flattenServicios(secciones: SeccionData[]): { servicio: ServicioData; seccionNombre: string; categoriaNombre: string }[] {
  const out: { servicio: ServicioData; seccionNombre: string; categoriaNombre: string }[] = [];
  secciones.forEach((sec) => {
    sec.categorias?.forEach((cat) => {
      cat.servicios?.forEach((s) => {
        out.push({ servicio: s, seccionNombre: sec.nombre, categoriaNombre: cat.nombre });
      });
    });
  });
  return out;
}

export function NegociacionAgregarItemsModal({
  open,
  onOpenChange,
  studioSlug,
  configPrecios,
  existingItemIds,
  onAddItems,
}: NegociacionAgregarItemsModalProps) {
  const [secciones, setSecciones] = useState<SeccionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !studioSlug) return;
    setLoading(true);
    getCatalogShell(studioSlug)
      .then((r) => {
        if (r.success && r.data) setSecciones(r.data);
      })
      .finally(() => setLoading(false));
  }, [open, studioSlug]);

  const flat = flattenServicios(secciones);
  const filtered = filtro.trim()
    ? flat.filter(
        ({ servicio, seccionNombre, categoriaNombre }) =>
          (servicio.nombre ?? '')
            .toLowerCase()
            .includes(filtro.toLowerCase()) ||
          seccionNombre.toLowerCase().includes(filtro.toLowerCase()) ||
          categoriaNombre.toLowerCase().includes(filtro.toLowerCase())
      )
    : flat;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (!configPrecios || selected.size === 0) {
      onOpenChange(false);
      return;
    }
    const toAdd: CotizacionItem[] = [];
    const tipoMap = (t: string | undefined) => (t === 'product' || t === 'producto' ? 'producto' : 'servicio');
    selected.forEach((id) => {
      const found = flat.find((f) => f.servicio.id === id);
      if (!found) return;
      const s = found.servicio;
      const cost = s.costo ?? 0;
      const expense = s.gastos?.reduce((a, g) => a + (g.costo ?? 0), 0) ?? 0;
      const tipo = tipoMap(s.tipo_utilidad);
      const resultado = calcularPrecio(cost, expense, tipo, configPrecios);
      const unitPrice = resultado.precio_final ?? 0;
      const newId = `new-${s.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      toAdd.push({
        id: newId,
        item_id: s.id,
        quantity: 1,
        unit_price: unitPrice,
        subtotal: unitPrice,
        cost: cost,
        expense: expense,
        billing_type: (s.billing_type as CotizacionItem['billing_type']) ?? 'SERVICE',
        name: s.nombre ?? null,
        description: null,
        category_name: found.categoriaNombre,
        seccion_name: found.seccionNombre,
        is_courtesy: false,
      });
    });
    onAddItems(toAdd);
    setSelected(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle>Agregar ítems</DialogTitle>
          <DialogDescription>
            Busca y selecciona servicios del catálogo para incluirlos en esta negociación
          </DialogDescription>
        </DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <ZenInput
            placeholder="Buscar por nombre, sección o categoría..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto border border-zinc-700 rounded-lg mt-4 p-2 space-y-1">
          {loading ? (
            <p className="text-sm text-zinc-500 py-4">Cargando catálogo...</p>
          ) : (
            filtered.map(({ servicio, seccionNombre, categoriaNombre }) => {
              const alreadyInQuote = existingItemIds.has(servicio.id);
              const isSelected = selected.has(servicio.id);
              return (
                <button
                  key={servicio.id}
                  type="button"
                  onClick={() => !alreadyInQuote && toggle(servicio.id)}
                  disabled={alreadyInQuote}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg transition-colors',
                    alreadyInQuote && 'opacity-50 cursor-not-allowed',
                    isSelected && 'bg-emerald-500/20 border border-emerald-500/40',
                    !alreadyInQuote && !isSelected && 'hover:bg-zinc-800 border border-transparent'
                  )}
                >
                  <span className="text-sm font-medium text-zinc-200">{servicio.nombre}</span>
                  <span className="text-xs text-zinc-500 ml-2">
                    {seccionNombre} / {categoriaNombre}
                  </span>
                  {alreadyInQuote && (
                    <span className="text-xs text-amber-400 ml-2">(ya en cotización)</span>
                  )}
                </button>
              );
            })
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-700 mt-4">
          <ZenButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </ZenButton>
          <ZenButton
            variant="primary"
            onClick={handleConfirm}
            disabled={selected.size === 0}
          >
            Agregar {selected.size > 0 ? `(${selected.size})` : ''}
          </ZenButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
