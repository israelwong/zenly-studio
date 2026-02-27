'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { calcularPrecio, type ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import { calcularCantidadEfectiva } from '@/lib/utils/dynamic-billing-calc';

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
/**
 * ⚡ VERSIÓN CON TRANSACCIÓN (wrapper): Para compatibilidad con código legacy
 * Internamente llama a la versión sin transacción para evitar timeouts
 */
export async function guardarEstructuraCotizacionAutorizada(
  _tx: Prisma.TransactionClient,
  cotizacionId: string,
  configPrecios: ConfiguracionPrecios,
  studioSlug: string
): Promise<void> {
  // Ignorar tx y usar versión sin transacción para evitar timeouts
  return guardarEstructuraCotizacionAutorizadaSinTx(cotizacionId, configPrecios, studioSlug);
}

/**
 * ⚡ VERSIÓN SIN TRANSACCIÓN: Ejecuta updates fuera de tx para evitar timeouts
 * Los items se actualizan después de la transacción principal
 */
export async function guardarEstructuraCotizacionAutorizadaSinTx(
  cotizacionId: string,
  configPrecios: ConfiguracionPrecios,
  studioSlug: string
): Promise<void> {
  try {
    // ⚡ OPTIMIZACIÓN: Obtener datos ANTES de la transacción para reducir tiempo dentro
    // 1️⃣ Obtener catálogo (fuera de transacción - query pesada)
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
      billingType: 'HOUR' | 'SERVICE' | 'UNIT';
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
            billingType: (servicio.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
          });
        });
      });
    });

    // 2️⃣ Obtener cotización con promise (fuera de transacción)
    const cotizacion = await prisma.studio_cotizaciones.findUnique({
      where: { id: cotizacionId },
      include: {
        promise: {
          select: {
            duration_hours: true,
          },
        },
      },
    });

    if (!cotizacion) {
      throw new Error('Cotización no encontrada');
    }

    // Obtener horas de cobertura: prioridad: cotizacion.event_duration > promise.duration_hours
    const durationHours = cotizacion.event_duration ?? cotizacion.promise?.duration_hours ?? null;

    // 3️⃣ Obtener items de la cotización (fuera de transacción)
    const items = await prisma.studio_cotizacion_items.findMany({
      where: { cotizacion_id: cotizacionId },
    });

    if (items.length === 0) return;

    // ⚡ Preparar todos los updates ANTES de entrar a la transacción
    const updates = items
      .filter(item => item.item_id)
      .map(item => {
        const datosCatalogo = catalogoMap.get(item.item_id!);
        if (!datosCatalogo) {
          console.warn(`[PRICING] Item ${item.item_id} no encontrado en catálogo`);
          return null;
        }

        // Validar que tipoUtilidad no sea vacío
        if (!datosCatalogo.tipoUtilidad) {
          console.warn(`[PRICING] ⚠️ Item ${item.item_id} (${datosCatalogo.nombre}) tiene tipoUtilidad vacío`);
        }

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

        // Obtener billing_type
        const billingType = (item.billing_type || datosCatalogo.billingType || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';

        // Calcular cantidad efectiva
        const cantidadEfectiva = calcularCantidadEfectiva(
          billingType,
          item.quantity,
          durationHours
        );

        return {
          id: item.id,
          data: {
            // OPERACIONALES
            name: datosCatalogo.nombre,
            category_name: datosCatalogo.categoria,
            seccion_name: datosCatalogo.seccion,
            cost: datosCatalogo.costo || 0,
            expense: datosCatalogo.gasto || 0,
            unit_price: precios.precio_final,
            subtotal: precios.precio_final * cantidadEfectiva,
            profit: precios.utilidad_base,
            public_price: precios.precio_final,
            profit_type: tipoUtilidadFinal,
            billing_type: billingType,

            // SNAPSHOTS
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
        };
      })
      .filter((update): update is { id: string; data: any } => update !== null);

    // 4️⃣ Ejecutar updates por bloques secuencialmente (FUERA de transacción)
    // Dividir en bloques de 10 items para balancear velocidad y estabilidad
    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(updates.length / BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
      const batch = updates.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

      // Ejecutar bloque en paralelo (fuera de transacción, más seguro)
      await Promise.all(
        batch.map(update =>
          prisma.studio_cotizacion_items.update({
            where: { id: update.id },
            data: update.data,
          })
        )
      );

      // Pequeña pausa entre bloques para evitar saturación
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
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
  studioSlug: string,
  itemOverrides?: Record<string, {
    name?: string;
    description?: string | null;
    cost?: number;
    expense?: number;
  }>
): Promise<void> {
  try {
    // 1️⃣ Obtener configuración de precios
    const configForm = await obtenerConfiguracionPrecios(studioSlug);
    if (!configForm) {
      console.warn('[PRICING] No hay configuración de precios, no se calcularán precios');
      return;
    }

    // Convertir a formato ConfiguracionPrecios (decimales)
    const configPrecios: ConfiguracionPrecios = {
      utilidad_servicio: parseFloat(configForm.utilidad_servicio || '0.30'),
      utilidad_producto: parseFloat(configForm.utilidad_producto || '0.20'),
      comision_venta: parseFloat(configForm.comision_venta || '0.10'),
      sobreprecio: parseFloat(configForm.sobreprecio || '0.05'),
    };

    // 2️⃣ Obtener catálogo
    const catalogoResult = await obtenerCatalogo(studioSlug, false);
    if (!catalogoResult.success || !catalogoResult.data) {
      throw new Error('No se pudo obtener el catálogo');
    }

    // Crear mapa de item_id -> datos del catálogo
    interface DatosCatalogo {
      nombre: string;
      descripcion: string | null;
      costo: number;
      gasto: number;
      tipoUtilidad: string;
      seccion: string;
      categoria: string;
      billingType: 'HOUR' | 'SERVICE' | 'UNIT';
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
            billingType: (servicio.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
          });
        });
      });
    });

    // 3️⃣ Obtener cotización con promise para obtener duration_hours
    const cotizacion = await prisma.studio_cotizaciones.findUnique({
      where: { id: cotizacionId },
      include: {
        promise: {
          select: {
            duration_hours: true,
          },
        },
      },
    });

    // Obtener horas de cobertura: prioridad: cotizacion.event_duration > promise.duration_hours
    const durationHours = cotizacion?.event_duration ?? cotizacion?.promise?.duration_hours ?? null;

    // 4️⃣ Obtener items de la cotización
    const items = await prisma.studio_cotizacion_items.findMany({
      where: { cotizacion_id: cotizacionId },
    });

    if (items.length === 0) return;

    // 5️⃣ Calcular y guardar precios para cada item
    for (const item of items) {
      // Si es item personalizado (sin item_id), usar datos ya guardados y solo recalcular subtotal
      if (!item.item_id) {
        if (!item.unit_price || item.unit_price === 0) {
          console.warn(`[PRICING] Item personalizado ${item.id} sin precio unitario`);
          continue;
        }

        // Recalcular subtotal basado en cantidad efectiva
        const billingType = (item.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
        const cantidadEfectiva = calcularCantidadEfectiva(
          billingType,
          item.quantity,
          durationHours
        );

        await prisma.studio_cotizacion_items.update({
          where: { id: item.id },
          data: {
            subtotal: item.unit_price * cantidadEfectiva,
            // Mantener todos los demás campos como están
          },
        });
        continue;
      }

      // Item del catálogo: calcular desde catálogo (con overrides si existen)
      const datosCatalogo = catalogoMap.get(item.item_id);
      if (!datosCatalogo) {
        console.warn(`[PRICING] Item ${item.item_id} no encontrado en catálogo`);
        continue;
      }

      // Aplicar overrides si existen (snapshots locales sin modificar catálogo global)
      const override = itemOverrides?.[item.item_id];
      const nombreFinal = override?.name ?? datosCatalogo.nombre;
      const descripcionFinal = override?.description ?? datosCatalogo.descripcion;
      const costoFinal = override?.cost ?? datosCatalogo.costo;
      const gastoFinal = override?.expense ?? datosCatalogo.gasto;

      // Normalizar tipoUtilidad
      const normalizedTipoUtilidad = datosCatalogo.tipoUtilidad?.toLowerCase() || 'service';
      const tipoUtilidadFinal = normalizedTipoUtilidad.includes('service') || normalizedTipoUtilidad.includes('servicio')
        ? 'servicio'
        : 'producto';

      // Calcular precios usando valores finales (con overrides aplicados)
      const precios = calcularPrecio(
        costoFinal || 0,
        gastoFinal || 0,
        tipoUtilidadFinal,
        configPrecios
      );

      // Obtener billing_type: prioridad: item.billing_type > datosCatalogo.billingType > 'SERVICE'
      const billingType = (item.billing_type || datosCatalogo.billingType || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';

      // Calcular cantidad efectiva según billing_type
      const cantidadEfectiva = calcularCantidadEfectiva(
        billingType,
        item.quantity,
        durationHours
      );

      // Guardar campos operacionales Y snapshots (estructura completa desde creación)
      // Los snapshots usan los valores finales (con overrides aplicados) para preservar el estado en el momento de la cotización
      await prisma.studio_cotizacion_items.update({
        where: { id: item.id },
        data: {
          billing_type: billingType, // Persistir billing_type
          // Campos operacionales (mutables) - usar valores finales con overrides
          name: nombreFinal,
          description: descripcionFinal,
          category_name: datosCatalogo.categoria,
          seccion_name: datosCatalogo.seccion,
          cost: costoFinal || 0,
          expense: gastoFinal || 0,
          unit_price: precios.precio_final,
          subtotal: precios.precio_final * cantidadEfectiva, // Usar cantidad efectiva
          profit: precios.utilidad_base,
          public_price: precios.precio_final,
          profit_type: tipoUtilidadFinal,
          // Snapshots (inmutables - usar valores finales con overrides para preservar estado de cotización)
          name_snapshot: nombreFinal,
          description_snapshot: descripcionFinal,
          category_name_snapshot: datosCatalogo.categoria,
          seccion_name_snapshot: datosCatalogo.seccion,
          cost_snapshot: costoFinal || 0,
          expense_snapshot: gastoFinal || 0,
          unit_price_snapshot: precios.precio_final,
          profit_snapshot: precios.utilidad_base,
          public_price_snapshot: precios.precio_final,
          profit_type_snapshot: tipoUtilidadFinal,
        },
      });
    }
  } catch (error) {
    console.error('[PRICING] Error calculando y guardando precios:', error);
    throw error;
  }
}

