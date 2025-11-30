'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { X, AlertCircle } from 'lucide-react';
import {
  ZenDialog,
  ZenButton,
  ZenInput,
  ZenTextarea,
  ZenBadge,
} from '@/components/ui/zen';
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import { crearRevisionCotizacion } from '@/lib/actions/studio/commercial/promises/cotizaciones-revision.actions';
import { CatalogoServiciosTree } from '@/components/shared/catalogo';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';

interface CrearRevisionCotizacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  cotizacionOriginal: NonNullable<EventoDetalle['cotizaciones']>[number];
  onSuccess?: () => void;
}

export function CrearRevisionCotizacionModal({
  isOpen,
  onClose,
  studioSlug,
  cotizacionOriginal,
  onSuccess,
}: CrearRevisionCotizacionModalProps) {
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioPersonalizado, setPrecioPersonalizado] = useState<string | number>('');
  const [items, setItems] = useState<{ [servicioId: string]: number }>({});
  const [catalogo, setCatalogo] = useState<SeccionData[]>([]);
  const [configuracionPrecios, setConfiguracionPrecios] = useState<ConfiguracionPrecios | null>(null);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [filtroServicio, setFiltroServicio] = useState('');
  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set());
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());

  // Inicializar datos desde cotización original
  useEffect(() => {
    if (isOpen && cotizacionOriginal) {
      setNombre(`${cotizacionOriginal.name} - Revisión`);
      setDescripcion(cotizacionOriginal.description || '');
      setPrecioPersonalizado(cotizacionOriginal.price);

      // Cargar items desde cotizacion_items (usar item_id si está disponible)
      const itemsIniciales: { [key: string]: number } = {};
      if (cotizacionOriginal.cotizacion_items) {
        cotizacionOriginal.cotizacion_items.forEach((item) => {
          if (item.item_id) {
            itemsIniciales[item.item_id] = item.quantity;
          }
        });
      }
      setItems(itemsIniciales);
    }
  }, [isOpen, cotizacionOriginal]);

  // Cargar catálogo y configuración
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        setCargandoCatalogo(true);
        const [catalogoResult, configResult] = await Promise.all([
          obtenerCatalogo(studioSlug),
          obtenerConfiguracionPrecios(studioSlug),
        ]);

        if (catalogoResult.success && catalogoResult.data) {
          setCatalogo(catalogoResult.data);
          // Expandir todas las secciones y categorías por defecto
          const todasSecciones = new Set(catalogoResult.data.map((s) => s.id));
          setSeccionesExpandidas(todasSecciones);
          const todasCategorias = new Set<string>();
          catalogoResult.data.forEach((seccion) => {
            seccion.categorias.forEach((cat) => {
              todasCategorias.add(`${seccion.id}-${cat.id}`);
            });
          });
          setCategoriasExpandidas(todasCategorias);
        }

        if (configResult) {
          setConfiguracionPrecios({
            utilidad_servicio: Number(configResult.utilidad_servicio) || 0,
            utilidad_producto: Number(configResult.utilidad_producto) || 0,
            comision_venta: Number(configResult.comision_venta) || 0,
            sobreprecio: Number(configResult.sobreprecio) || 0,
          });
        }
      } catch (error) {
        console.error('Error loading catalog:', error);
        toast.error('Error al cargar el catálogo');
      } finally {
        setCargandoCatalogo(false);
      }
    };

    loadData();
  }, [isOpen, studioSlug]);

  // Calcular precio
  const calculoPrecio = useMemo(() => {
    if (!configuracionPrecios || !catalogo.length) {
      return { total: 0, desglose: [] };
    }

    return calcularPrecio(items, catalogo, configuracionPrecios);
  }, [items, catalogo, configuracionPrecios]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast.error('El nombre de la revisión es requerido');
      return;
    }

    const itemsSeleccionados = Object.entries(items).filter(([, cantidad]) => cantidad > 0);
    if (itemsSeleccionados.length === 0) {
      toast.error('Agrega al menos un servicio');
      return;
    }

    setLoading(true);
    try {
      const precioFinal =
        precioPersonalizado === '' || precioPersonalizado === 0
          ? calculoPrecio.total
          : Number(precioPersonalizado);

      const result = await crearRevisionCotizacion({
        studio_slug: studioSlug,
        cotizacion_original_id: cotizacionOriginal.id,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        precio: precioFinal,
        items: Object.fromEntries(itemsSeleccionados.map(([itemId, cantidad]) => [itemId, cantidad])),
      });

      if (!result.success) {
        toast.error(result.error || 'Error al crear revisión');
        return;
      }

      toast.success('Revisión creada exitosamente');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating revision:', error);
      toast.error('Error al crear revisión');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Crear Revisión de Cotización"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información de la cotización original */}
        <div className="p-4 bg-blue-950/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-300 mb-1">Cotización Original</p>
              <p className="text-sm text-blue-200">{cotizacionOriginal.name}</p>
              <p className="text-xs text-blue-400 mt-1">
                Precio: {formatearMoneda(cotizacionOriginal.price)}
                {cotizacionOriginal.discount && cotizacionOriginal.discount > 0 && (
                  <span className="ml-2">
                    (Descuento: -{formatearMoneda(cotizacionOriginal.discount)})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Nombre de la Revisión *
            </label>
            <ZenInput
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Cotización Boda - Revisión"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Descripción
            </label>
            <ZenTextarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción opcional de la revisión"
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Catálogo de servicios */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Servicios
            </label>
            <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/30 max-h-96 overflow-y-auto">
              {cargandoCatalogo ? (
                <p className="text-sm text-zinc-400">Cargando catálogo...</p>
              ) : (
                <CatalogoServiciosTree
                  catalogo={catalogo}
                  items={items}
                  onItemsChange={setItems}
                  filtroServicio={filtroServicio}
                  onFiltroChange={setFiltroServicio}
                  seccionesExpandidas={seccionesExpandidas}
                  onSeccionesExpandidasChange={setSeccionesExpandidas}
                  categoriasExpandidas={categoriasExpandidas}
                  onCategoriasExpandidasChange={setCategoriasExpandidas}
                />
              )}
            </div>
          </div>

          {/* Precio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Precio Calculado
              </label>
              <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                <p className="text-lg font-semibold text-emerald-400">
                  {formatearMoneda(calculoPrecio.total)}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Precio Personalizado (opcional)
              </label>
              <ZenInput
                type="number"
                value={precioPersonalizado}
                onChange={(e) =>
                  setPrecioPersonalizado(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="0.00"
                min={0}
                step={0.01}
                disabled={loading}
              />
            </div>
          </div>

          {/* Precio final */}
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-300">Precio Final:</span>
              <span className="text-xl font-bold text-emerald-400">
                {formatearMoneda(
                  precioPersonalizado === '' || precioPersonalizado === 0
                    ? calculoPrecio.total
                    : Number(precioPersonalizado)
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <ZenButton type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            Cancelar
          </ZenButton>
          <ZenButton type="submit" loading={loading} disabled={loading}>
            Crear Revisión
          </ZenButton>
        </div>
      </form>
    </ZenDialog>
  );
}
