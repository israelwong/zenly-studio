"use client";

import React, { useCallback, useState, useEffect, useMemo } from "react";
import { ZenCard, ZenButton } from "@/components/ui/zen";
import { Plus, ArrowLeft, Package, Settings } from "lucide-react";
import { ItemCard } from "./ItemCard";
import { ItemSkeleton } from "../shared";
import { calcularPrecio, type ConfiguracionPrecios } from "@/lib/actions/studio/builder/catalogo/calcular-precio";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface Item {
  id: string;
  name: string;
  cost: number;
  tipoUtilidad?: 'servicio' | 'producto';
  mediaSize?: number;
  isNew?: boolean;
  isFeatured?: boolean;
  gastos?: Array<{
    nombre: string;
    costo: number;
  }>;
}

interface ItemFormData {
  id?: string;
  name: string;
  cost: number;
  description?: string;
  tipoUtilidad?: 'servicio' | 'producto';
  gastos?: Array<{
    nombre: string;
    costo: number;
  }>;
}

interface ItemsListViewProps {
  categoriaNombre: string;
  items: Item[];
  onCreateItem: () => void;
  onEditItem: (item: ItemFormData) => void;
  onDeleteItem: (itemId: string, itemName: string) => Promise<void>;
  onReorderItems: (itemIds: string[]) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  preciosConfig?: ConfiguracionPrecios;
  onNavigateToUtilidad?: () => void;
}

/**
 * Componente NIVEL 3 de navegación
 * Lista items de una categoría específica con drag & drop y cálculo dinámico de precios
 */
export function ItemsListView({
  categoriaNombre,
  items,
  onCreateItem,
  onEditItem,
  onDeleteItem,
  onReorderItems,
  onBack,
  isLoading = false,
  preciosConfig,
  onNavigateToUtilidad,
}: ItemsListViewProps) {
  const [configuracion, setConfiguracion] = useState<ConfiguracionPrecios | null>(preciosConfig || null);

  // Configuración por defecto si no se proporciona
  useEffect(() => {
    if (!configuracion && !preciosConfig) {
      setConfiguracion({
        utilidad_servicio: 0.30,
        utilidad_producto: 0.40,
        comision_venta: 0.10,
        sobreprecio: 0.05,
      });
    }
  }, [preciosConfig, configuracion]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Ordenar items por orden (medida de seguridad)
  const itemsOrdenados = useMemo(() => {
    return [...items].sort((a, b) => {
      // Si los items tienen un campo de orden, usarlo
      // Si no, mantener el orden original
      return 0;
    });
  }, [items]);

  // Calcular precios finales para cada item
  const preciosCalculados = useMemo(() => {
    if (!configuracion) return {};

    return itemsOrdenados.reduce(
      (acc, item) => {
        try {
          const totalGastos = item.gastos?.reduce((acc, gasto) => acc + gasto.costo, 0) || 0;
          const resultado = calcularPrecio(
            item.cost,
            totalGastos,
            item.tipoUtilidad || 'servicio', // Usar tipoUtilidad del item
            configuracion
          );
          acc[item.id] = resultado.precio_final;
        } catch (error) {
          console.error(`Error calculando precio para item ${item.id}:`, error);
          acc[item.id] = item.cost;
        }
        return acc;
      },
      {} as Record<string, number>
    );
  }, [itemsOrdenados, configuracion]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = itemsOrdenados.findIndex((item) => item.id === active.id);
      const newIndex = itemsOrdenados.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordenados = Array.from(itemsOrdenados);
        const [removed] = reordenados.splice(oldIndex, 1);
        reordenados.splice(newIndex, 0, removed);

        onReorderItems(reordenados.map((item) => item.id));
      }
    },
    [itemsOrdenados, onReorderItems]
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">
              {categoriaNombre}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Items (arrastra para reordenar)
            </p>
          </div>
          <ZenButton
            onClick={onCreateItem}
            variant="primary"
            className="gap-2"
            disabled={isLoading || !preciosConfig}
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </ZenButton>
        </div>
      </div>

      {/* Lista de items */}
      {isLoading ? (
        <ItemSkeleton />
      ) : !preciosConfig ? (
        <ZenCard className="p-12 text-center border border-amber-500/30 bg-amber-500/5">
          <Settings className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-amber-300 mb-2">Configuración Requerida</h3>
          <p className="text-zinc-400 mb-4">Antes de crear items, necesitas configurar los porcentajes de utilidad.</p>
          <ZenButton
            onClick={onNavigateToUtilidad}
            variant="primary"
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Configurar Utilidades
          </ZenButton>
        </ZenCard>
      ) : itemsOrdenados.length === 0 ? (
        <ZenCard className="p-12 text-center">
          <Package className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-400 mb-4">Sin items</p>
          <ZenButton onClick={onCreateItem} variant="primary">
            <Plus className="w-4 h-4" />
            Crear primer item
          </ZenButton>
        </ZenCard>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={itemsOrdenados.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {itemsOrdenados.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  precioPublico={preciosCalculados[item.id] || item.cost}
                  onEdit={() =>
                    onEditItem({
                      id: item.id,
                      name: item.name,
                      cost: item.cost,
                      tipoUtilidad: item.tipoUtilidad,
                      gastos: item.gastos,
                    })
                  }
                  onDelete={() => onDeleteItem(item.id, item.name)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
