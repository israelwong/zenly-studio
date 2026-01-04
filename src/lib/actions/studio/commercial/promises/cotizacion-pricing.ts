'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { calcularPrecio, type ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';

/**
 * ⚡ GUARDA PRECIOS DE COTIZACIÓN AL AUTORIZAR
 * 
 * FLOW:
 * 1. ResumenCotizacion calcula TODO on-the-fly para mostrar en UI
 * 2. User autoriza → autorizarCotizacion() llamada
 * 3. Esta función OBTIENE el mismo catálogo que ResumenCotizacion para obtener COSTOS reales
 * 4. Calcula precios con esos costos
 * 5. Guarda estructura + precios
 * 
 * CAMPOS:
 * - Operacionales: name, cost, unit_price, subtotal (mutable si se re-edita)
 * - Snapshots: *_snapshot (inmutables, para auditoría/histórico)
 */
export async function guardarEstructuraCotizacionAutorizada(
  tx: Prisma.TransactionClient,
  cotizacionId: string,
  configPrecios: ConfiguracionPrecios,
  studioSlug: string
): Promise<void> {
  try {
    // 1️⃣ Obtener catálogo igual que ResumenCotizacion (para tener costos correctos)
    const catalogoResult = await obtenerCatalogo(studioSlug, false);
    if (!catalogoResult.success || !catalogoResult.data) {
      throw new Error('No se pudo obtener el catálogo');
    }

    // Crear mapa de item_id -> datos del catálogo para acceso rápido
    interface DatosCatalogo {
      nombre: string;
      costo: number;
      gasto: number;
      tipoUtilidad: string;
      seccion: string;
      categoria: string;
    }
    const catalogoMap = new Map<string, DatosCatalogo>();
    catalogoResult.data.forEach(seccion => {
      seccion.categorias.forEach(categoria => {
        categoria.servicios.forEach(servicio => {
          catalogoMap.set(servicio.id, {
            nombre: servicio.nombre,
            costo: servicio.costo,
            gasto: servicio.gasto,
            tipoUtilidad: servicio.tipo_utilidad,
            seccion: seccion.nombre,
            categoria: categoria.nombre,
          });
        });
      });
    });

    // 2️⃣ Obtener items de la cotización
    const items = await tx.studio_cotizacion_items.findMany({
      where: { cotizacion_id: cotizacionId },
    });

    if (items.length === 0) return;

    // 3️⃣ Para cada item de la cotización, guardar datos del catálogo
    for (const item of items) {
      if (!item.item_id) continue;

      // Obtener datos del catálogo usando el mapa
      const datosCatalogo = catalogoMap.get(item.item_id);
      if (!datosCatalogo) {
        console.warn(`[PRICING] Item ${item.item_id} no encontrado en catálogo`);
        continue;
      }

      // Validar que tipoUtilidad no sea vacío
      if (!datosCatalogo.tipoUtilidad) {
        console.warn(`[PRICING] ⚠️ Item ${item.item_id} (${datosCatalogo.nombre}) tiene tipoUtilidad vacío`);
      }

      // Normalizar tipoUtilidad: puede venir como 'service', 'servicio', 'product', 'producto', etc.
      const normalizedTipoUtilidad = datosCatalogo.tipoUtilidad?.toLowerCase() || 'service';
      const tipoUtilidadFinal = normalizedTipoUtilidad.includes('service') || normalizedTipoUtilidad.includes('servicio')
        ? 'servicio'
        : 'producto';

      // Calcular precios con valores del catálogo (igual que ResumenCotizacion)
      const precios = calcularPrecio(
        datosCatalogo.costo || 0,
        datosCatalogo.gasto || 0,
        tipoUtilidadFinal,
        configPrecios
      );

      await tx.studio_cotizacion_items.update({
        where: { id: item.id },
        data: {
          // OPERACIONALES (lo que se muestra actualmente - mutable)
          name: datosCatalogo.nombre,
          category_name: datosCatalogo.categoria,
          seccion_name: datosCatalogo.seccion,
          cost: datosCatalogo.costo || 0,
          expense: datosCatalogo.gasto || 0,
          unit_price: precios.precio_final,
          subtotal: precios.precio_final * item.quantity,
          profit: precios.utilidad_base,
          public_price: precios.precio_final,
          profit_type: tipoUtilidadFinal,

          // SNAPSHOTS (congelado al momento de autorización - inmutable para auditoría)
          name_snapshot: datosCatalogo.nombre,
          category_name_snapshot: datosCatalogo.categoria,
          seccion_name_snapshot: datosCatalogo.seccion,
          cost_snapshot: datosCatalogo.costo || 0,
          expense_snapshot: datosCatalogo.gasto || 0,
          unit_price_snapshot: precios.precio_final,
          profit_snapshot: precios.utilidad_base,
          public_price_snapshot: precios.precio_final,
          profit_type_snapshot: tipoUtilidadFinal,
        },
      });
    }
  } catch (error) {
    console.error('[PRICING] Error guardando estructura:', error);
    throw error;
  }
}

/**
 * ⚡ CALCULA Y GUARDA PRECIOS DE COTIZACIÓN AL CREAR/ACTUALIZAR
 * 
 * Similar a guardarEstructuraCotizacionAutorizada pero solo guarda campos operacionales
 * (sin snapshots, que solo se guardan al autorizar)
 */
