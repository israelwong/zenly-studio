'use server';

import { prisma } from '@/lib/prisma';
import { calcularPrecio, type ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';

/**
 * ⚡ GUARDA PRECIOS DE COTIZACIÓN AL AUTORIZAR
 * 
 * FLOW:
 * 1. ResumenCotizacion calcula TODO on-the-fly para mostrar en UI
 * 2. User autoriza → autorizarCotizacion() llamada
 * 3. Esta función SOLO GUARDA esos valores calculados
 * 4. Protege contra futuros cambios en catálogo
 * 
 * CAMPOS:
 * - Operacionales: name, cost, unit_price, subtotal (mutable si se re-edita)
 * - Snapshots: *_snapshot (inmutables, para auditoría/histórico)
 */
export async function guardarEstructuraCotizacionAutorizada(
  tx: any,
  cotizacionId: string,
  studioId: string
): Promise<void> {
  try {
    // 1️⃣ Obtener items con sus datos en catálogo
    const items = await tx.studio_cotizacion_items.findMany({
      where: { cotizacion_id: cotizacionId },
      include: {
        items: {
          select: {
            name: true,
            cost: true,
            expense: true,
            utility_type: true,
          },
        },
        service_categories: {
          select: { name: true },
        },
      },
    });

    if (items.length === 0) return;

    // 2️⃣ Obtener config de precios
    const config = await tx.studio_catalogo_utilidad.findFirst({
      where: { studio_id: studioId },
    });

    if (!config) {
      throw new Error('Configuración de precios no encontrada');
    }

    const configPrecios: ConfiguracionPrecios = {
      utilidad_servicio: Number(config.utilidad_servicio) || 0,
      utilidad_producto: Number(config.utilidad_producto) || 0,
      comision_venta: Number(config.comision_venta) || 0,
      sobreprecio: Number(config.sobreprecio) || 0,
    };

    // 3️⃣ Guardar precios para cada item
    for (const item of items) {
      if (!item.items || !item.service_categories) continue;

      const precios = calcularPrecio(
        item.items.cost || 0,
        item.items.expense || 0,
        item.items.utility_type === 'service' ? 'servicio' : 'producto',
        configPrecios
      );

      await tx.studio_cotizacion_items.update({
        where: { id: item.id },
        data: {
          // OPERACIONALES (lo que se muestra actualmente)
          name: item.items.name,
          category_name: item.service_categories.name,
          cost: item.items.cost || 0,
          expense: item.items.expense || 0,
          unit_price: precios.precio_final,
          subtotal: precios.precio_final * item.quantity,
          profit: precios.utilidad_base,
          public_price: precios.precio_final,
          profit_type: item.items.utility_type === 'service' ? 'servicio' : 'producto',

          // SNAPSHOTS (congelado al momento de autorización)
          name_snapshot: item.items.name,
          category_name_snapshot: item.service_categories.name,
          cost_snapshot: item.items.cost || 0,
          expense_snapshot: item.items.expense || 0,
          unit_price_snapshot: precios.precio_final,
          subtotal_snapshot: precios.precio_final * item.quantity,
          profit_snapshot: precios.utilidad_base,
          public_price_snapshot: precios.precio_final,
          profit_type_snapshot: item.items.utility_type === 'service' ? 'servicio' : 'producto',
        },
      });
    }
  } catch (error) {
    console.error('[PRICING] Error guardando estructura:', error);
    throw error;
  }
}