export async function calcularYGuardarPreciosCotizacion(
  cotizacionId: string,
  studioSlug: string
): Promise<void> {
  console.log(`[PRICING] 🚀 Iniciando cálculo para cotización ${cotizacionId}`);
  try {
    // 1️⃣ Obtener configuración de precios
    const configForm = await obtenerConfiguracionPrecios(studioSlug);
    if (!configForm) {
      console.warn('[PRICING] ⚠️ No hay configuración de precios, no se calcularán precios');
      return;
    }
    console.log('[PRICING] ✅ Configuración de precios obtenida');

    // Convertir a formato ConfiguracionPrecios (decimales)
    const configPrecios: ConfiguracionPrecios = {
      utilidad_servicio: parseFloat(configForm.utilidad_servicio || '0.30'),
      utilidad_producto: parseFloat(configForm.utilidad_producto || '0.20'),
      comision_venta: parseFloat(configForm.comision_venta || '0.10'),
      sobreprecio: parseFloat(configForm.sobreprecio || '0.05'),
    };

    // 2️⃣ Obtener catálogo
    console.log('[PRICING] 📚 Obteniendo catálogo...');
    const catalogoResult = await obtenerCatalogo(studioSlug, false);
    if (!catalogoResult.success || !catalogoResult.data) {
      console.error('[PRICING] ❌ No se pudo obtener el catálogo');
      throw new Error('No se pudo obtener el catálogo');
    }
    console.log(`[PRICING] ✅ Catálogo obtenido: ${catalogoResult.data.length} secciones`);

    // Crear mapa de item_id -> datos del catálogo
    interface DatosCatalogo {
      nombre: string;
      descripcion: string | null;
      costo: number;
      gasto: number;
      tipoUtilidad: string;
      seccion: string;
      categoria: string;
    }
    const catalogoMap = new Map<string, DatosCatalogo>();
    catalogoResult.data.forEach(seccion => {
      seccion.categorias.forEach(categoria => {
        categoria.servicios.forEach(servicio => {
          catalogoMap.set(servicio.id, {
            nombre: servicio.nombre,
            descripcion: null, // Los items no tienen descripción en el catálogo actual
            costo: servicio.costo,
            gasto: servicio.gasto,
            tipoUtilidad: servicio.tipo_utilidad,
            seccion: seccion.nombre,
            categoria: categoria.nombre,
          });
        });
      });
    });

    // 3️⃣ Obtener items de la cotización
    console.log('[PRICING] 📦 Obteniendo items de la cotización...');
    const items = await prisma.studio_cotizacion_items.findMany({
      where: { cotizacion_id: cotizacionId },
    });

    console.log(`[PRICING] ✅ Items encontrados: ${items.length}`);
    if (items.length === 0) {
      console.warn('[PRICING] ⚠️ No hay items para procesar');
      return;
    }

    // 4️⃣ Calcular y guardar precios para cada item
    console.log('[PRICING] 💰 Calculando precios para cada item...');
    let itemsActualizados = 0;
    for (const item of items) {
      if (!item.item_id) {
        console.warn(`[PRICING] ⚠️ Item ${item.id} no tiene item_id`);
        continue;
      }

      const datosCatalogo = catalogoMap.get(item.item_id);
      if (!datosCatalogo) {
        console.warn(`[PRICING] ⚠️ Item ${item.item_id} no encontrado en catálogo`);
        continue;
      }
      console.log(`[PRICING] 📝 Procesando item: ${datosCatalogo.nombre}`);

      // Normalizar tipoUtilidad
      const normalizedTipoUtilidad = datosCatalogo.tipoUtilidad?.toLowerCase() || 'service';
      const tipoUtilidadFinal = normalizedTipoUtilidad.includes('service') || normalizedTipoUtilidad.includes('servicio')
        ? 'servicio'
        : 'producto';

      // Calcular precios
      const precios = calcularPrecio(
        datosCatalogo.costo || 0,
        datosCatalogo.gasto || 0,
        tipoUtilidadFinal,
        configPrecios
      );

      // Guardar campos operacionales Y snapshots (estructura completa desde creación)
      await prisma.studio_cotizacion_items.update({
        where: { id: item.id },
        data: {
          // Campos operacionales (mutables)
          name: datosCatalogo.nombre,
          description: datosCatalogo.descripcion,
          category_name: datosCatalogo.categoria,
          seccion_name: datosCatalogo.seccion,
          cost: datosCatalogo.costo || 0,
          expense: datosCatalogo.gasto || 0,
          unit_price: precios.precio_final,
          subtotal: precios.precio_final * item.quantity,
          profit: precios.utilidad_base,
          public_price: precios.precio_final,
          profit_type: tipoUtilidadFinal,
          // Snapshots (inmutables - estructura jerárquica completa)
          name_snapshot: datosCatalogo.nombre,
          description_snapshot: datosCatalogo.descripcion,
          category_name_snapshot: datosCatalogo.categoria,
          seccion_name_snapshot: datosCatalogo.seccion,
          cost_snapshot: datosCatalogo.costo || 0,
          expense_snapshot: datosCatalogo.gasto || 0,
          unit_price_snapshot: precios.precio_final,
          profit_snapshot: precios.utilidad_base,
          public_price_snapshot: precios.precio_final,
          profit_type_snapshot: tipoUtilidadFinal,
        },
      });
      itemsActualizados++;
      console.log(`[PRICING] ✅ Item actualizado: ${datosCatalogo.nombre} (${item.id})`);
    }
    console.log(`[PRICING] 🎉 Proceso completado: ${itemsActualizados}/${items.length} items actualizados`);
  } catch (error) {
    console.error('[PRICING] ❌ Error calculando y guardando precios:', error);
    throw error;
  }
}

