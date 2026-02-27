'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath, revalidateTag } from 'next/cache';
import { notifyEventCreated, notifyCapacityAffectedPromises } from '@/lib/notifications/studio/helpers/event-notifications';
import { getContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
import { getPromiseContractData } from '@/lib/actions/studio/business/contracts/renderer.actions';
import { renderContractContent } from '@/lib/actions/studio/business/contracts/renderer.actions';
import { normalizePaymentDate } from '@/lib/actions/utils/payment-date';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import { toUtcDateOnly } from '@/lib/utils/date-only';
import { checkDateConflict } from '@/lib/utils/booking-conflict';

interface CierreResponse {
  success: boolean;
  data?: {
    id: string;
    cotizacion_id: string;
  };
  error?: string;
}

interface RegistroCierreData {
  condiciones_comerciales_id?: string | null;
  condiciones_comerciales_definidas?: boolean;
  contract_template_id?: string | null;
  contract_content?: string | null;
  contrato_definido?: boolean;
  pago_registrado?: boolean;
  pago_concepto?: string | null;
  pago_monto?: number | null;
  pago_fecha?: Date | null;
  pago_metodo_id?: string | null;
}

/**
 * Obtiene el registro de cierre de una cotizaci?n
 */
export async function obtenerRegistroCierre(
  studioSlug: string,
  cotizacionId: string
): Promise<CierreResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la cotizaci?n pertenece al studio e incluir AMBAS relaciones de condiciones (negociación + catálogo/privada) + items para desglose
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
      include: {
        condicion_comercial_negociacion: true,
        condiciones_comerciales: true,
        cotizacion_items: {
          select: {
            id: true,
            item_id: true,
            quantity: true,
            unit_price: true,
            subtotal: true,
            is_courtesy: true,
            unit_price_snapshot: true,
            public_price_snapshot: true,
          },
        },
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Paralelizar: registro de cierre + última versión del contrato
    const [registro, ultimaVersion] = await Promise.all([
      prisma.studio_cotizaciones_cierre.findUnique({
        where: { cotizacion_id: cotizacionId },
        include: {
          condiciones_comerciales: true,
          contract_template: true,
        },
      }),
      prisma.studio_cotizaciones_cierre_contract_versions.findFirst({
        where: { cotizacion_id: cotizacionId },
        orderBy: { version: 'desc' },
        select: {
          version: true,
          change_reason: true,
          change_type: true,
          created_at: true,
        },
      }),
    ]);

    if (!registro) {
      return { success: false, error: 'Registro de cierre no encontrado' };
    }

    let pago_metodo_nombre: string | null = null;
    if (registro.pago_metodo_id) {
      const metodoPago = await prisma.studio_metodos_pago.findUnique({
        where: { id: registro.pago_metodo_id },
        select: { payment_method_name: true },
      });
      if (metodoPago) {
        pago_metodo_nombre = metodoPago.payment_method_name;
      }
    }

    // Construir condiciones_comerciales: 1) registro cierre, 2) condicion_comercial_negociacion, 3) condiciones_comerciales (catálogo/privada en cotización)
    type CondicionMapeada = {
      id: string;
      name: string;
      description: string | null;
      discount_percentage: number | null;
      advance_type: string | undefined;
      advance_percentage: number | null;
      advance_amount: number | null;
    };
    const mapCondicion = (c: { id: string; name: string; description?: string | null; discount_percentage?: number | null; advance_type?: string | null; advance_percentage?: number | null; advance_amount?: unknown }): CondicionMapeada => ({
      id: c.id,
      name: c.name,
      description: c.description ?? null,
      discount_percentage: c.discount_percentage != null ? Number(c.discount_percentage) : null,
      advance_type: c.advance_type ?? undefined,
      advance_percentage: c.advance_percentage != null ? Number(c.advance_percentage) : null,
      advance_amount: c.advance_amount != null ? Number(c.advance_amount) : null,
    });
    let condicionesComercialesMapeado: CondicionMapeada | null = null;
    if (registro.condiciones_comerciales) {
      condicionesComercialesMapeado = mapCondicion(registro.condiciones_comerciales);
    } else if (cotizacion.condicion_comercial_negociacion) {
      condicionesComercialesMapeado = mapCondicion(cotizacion.condicion_comercial_negociacion);
    } else if (cotizacion.condiciones_comerciales) {
      condicionesComercialesMapeado = mapCondicion(cotizacion.condiciones_comerciales);
    }
    // Rescate: si hay ID pero la relación no vino (ej. condición privada/negociación no incluida en listados públicos), cargar por ID
    const condicionIdParaRescate = condicionesComercialesMapeado
      ? null
      : (registro.condiciones_comerciales_id ?? cotizacion.condiciones_comerciales_id ?? null);
    if (condicionIdParaRescate && studio.id) {
      const condicionRescatada = await prisma.studio_condiciones_comerciales.findFirst({
        where: { id: condicionIdParaRescate, studio_id: studio.id },
        select: {
          id: true,
          name: true,
          description: true,
          discount_percentage: true,
          advance_type: true,
          advance_percentage: true,
          advance_amount: true,
        },
      });
      if (condicionRescatada) {
        condicionesComercialesMapeado = mapCondicion({
          id: condicionRescatada.id,
          name: condicionRescatada.name,
          description: condicionRescatada.description ?? null,
          discount_percentage: condicionRescatada.discount_percentage ?? null,
          advance_type: condicionRescatada.advance_type ?? null,
          advance_percentage: condicionRescatada.advance_percentage ?? null,
          advance_amount: condicionRescatada.advance_amount ?? null,
        });
      }
    }
    const condicionesDefinidas =
      registro.condiciones_comerciales_definidas ||
      !!cotizacion.condicion_comercial_negociacion ||
      !!cotizacion.condiciones_comerciales ||
      !!condicionesComercialesMapeado;

    // Desglose para tarjeta de cierre (precio lista, bono, cortesías) — misma lógica que getDatosConfirmarCierre
    const itemsCortesiaArr = Array.isArray(cotizacion.items_cortesia) ? (cotizacion.items_cortesia as string[]) : [];
    const itemsCortesiaIds = new Set(itemsCortesiaArr);
    const allItems = cotizacion.cotizacion_items ?? [];
    let cortesias_monto = 0;
    let cortesias_count = 0;
    for (const i of allItems) {
      const esCortesia = (i as { is_courtesy?: boolean }).is_courtesy === true || itemsCortesiaIds.has(i.id) || (i.item_id != null && itemsCortesiaIds.has(i.item_id));
      if (!esCortesia) continue;
      cortesias_count += 1;
      const qty = (i as { quantity?: number }).quantity ?? 1;
      const precioUnit = Number((i as { unit_price?: unknown }).unit_price ?? 0);
      const snapshot = Number((i as { unit_price_snapshot?: number }).unit_price_snapshot ?? 0);
      const publicSnapshot = Number((i as { public_price_snapshot?: number }).public_price_snapshot ?? 0);
      const valorComercial = precioUnit > 0 ? precioUnit * qty : (snapshot > 0 ? snapshot : publicSnapshot) * qty;
      cortesias_monto += valorComercial > 0 ? valorComercial : Number((i as { subtotal?: unknown }).subtotal ?? 0);
    }
    const desglose_cierre = {
      precio_calculado: cotizacion.precio_calculado != null ? Number(cotizacion.precio_calculado) : null,
      bono_especial: cotizacion.bono_especial != null ? Number(cotizacion.bono_especial) : null,
      cortesias_monto,
      cortesias_count,
    };

    // Convertir Decimal a number para serialización
    return {
      success: true,
      data: {
        id: registro.id,
        cotizacion_id: registro.cotizacion_id,
        condiciones_comerciales_id: registro.condiciones_comerciales_id,
        contract_template_id: registro.contract_template_id,
        contract_content: registro.contract_content,
        contract_version: registro.contract_version,
        contract_signed_at: registro.contract_signed_at,
        contrato_definido: registro.contrato_definido,
        pago_registrado: registro.pago_registrado,
        pago_concepto: registro.pago_concepto,
        pago_monto: registro.pago_monto ? Number(registro.pago_monto) : null,
        pago_fecha: registro.pago_fecha,
        pago_metodo_id: registro.pago_metodo_id,
        pago_metodo_nombre,
        condiciones_comerciales: condicionesComercialesMapeado,
        condiciones_comerciales_definidas: condicionesDefinidas,
        contract_template: registro.contract_template,
        ultima_version_info: ultimaVersion ? {
          version: ultimaVersion.version,
          change_reason: ultimaVersion.change_reason,
          change_type: ultimaVersion.change_type,
          created_at: ultimaVersion.created_at,
        } : null,
        negociacion_precio_original: cotizacion.negociacion_precio_original !== null && cotizacion.negociacion_precio_original !== undefined
          ? Number(cotizacion.negociacion_precio_original)
          : null,
        negociacion_precio_personalizado: cotizacion.negociacion_precio_personalizado !== null && cotizacion.negociacion_precio_personalizado !== undefined
          ? Number(cotizacion.negociacion_precio_personalizado)
          : null,
        desglose_cierre,
      } as any,
    };
  } catch (error) {
    console.error('[obtenerRegistroCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener registro de cierre',
    };
  }
}

/**
 * Crea un registro de cierre para una cotizaci?n
 * Se llama autom?ticamente al pasar una cotizaci?n a estado "en_cierre"
 */
export async function crearRegistroCierre(
  studioSlug: string,
  cotizacionId: string
): Promise<CierreResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la cotizaci?n pertenece al studio
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Verificar que no exista ya un registro
    const existente = await prisma.studio_cotizaciones_cierre.findUnique({
      where: { cotizacion_id: cotizacionId },
    });

    if (existente) {
      return {
        success: true,
        data: {
          id: existente.id,
          cotizacion_id: existente.cotizacion_id,
        },
      };
    }

    // Crear registro nuevo (pago explícitamente null/0 — sin default monetario)
    const registro = await prisma.studio_cotizaciones_cierre.create({
      data: {
        cotizacion_id: cotizacionId,
        pago_registrado: false,
        pago_concepto: null,
        pago_monto: null,
        pago_fecha: null,
        pago_metodo_id: null,
      },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    if (cotizacion.promise_id) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
    }

    return {
      success: true,
      data: {
        id: registro.id,
        cotizacion_id: registro.cotizacion_id,
      },
    };
  } catch (error) {
    console.error('[crearRegistroCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear registro de cierre',
    };
  }
}

/**
 * Actualiza las condiciones comerciales en el registro de cierre
 */
export async function actualizarCondicionesCierre(
  studioSlug: string,
  cotizacionId: string,
  condicionesId: string
): Promise<CierreResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la cotizaci?n pertenece al studio
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Actualizar o crear registro de cierre
    const registro = await prisma.studio_cotizaciones_cierre.upsert({
      where: { cotizacion_id: cotizacionId },
      create: {
        cotizacion_id: cotizacionId,
        condiciones_comerciales_id: condicionesId,
        condiciones_comerciales_definidas: true,
      },
      update: {
        condiciones_comerciales_id: condicionesId,
        condiciones_comerciales_definidas: true,
      },
    });

    // Sin revalidatePath: actualización local vía onSuccess en el cliente
    return {
      success: true,
      data: {
        id: registro.id,
        cotizacion_id: registro.cotizacion_id,
      },
    };
  } catch (error) {
    console.error('[actualizarCondicionesCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar condiciones comerciales',
    };
  }
}

/**
 * Obtiene solo los datos del contrato para actualizaci?n local (sin recargar todo el registro)
 */
export async function obtenerDatosContratoCierre(
  studioSlug: string,
  cotizacionId: string
): Promise<{
  success: boolean;
  data?: {
    contract_version?: number;
    contract_template_id?: string | null;
    contract_content?: string | null;
    contract_signed_at?: Date | null;
    contrato_definido?: boolean;
    ultima_version_info?: {
      version: number;
      change_reason: string | null;
      change_type: string;
      created_at: Date;
    } | null;
  };
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    const registro = await prisma.studio_cotizaciones_cierre.findUnique({
      where: { cotizacion_id: cotizacionId },
      select: {
        contract_version: true,
        contract_template_id: true,
        contract_content: true,
        contract_signed_at: true,
        contrato_definido: true,
      },
    });

    if (!registro) {
      return { success: false, error: 'Registro de cierre no encontrado' };
    }

    // Obtener informaci?n de la ?ltima versi?n del contrato
    const ultimaVersion = await prisma.studio_cotizaciones_cierre_contract_versions.findFirst({
      where: { cotizacion_id: cotizacionId },
      orderBy: { version: 'desc' },
      select: {
        version: true,
        change_reason: true,
        change_type: true,
        created_at: true,
      },
    });

    return {
      success: true,
      data: {
        contract_version: registro.contract_version,
        contract_template_id: registro.contract_template_id,
        contract_content: registro.contract_content,
        contract_signed_at: registro.contract_signed_at,
        contrato_definido: registro.contrato_definido,
        ultima_version_info: ultimaVersion ? {
          version: ultimaVersion.version,
          change_reason: ultimaVersion.change_reason,
          change_type: ultimaVersion.change_type,
          created_at: ultimaVersion.created_at,
        } : null,
      },
    };
  } catch (error) {
    console.error('[obtenerDatosContratoCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener datos del contrato',
    };
  }
}

/**
 * Obtener solo datos de condiciones comerciales para actualizaci?n local
 */
export async function obtenerDatosCondicionesCierre(
  studioSlug: string,
  cotizacionId: string
): Promise<{
  success: boolean;
  data?: {
    condiciones_comerciales_id?: string | null;
    condiciones_comerciales_definidas?: boolean;
    condiciones_comerciales?: {
      id: string;
      name: string;
      description?: string | null;
      discount_percentage?: number | null;
      advance_type?: string;
      advance_percentage?: number | null;
      advance_amount?: number | null;
    } | null;
  };
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    const registro = await prisma.studio_cotizaciones_cierre.findUnique({
      where: { cotizacion_id: cotizacionId },
      select: {
        condiciones_comerciales_id: true,
        condiciones_comerciales_definidas: true,
        condiciones_comerciales: true,
      },
    });

    if (!registro) {
      return { success: false, error: 'Registro de cierre no encontrado' };
    }

    return {
      success: true,
      data: {
        condiciones_comerciales_id: registro.condiciones_comerciales_id,
        condiciones_comerciales_definidas: registro.condiciones_comerciales_definidas,
        condiciones_comerciales: registro.condiciones_comerciales ? {
          id: registro.condiciones_comerciales.id,
          name: registro.condiciones_comerciales.name,
          description: registro.condiciones_comerciales.description,
          discount_percentage: registro.condiciones_comerciales.discount_percentage ? Number(registro.condiciones_comerciales.discount_percentage) : null,
          advance_type: registro.condiciones_comerciales.advance_type || undefined,
          advance_percentage: registro.condiciones_comerciales.advance_percentage ? Number(registro.condiciones_comerciales.advance_percentage) : null,
          advance_amount: registro.condiciones_comerciales.advance_amount ? Number(registro.condiciones_comerciales.advance_amount) : null,
        } : null,
      },
    };
  } catch (error) {
    console.error('[obtenerDatosCondicionesCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener datos de condiciones',
    };
  }
}

/**
 * Obtener solo datos de pago para actualizaci?n local
 */
export async function obtenerDatosPagoCierre(
  studioSlug: string,
  cotizacionId: string
): Promise<{
  success: boolean;
  data?: {
    pago_registrado?: boolean;
    pago_concepto?: string | null;
    pago_monto?: number | null;
    pago_fecha?: Date | null;
    pago_metodo_id?: string | null;
    pago_metodo_nombre?: string | null;
  };
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    const registro = await prisma.studio_cotizaciones_cierre.findUnique({
      where: { cotizacion_id: cotizacionId },
      select: {
        pago_registrado: true,
        pago_concepto: true,
        pago_monto: true,
        pago_fecha: true,
        pago_metodo_id: true,
      },
    });

    if (!registro) {
      return { success: false, error: 'Registro de cierre no encontrado' };
    }

    // Obtener nombre del m?todo de pago si existe
    let pago_metodo_nombre: string | null = null;
    if (registro.pago_metodo_id) {
      const metodoPago = await prisma.studio_metodos_pago.findUnique({
        where: { id: registro.pago_metodo_id },
        select: { payment_method_name: true },
      });
      if (metodoPago) {
        pago_metodo_nombre = metodoPago.payment_method_name;
      }
    }

    return {
      success: true,
      data: {
        pago_registrado: registro.pago_registrado,
        pago_concepto: registro.pago_concepto,
        pago_monto: registro.pago_monto ? Number(registro.pago_monto) : null,
        pago_fecha: registro.pago_fecha,
        pago_metodo_id: registro.pago_metodo_id,
        pago_metodo_nombre,
      },
    };
  } catch (error) {
    console.error('[obtenerDatosPagoCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener datos de pago',
    };
  }
}

/**
 * Quitar condiciones comerciales del proceso de cierre
 */
export async function quitarCondicionesCierre(
  studioSlug: string,
  cotizacionId: string
): Promise<CierreResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la cotizaci?n pertenece al studio
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Actualizar registro de cierre para quitar condiciones
    const registro = await prisma.studio_cotizaciones_cierre.update({
      where: { cotizacion_id: cotizacionId },
      data: {
        condiciones_comerciales_id: null,
        condiciones_comerciales_definidas: false,
      },
    });

    // Sin revalidatePath: actualización local en el cliente
    return {
      success: true,
      data: {
        id: registro.id,
        cotizacion_id: registro.cotizacion_id,
      },
    };
  } catch (error) {
    console.error('[quitarCondicionesCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al quitar condiciones comerciales',
    };
  }
}

/**
 * Actualiza el contrato en el registro de cierre
 */
export async function actualizarContratoCierre(
  studioSlug: string,
  cotizacionId: string,
  templateId: string,
  customContent?: string | null,
  promiseId?: string
): Promise<CierreResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la cotizaci?n pertenece al studio
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
      select: {
        id: true,
        promise_id: true,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Obtener promiseId desde cotización si no se proporcionó
    const finalPromiseId = promiseId || cotizacion.promise_id;

    // Si templateId est? vac?o, limpiar el contrato
    const isClearing = !templateId || templateId.trim() === '';

    // Normalizar customContent: si es un objeto, extraer el string
    let contentToSave: string | null = null;
    if (customContent) {
      if (typeof customContent === 'string') {
        contentToSave = customContent;
      } else if (typeof customContent === 'object' && customContent !== null && 'content' in customContent) {
        // Si viene como objeto { content: "..." }, extraer el string
        contentToSave = String((customContent as any).content);
      } else {
        contentToSave = String(customContent);
      }
    }

    // Obtener registro actual para versionado
    const registroActual = await prisma.studio_cotizaciones_cierre.findUnique({
      where: { cotizacion_id: cotizacionId },
      select: {
        contract_content: true,
        contract_version: true,
        contract_template_id: true,
      },
    });

    // Determinar si es una edici?n manual del estudio (customContent presente)
    const isManualEdit = customContent !== null && customContent !== undefined;

    // Detectar si se est? volviendo a agregar una plantilla despu?s de haberla desasociado
    const isReAddingTemplate = !isClearing &&
      registroActual &&
      !registroActual.contract_template_id &&
      templateId &&
      templateId.trim() !== '';

    // Detectar si se est? cambiando de una plantilla a otra
    const isChangingTemplate = !isClearing &&
      registroActual &&
      registroActual.contract_template_id &&
      templateId &&
      templateId.trim() !== '' &&
      registroActual.contract_template_id !== templateId;

    // Detectar si es la primera vez que se asocia una plantilla (sin contrato previo definido)
    const isFirstTimeAssociating = !isClearing &&
      registroActual &&
      !registroActual.contract_template_id &&
      !registroActual.contract_content;

    // Si es edici?n manual y existe un registro, siempre versionar
    if (isManualEdit && registroActual && !isClearing) {
      const currentVersion = registroActual.contract_version || 1;
      const newVersion = currentVersion + 1;

      // Guardar versi?n anterior antes de actualizar (solo si existe contenido previo y no existe ya la versi?n)
      if (registroActual.contract_content) {
        const existingPreviousVersion = await prisma.studio_cotizaciones_cierre_contract_versions.findFirst({
          where: {
            cotizacion_id: cotizacionId,
            version: currentVersion,
          },
        });

        if (!existingPreviousVersion) {
          await prisma.studio_cotizaciones_cierre_contract_versions.create({
            data: {
              cotizacion_id: cotizacionId,
              version: currentVersion,
              content: registroActual.contract_content,
              change_type: 'MANUAL_EDIT',
              change_reason: 'Edici?n manual del contrato por el estudio',
            },
          });
        }
      }

      // Actualizar registro con nuevo contenido y versi?n incrementada
      const registro = await prisma.studio_cotizaciones_cierre.update({
        where: { cotizacion_id: cotizacionId },
        data: {
          contract_template_id: templateId,
          contract_content: contentToSave,
          contract_version: newVersion,
          contrato_definido: true,
        },
      });

      // Sin revalidatePath: actualización local vía setContractData en el cliente
      return {
        success: true,
        data: {
          id: registro.id,
          cotizacion_id: registro.cotizacion_id,
        },
      };
    } else if (isFirstTimeAssociating) {
      // Primera vez asociando plantilla: renderizar automáticamente si no hay contenido personalizado
      let finalContentToSave = contentToSave;

      // Si no hay contenido personalizado y hay promiseId, renderizar automáticamente
      if (!contentToSave && finalPromiseId) {
        try {
          // Obtener plantilla del contrato
          const templateResult = await getContractTemplate(studioSlug, templateId);
          if (templateResult.success && templateResult.data) {
            const template = templateResult.data;

            // Obtener registro de cierre para condiciones comerciales
            const registroCierre = await prisma.studio_cotizaciones_cierre.findUnique({
              where: { cotizacion_id: cotizacionId },
              include: {
                condiciones_comerciales: true,
              },
            });

            // Preparar información de condiciones comerciales si existen
            const condicionComercialInfo = registroCierre?.condiciones_comerciales
              ? {
                  id: registroCierre.condiciones_comerciales.id,
                  name: registroCierre.condiciones_comerciales.name,
                  description: registroCierre.condiciones_comerciales.description || null,
                  discount_percentage: registroCierre.condiciones_comerciales.discount_percentage || null,
                  advance_percentage: registroCierre.condiciones_comerciales.advance_percentage || null,
                  advance_type: registroCierre.condiciones_comerciales.advance_type || null,
                  advance_amount: registroCierre.condiciones_comerciales.advance_amount || null,
                }
              : undefined;

            // Obtener datos actualizados de la promesa para renderizar el contrato
            const contractDataResult = await getPromiseContractData(
              studioSlug,
              finalPromiseId,
              cotizacionId,
              condicionComercialInfo
            );

            if (contractDataResult.success && contractDataResult.data) {
              // Renderizar contenido del contrato con datos actualizados
              const renderResult = await renderContractContent(
                template.content,
                contractDataResult.data,
                contractDataResult.data.condicionesData
              );

              if (renderResult.success && renderResult.data) {
                finalContentToSave = renderResult.data;
              } else {
                // Si falla el renderizado, loguear pero continuar con null
                console.error(
                  '[actualizarContratoCierre] ❌ ERROR CRÍTICO: Renderizado falló:',
                  renderResult.error,
                  'cotizacionId:', cotizacionId,
                  'templateId:', templateId
                );
              }
            } else {
              // Si falla obtener datos, loguear pero continuar con null
              console.error(
                '[actualizarContratoCierre] ❌ ERROR CRÍTICO: No se pudieron obtener datos del contrato:',
                contractDataResult.error,
                'cotizacionId:', cotizacionId,
                'promiseId:', finalPromiseId
              );
            }
          } else {
            // Si falla obtener plantilla, loguear pero continuar con null
            console.error(
              '[actualizarContratoCierre] ❌ ERROR CRÍTICO: No se encontró la plantilla:',
              templateResult.error,
              'templateId:', templateId
            );
          }
        } catch (error) {
          // Si hay error en el proceso de renderizado, loguear pero continuar
          console.error('[actualizarContratoCierre] ❌ ERROR CRÍTICO en renderizado automático:', error);
        }
      }

      // ⚠️ FIX: NO guardar contrato_definido=true si no hay contenido renderizado
      // Esto evita que el contrato aparezca en la vista pública sin contenido
      const shouldMarkAsDefinido = !!finalContentToSave || !!templateId;
      
      // Guardar registro con contenido renderizado
      const registro = await prisma.studio_cotizaciones_cierre.update({
        where: { cotizacion_id: cotizacionId },
        data: {
          contract_template_id: templateId,
          contract_content: finalContentToSave,
          contract_version: 1,
          // Solo marcar como definido si hay contenido O template (para que cliente pueda ver que hay algo)
          contrato_definido: shouldMarkAsDefinido,
        },
      });

      // Sin revalidatePath: actualización local vía setContractData en el cliente
      return {
        success: true,
        data: {
          id: registro.id,
          cotizacion_id: registro.cotizacion_id,
        },
      };
    } else if (isReAddingTemplate || isChangingTemplate) {
      // Volver a agregar plantilla despu?s de desasociar o cambiar de plantilla: versionar el cambio
      const currentVersion = registroActual.contract_version || 1;
      const newVersion = currentVersion + 1;

      // Guardar versi?n anterior antes de actualizar (solo si existe contenido previo y no existe ya la versi?n)
      if (registroActual.contract_content) {
        const existingPreviousVersion = await prisma.studio_cotizaciones_cierre_contract_versions.findFirst({
          where: {
            cotizacion_id: cotizacionId,
            version: currentVersion,
          },
        });

        if (!existingPreviousVersion) {
          await prisma.studio_cotizaciones_cierre_contract_versions.create({
            data: {
              cotizacion_id: cotizacionId,
              version: currentVersion,
              content: registroActual.contract_content,
              change_type: isReAddingTemplate ? 'TEMPLATE_REASSIGNED' : 'TEMPLATE_CHANGED',
              change_reason: isReAddingTemplate
                ? 'Plantilla de contrato reasignada despu?s de desasociaci?n'
                : 'Plantilla de contrato cambiada',
            },
          });
        }
      }

      // Actualizar registro con nueva plantilla y versi?n incrementada
      const registro = await prisma.studio_cotizaciones_cierre.update({
        where: { cotizacion_id: cotizacionId },
        data: {
          contract_template_id: templateId,
          contract_content: contentToSave, // Puede ser null si solo se asigna la plantilla
          contract_version: newVersion,
          contrato_definido: true,
        },
      });

      // Sin revalidatePath: actualización local vía setContractData en el cliente
      return {
        success: true,
        data: {
          id: registro.id,
          cotizacion_id: registro.cotizacion_id,
        },
      };
    } else {
      // Primera vez o limpiar contrato: crear/actualizar sin versionado
      // Si se est? limpiando (desasociando plantilla), eliminar el historial de versiones
      if (isClearing && registroActual) {
        // Eliminar todas las versiones del historial cuando se desasocia la plantilla
        await prisma.studio_cotizaciones_cierre_contract_versions.deleteMany({
          where: { cotizacion_id: cotizacionId },
        });
      }

      const registro = await prisma.studio_cotizaciones_cierre.upsert({
        where: { cotizacion_id: cotizacionId },
        create: {
          cotizacion_id: cotizacionId,
          contract_template_id: isClearing ? null : templateId,
          contract_content: isClearing ? null : contentToSave,
          contract_version: 1, // Primera versi?n
          contrato_definido: !isClearing,
          ...(isClearing ? { contract_signed_at: null } : {}),
        },
        update: {
          contract_template_id: isClearing ? null : templateId,
          contract_content: isClearing ? null : contentToSave,
          // Si se est? limpiando, resetear versi?n y firma
          contract_version: isClearing ? 1 : (registroActual?.contract_version || 1),
          contrato_definido: !isClearing,
          ...(isClearing ? { contract_signed_at: null } : {}),
        },
      });

      // Sin revalidatePath: actualización local vía setContractData en el cliente
      return {
        success: true,
        data: {
          id: registro.id,
          cotizacion_id: registro.cotizacion_id,
        },
      };
    }
  } catch (error) {
    console.error('[actualizarContratoCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar contrato',
    };
  }
}

/**
 * Regenera el contrato con los datos actualizados de la cotizaci?n y contacto
 * Crea una nueva versi?n con tipo AUTO_REGENERATE
 */
export async function regenerarContratoCierre(
  studioSlug: string,
  cotizacionId: string,
  promiseId: string
): Promise<CierreResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la cotizaci?n pertenece al studio
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
        promise_id: promiseId,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Verificar que el contrato no est? firmado
    if (cotizacion.status === 'contract_signed') {
      return { success: false, error: 'No se puede regenerar un contrato firmado' };
    }

    // Obtener registro de cierre actual
    const registroCierre = await prisma.studio_cotizaciones_cierre.findUnique({
      where: { cotizacion_id: cotizacionId },
      include: {
        condiciones_comerciales: true,
      },
    });

    if (!registroCierre || !registroCierre.contrato_definido || !registroCierre.contract_template_id) {
      return { success: false, error: 'No hay contrato generado para regenerar' };
    }

    // Obtener la plantilla del contrato
    const templateResult = await getContractTemplate(studioSlug, registroCierre.contract_template_id);
    if (!templateResult.success || !templateResult.data) {
      return { success: false, error: 'No se encontr? la plantilla del contrato' };
    }

    const template = templateResult.data;

    // Obtener condiciones comerciales si existen
    const condicionComercialInfo = registroCierre.condiciones_comerciales ? {
      id: registroCierre.condiciones_comerciales.id,
      name: registroCierre.condiciones_comerciales.name,
      description: registroCierre.condiciones_comerciales.description || null,
      discount_percentage: registroCierre.condiciones_comerciales.discount_percentage || null,
      advance_percentage: registroCierre.condiciones_comerciales.advance_percentage || null,
      advance_type: registroCierre.condiciones_comerciales.advance_type || null,
      advance_amount: registroCierre.condiciones_comerciales.advance_amount || null,
    } : undefined;

    // Obtener datos actualizados de la promesa para renderizar el contrato
    const contractDataResult = await getPromiseContractData(
      studioSlug,
      promiseId,
      cotizacionId,
      condicionComercialInfo
    );

    if (!contractDataResult.success || !contractDataResult.data) {
      return { success: false, error: contractDataResult.error || 'Error al obtener datos del contrato' };
    }

    // Renderizar contenido del contrato con datos actualizados
    const renderResult = await renderContractContent(
      template.content,
      contractDataResult.data,
      contractDataResult.data.condicionesData
    );

    if (!renderResult.success || !renderResult.data) {
      return { success: false, error: renderResult.error || 'Error al renderizar contrato' };
    }

    const renderedContent = renderResult.data;
    const currentVersion = registroCierre.contract_version || 1;
    const newVersion = currentVersion + 1;

    // Guardar versi?n anterior antes de actualizar (solo si no existe ya)
    const existingPreviousVersion = await prisma.studio_cotizaciones_cierre_contract_versions.findFirst({
      where: {
        cotizacion_id: cotizacionId,
        version: currentVersion,
      },
    });

    if (!existingPreviousVersion && registroCierre.contract_content) {
      await prisma.studio_cotizaciones_cierre_contract_versions.create({
        data: {
          cotizacion_id: cotizacionId,
          version: currentVersion,
          content: registroCierre.contract_content,
          change_type: 'AUTO_REGENERATE',
          change_reason: 'Regeneraci?n autom?tica por actualizaci?n de datos de la cotizaci?n o contacto',
        },
      });
    }

    // Actualizar el contenido del contrato y la versi?n en studio_cotizaciones_cierre
    await prisma.studio_cotizaciones_cierre.update({
      where: { cotizacion_id: cotizacionId },
      data: {
        contract_content: renderedContent,
        contract_version: newVersion,
      },
    });

    // Crear nueva versi?n (solo si no existe ya)
    const existingNewVersion = await prisma.studio_cotizaciones_cierre_contract_versions.findFirst({
      where: {
        cotizacion_id: cotizacionId,
        version: newVersion,
      },
    });

    if (!existingNewVersion) {
      await prisma.studio_cotizaciones_cierre_contract_versions.create({
        data: {
          cotizacion_id: cotizacionId,
          version: newVersion,
          content: renderedContent,
          change_type: 'AUTO_REGENERATE',
          change_reason: 'Regeneraci?n autom?tica por actualizaci?n de datos de la cotizaci?n o contacto',
        },
      });
    }

    // Sin revalidatePath: actualización local en el cliente
    return {
      success: true,
      data: {
        id: registroCierre.id,
        cotizacion_id: registroCierre.cotizacion_id,
      },
    };
  } catch (error) {
    console.error('[regenerarContratoCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al regenerar contrato',
    };
  }
}

/**
 * Regenera el contrato desde el estudio: invalida firma previa, genera nueva versión.
 * No modifica el status de studio_cotizaciones (permanece en cierre).
 */
export async function regenerateStudioContract(
  studioSlug: string,
  promiseId: string,
  cotizacionId: string
): Promise<CierreResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
        promise_id: promiseId,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    const registroCierre = await prisma.studio_cotizaciones_cierre.findUnique({
      where: { cotizacion_id: cotizacionId },
      include: { condiciones_comerciales: true },
    });

    if (!registroCierre || !registroCierre.contrato_definido || !registroCierre.contract_template_id) {
      return { success: false, error: 'No hay contrato generado para regenerar' };
    }

    const templateResult = await getContractTemplate(studioSlug, registroCierre.contract_template_id);
    if (!templateResult.success || !templateResult.data) {
      return { success: false, error: 'No se encontró la plantilla del contrato' };
    }

    const condicionComercialInfo = registroCierre.condiciones_comerciales
      ? {
          id: registroCierre.condiciones_comerciales.id,
          name: registroCierre.condiciones_comerciales.name,
          description: registroCierre.condiciones_comerciales.description || null,
          discount_percentage: registroCierre.condiciones_comerciales.discount_percentage || null,
          advance_percentage: registroCierre.condiciones_comerciales.advance_percentage || null,
          advance_type: registroCierre.condiciones_comerciales.advance_type || null,
          advance_amount: registroCierre.condiciones_comerciales.advance_amount || null,
        }
      : undefined;

    const contractDataResult = await getPromiseContractData(
      studioSlug,
      promiseId,
      cotizacionId,
      condicionComercialInfo
    );

    if (!contractDataResult.success || !contractDataResult.data) {
      return { success: false, error: contractDataResult.error || 'Error al obtener datos del contrato' };
    }

    const renderResult = await renderContractContent(
      templateResult.data.content,
      contractDataResult.data,
      contractDataResult.data.condicionesData
    );

    if (!renderResult.success || !renderResult.data) {
      return { success: false, error: renderResult.error || 'Error al renderizar contrato' };
    }

    const currentVersion = registroCierre.contract_version || 1;
    const newVersion = currentVersion + 1;
    const renderedContent = renderResult.data;

    if (registroCierre.contract_content) {
      const existingPrevious = await prisma.studio_cotizaciones_cierre_contract_versions.findFirst({
        where: { cotizacion_id: cotizacionId, version: currentVersion },
      });
      if (!existingPrevious) {
        await prisma.studio_cotizaciones_cierre_contract_versions.create({
          data: {
            cotizacion_id: cotizacionId,
            version: currentVersion,
            content: registroCierre.contract_content,
            change_type: 'STUDIO_REGENERATE',
            change_reason: 'El estudio regeneró el contrato. Firma previa invalidada',
          },
        });
      }
    }

    await prisma.studio_cotizaciones_cierre.update({
      where: { cotizacion_id: cotizacionId },
      data: {
        contract_content: renderedContent,
        contract_version: newVersion,
        contract_signed_at: null,
      },
    });

    await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: { updated_at: new Date() },
    });

    await prisma.studio_promise_logs.create({
      data: {
        promise_id: promiseId,
        user_id: null,
        content: 'El estudio regeneró el contrato. Firma previa invalidada',
        log_type: 'system',
        metadata: {
          action: 'studio_regenerate_contract',
          cotizacion_id: cotizacionId,
        },
        origin_context: 'PROMISE',
      },
    });

    // Sin revalidatePath/revalidateTag: estudio actualiza vía loadRegistroCierre; cliente vía Realtime
    return {
      success: true,
      data: { id: registroCierre.id, cotizacion_id: cotizacionId },
    };
  } catch (error) {
    console.error('[regenerateStudioContract] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al regenerar contrato',
    };
  }
}

/**
 * Actualiza el pago en el registro de cierre
 * Si todos los campos son null, se marca como "promesa de pago" (pago_registrado = false)
 * Si hay datos, se marca como "pago registrado" (pago_registrado = true)
 */
export async function actualizarPagoCierre(
  studioSlug: string,
  cotizacionId: string,
  pagoData: {
    concepto: string | null;
    monto: number | null;
    fecha: Date | null;
    metodo_id: string | null;
  }
): Promise<CierreResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la cotizaci?n pertenece al studio
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Determinar si es pago registrado o promesa de pago
    const esPromesaDePago = !pagoData.concepto && !pagoData.monto && !pagoData.fecha;

    // Actualizar o crear registro de cierre
    const registro = await prisma.studio_cotizaciones_cierre.upsert({
      where: { cotizacion_id: cotizacionId },
      create: {
        cotizacion_id: cotizacionId,
        pago_registrado: !esPromesaDePago,
        pago_concepto: pagoData.concepto,
        pago_monto: pagoData.monto,
        pago_fecha: pagoData.fecha,
        pago_metodo_id: pagoData.metodo_id,
      },
      update: {
        pago_registrado: !esPromesaDePago,
        pago_concepto: pagoData.concepto,
        pago_monto: pagoData.monto,
        pago_fecha: pagoData.fecha,
        pago_metodo_id: pagoData.metodo_id,
      },
    });

    // Sin revalidatePath: actualización local vía setPagoData en el cliente
    return {
      success: true,
      data: {
        id: registro.id,
        cotizacion_id: registro.cotizacion_id,
      },
    };
  } catch (error) {
    console.error('[actualizarPagoCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar pago',
    };
  }
}

/**
 * Actualiza solo el monto de anticipo en el registro de cierre (SSOT para el resumen unificado).
 * No modifica fecha ni método de pago; el contrato y autorización leen este valor.
 */
export async function actualizarAnticipoCierre(
  studioSlug: string,
  cotizacionId: string,
  monto: number
): Promise<CierreResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: { id: cotizacionId, studio_id: studio.id },
    });
    if (!cotizacion) return { success: false, error: 'Cotización no encontrada' };

    await prisma.studio_cotizaciones_cierre.update({
      where: { cotizacion_id: cotizacionId },
      data: {
        pago_concepto: 'Anticipo',
        pago_monto: new Prisma.Decimal(monto),
        updated_at: new Date(),
      },
    });

    return { success: true, data: { cotizacion_id: cotizacionId } };
  } catch (error) {
    console.error('[actualizarAnticipoCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar anticipo',
    };
  }
}

/**
 * Elimina el registro de cierre de una cotizaci?n
 * Se llama al cancelar el cierre
 */
export async function eliminarRegistroCierre(
  studioSlug: string,
  cotizacionId: string
): Promise<CierreResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la cotizaci?n pertenece al studio
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Eliminar registro si existe
    await prisma.studio_cotizaciones_cierre.deleteMany({
      where: { cotizacion_id: cotizacionId },
    });

    // Sin revalidatePath: actualización local en el cliente
    return {
      success: true,
      data: {
        id: '',
        cotizacion_id: cotizacionId,
      },
    };
  } catch (error) {
    console.error('[eliminarRegistroCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar registro de cierre',
    };
  }
}

/**
 * Obtiene el historial de versiones del contrato de cierre
 */
export async function obtenerVersionesContratoCierre(
  studioSlug: string,
  cotizacionId: string
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    version: number;
    content: string;
    change_reason: string | null;
    change_type: string;
    created_at: Date;
  }>;
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la cotizaci?n pertenece al studio
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Obtener todas las versiones del contrato
    const versiones = await prisma.studio_cotizaciones_cierre_contract_versions.findMany({
      where: { cotizacion_id: cotizacionId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        content: true,
        change_reason: true,
        change_type: true,
        created_at: true,
      },
    });

    return {
      success: true,
      data: versiones,
    };
  } catch (error) {
    console.error('[obtenerVersionesContratoCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener versiones del contrato',
    };
  }
}

/**
 * Autoriza una cotizaci?n y crea el evento asociado
 *
 * ORDEN DE EJECUCI?N (en transacci?n at?mica):
 * 1. Validar studio, cotizaci?n y registro de cierre
 * 2. Validar datos seg?n tipo de cliente (manual vs nuevo)
 * 3. Crear snapshots de condiciones comerciales (si existen)
 * 4. Crear snapshots de contrato (si existe)
 * 5. Crear o actualizar evento (con cotizacion_id para establecer relaci?n)
 * 6. Actualizar cotizaci?n con snapshots y status 'autorizada'
 *    (La relaci?n evento_autorizado se establece autom?ticamente cuando evento tiene cotizacion_id)
 * 7. Registrar pago inicial (si aplica)
 * 8. Eliminar todas las etiquetas asociadas a la promesa
 * 9. Cambiar etapa de promesa a 'aprobado' (aparece en columna Historial del Pipeline)
 * 10. Asignar etiqueta "Aprobado" a la promesa
 * 11. Archivar otras cotizaciones de la promesa
 * 12. Eliminar citas comerciales y crear agenda del evento (si hay fecha)
 * 13. Eliminar registro temporal de cierre
 * 14. Crear log de autorizaci?n
 *
 * @returns Evento creado y cotizaci?n autorizada
 */
export async function autorizarYCrearEvento(
  studioSlug: string,
  promiseId: string,
  cotizacionId: string,
  options?: {
    registrarPago?: boolean;
    montoInicial?: number;
    /** Si true, permite crear evento aunque se supere max_events_per_day */
    forceBooking?: boolean;
  }
): Promise<{
  success: boolean;
  data?: {
    evento_id: string;
    cotizacion_id: string;
    pago_registrado: boolean;
  };
  error?: string;
  conflictingPromises?: Array<{ id: string; event_date: Date | null; pipeline_stage_slug: string | null }>;
}> {
  try {
    // 1. Validar studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // 2. Validar cotización y promesa; incluir ítems para calcular desglose de cortesías antes de borrar registro cierre
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        promise_id: promiseId,
        studio_id: studio.id,
      },
      include: {
        promise: {
          include: {
            contact: true,
            event_type: {
              select: {
                id: true,
                name: true,
              },
            },
            event_location_ref: {
              select: {
                name: true,
                address: true,
                maps_link: true,
              },
            },
          },
        },
        cotizacion_items: true,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    if (cotizacion.status !== 'en_cierre') {
      return {
        success: false,
        error: 'La cotizaci?n debe estar en estado de cierre',
      };
    }

    // 3. Validar registro de cierre
    const registroCierre = await prisma.studio_cotizaciones_cierre.findUnique({
      where: { cotizacion_id: cotizacionId },
      include: {
        condiciones_comerciales: true,
        contract_template: {
          select: {
            id: true,
            name: true,
            content: true, // Incluir contenido de la plantilla
          },
        },
      },
    });

    if (!registroCierre) {
      return { success: false, error: 'No se encontr? el registro de cierre' };
    }

    // 4. Validaciones seg?n tipo de cliente
    const isClienteManual = !cotizacion.selected_by_prospect ||
      cotizacion.selected_by_prospect === null ||
      cotizacion.selected_by_prospect === undefined;

    if (isClienteManual) {
      // Cliente creado manualmente: condiciones comerciales y contrato son opcionales
      // Si est?n definidas, se guardar?n en snapshots (sin requerir firma)
      // No requiere validaciones adicionales
    } else {
      // Cliente nuevo (selected_by_prospect === true): requiere condiciones comerciales y contrato
      if (
        !registroCierre.condiciones_comerciales_definidas ||
        !registroCierre.condiciones_comerciales_id
      ) {
        return {
          success: false,
          error: 'Debe definir las condiciones comerciales',
        };
      }

      if (
        !registroCierre.contrato_definido ||
        !registroCierre.contract_template_id
      ) {
        return { success: false, error: 'Debe definir el contrato' };
      }

      // Validaci?n: contrato firmado SOLO si la cotizaci?n fue seleccionada por el prospecto
      if (!registroCierre.contract_signed_at) {
        return {
          success: false,
          error:
            'El contrato debe estar firmado por el cliente antes de autorizar',
        };
      }
    }

    // 5. Primera etapa del Event Pipeline (menor order, ej. Planeación) — orderBy para no depender del valor fijo
    const initialStage = await prisma.studio_manager_pipeline_stages.findFirst({
      where: { studio_id: studio.id, is_active: true },
      orderBy: { order: 'asc' },
    });

    if (!initialStage) {
      return {
        success: false,
        error: 'No se encontró una etapa inicial activa en el pipeline de eventos.',
      };
    }

    // 6. Obtener etapa "approved" del pipeline de promesas
    const etapaAprobado = await prisma.studio_promise_pipeline_stages.findFirst({
      where: {
        studio_id: studio.id,
        slug: 'approved',
      },
    });

    if (!etapaAprobado) {
      return {
        success: false,
        error: 'No se encontr? la etapa "approved" en el pipeline de promesas',
      };
    }

    // 6.5. Validación de capacidad: checkDateConflict respeta max_events_per_day del Studio; forceBooking omite el límite
    let eventDateForConflict: Date;
    if (cotizacion.promise.event_date) {
      const ed = cotizacion.promise.event_date instanceof Date
        ? cotizacion.promise.event_date
        : new Date(cotizacion.promise.event_date);
      eventDateForConflict = new Date(Date.UTC(ed.getUTCFullYear(), ed.getUTCMonth(), ed.getUTCDate(), 12, 0, 0));
    } else {
      const now = new Date();
      eventDateForConflict = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
    }

    const conflictResult = await checkDateConflict(studio.id, eventDateForConflict);
    if (!conflictResult.success) {
      return { success: false, error: conflictResult.error ?? 'Error al comprobar disponibilidad' };
    }
    if (conflictResult.data?.isFull && !options?.forceBooking) {
      return {
        success: false,
        error: 'DATE_OCCUPIED',
        conflictingPromises: conflictResult.data.conflictingPromises,
      };
    }

    // Utilidad final: el evento no almacena utilidad_neta; se obtiene vía cotización autorizada (evento.cotizacion_id)
    // usando getAuditoriaRentabilidadCierre / calcularRentabilidadGlobal (precio final = cotización.price, items con cost/expense).

    // Resolver etiqueta "Aprobado" fuera de la transacción para evitar "Transaction not found" en transacciones largas
    let tagAprobadoId: string;
    const tagAprobadoExistente = await prisma.studio_promise_tags.findFirst({
      where: {
        studio_id: studio.id,
        OR: [{ name: 'Aprobado' }, { slug: 'aprobado' }],
        is_active: true,
      },
      select: { id: true },
    });
    if (tagAprobadoExistente) {
      tagAprobadoId = tagAprobadoExistente.id;
    } else {
      const created = await prisma.studio_promise_tags.create({
        data: {
          studio_id: studio.id,
          name: 'Aprobado',
          slug: 'aprobado',
          color: '#10B981',
          order: 0,
        },
        select: { id: true },
      });
      tagAprobadoId = created.id;
    }

    // Desglose de cortesías (misma lógica que obtenerRegistroCierre) para persistir como snapshot antes de borrar registro cierre
    const itemsCortesiaArr = Array.isArray(cotizacion.items_cortesia) ? (cotizacion.items_cortesia as string[]) : [];
    const itemsCortesiaIds = new Set(itemsCortesiaArr);
    const allItems = cotizacion.cotizacion_items ?? [];
    let cortesias_monto = 0;
    let cortesias_count = 0;
    for (const i of allItems) {
      const esCortesia = (i as { is_courtesy?: boolean }).is_courtesy === true || itemsCortesiaIds.has(i.id) || (i.item_id != null && itemsCortesiaIds.has(i.item_id));
      if (!esCortesia) continue;
      cortesias_count += 1;
      const qty = (i as { quantity?: number }).quantity ?? 1;
      const precioUnit = Number((i as { unit_price?: unknown }).unit_price ?? 0);
      const snapshot = Number((i as { unit_price_snapshot?: number }).unit_price_snapshot ?? 0);
      const publicSnapshot = Number((i as { public_price_snapshot?: number }).public_price_snapshot ?? 0);
      const valorComercial = precioUnit > 0 ? precioUnit * qty : (snapshot > 0 ? snapshot : publicSnapshot) * qty;
      cortesias_monto += valorComercial > 0 ? valorComercial : Number((i as { subtotal?: unknown }).subtotal ?? 0);
    }

    // 7. TRANSACCI?N AT?MICA
    const result = await prisma.$transaction(async (tx) => {
      // 7.1. Verificar si ya existe un evento para esta promesa (dentro de la transacci?n para evitar race conditions)
      const eventoExistente = await tx.studio_events.findFirst({
        where: {
          promise_id: promiseId,
          studio_id: studio.id,
        },
        select: {
          id: true,
          cotizacion_id: true,
          status: true,
        },
      });

      // Validar solo si hay conflicto con otra cotizaci?n activa
      if (eventoExistente && eventoExistente.status === 'ACTIVE') {
        // Si ya existe un evento activo asociado a otra cotizaci?n, retornar error
        if (eventoExistente.cotizacion_id &&
          eventoExistente.cotizacion_id !== cotizacionId) {
          throw new Error('Ya existe un evento activo para esta promesa asociado a otra cotizaci?n');
        }
        // Si existe evento para esta misma cotizaci?n y est? activo, actualizar
      }

      // 7.2. Crear snapshots de condiciones comerciales (si est?n definidas)
      // Para clientes manuales son opcionales, pero si est?n definidas deben guardarse
      const condicionSnapshot = registroCierre.condiciones_comerciales_definidas && registroCierre.condiciones_comerciales
        ? {
          name: registroCierre.condiciones_comerciales.name,
          description: registroCierre.condiciones_comerciales.description,
          advance_percentage: registroCierre.condiciones_comerciales
            .advance_percentage
            ? Number(
              registroCierre.condiciones_comerciales.advance_percentage
            )
            : null,
          advance_type: registroCierre.condiciones_comerciales.advance_type,
          advance_amount:
            registroCierre.condiciones_comerciales.advance_amount,
          discount_percentage: registroCierre.condiciones_comerciales
            .discount_percentage
            ? Number(
              registroCierre.condiciones_comerciales.discount_percentage
            )
            : null,
        }
        : null;

      // 7.3. Crear snapshots de contrato (si est? definido)
      // Para clientes manuales es opcional, pero si est? definido debe guardarse
      // Si hay template_id pero no content personalizado, usar el contenido de la plantilla
      const contratoSnapshot = registroCierre.contrato_definido && registroCierre.contract_template_id
        ? {
          template_id: registroCierre.contract_template_id,
          template_name: registroCierre.contract_template?.name || null,
          // Priorizar contenido personalizado, si no existe usar el de la plantilla
          content: registroCierre.contract_content || registroCierre.contract_template?.content || null,
          version: registroCierre.contract_version || 1,
          signed_at: registroCierre.contract_signed_at, // Puede ser null para clientes manuales
          signed_ip: null, // TODO: Obtener IP de firma desde tabla de versiones si existe
        }
        : null;

      // 7.4. Crear o actualizar evento
      // Duración: studio_events no tiene campo duration; las horas de cobertura se obtienen de la cotización autorizada (evento.cotizacion_id → studio_cotizaciones.event_duration).
      // Los multiplicadores por hora (x N/h) deben leerse siempre de la cotización activa en el renderizado.
      // Normalizar fecha del evento usando UTC para evitar problemas de zona horaria
      // Usar la fecha de la promesa si existe, sino usar la fecha de autorización (fecha actual)
      let eventDateNormalized: Date;
      if (cotizacion.promise.event_date) {
        // Si hay fecha de evento en la promesa, normalizarla usando UTC con mediodía como buffer
        const eventDate = cotizacion.promise.event_date instanceof Date
          ? cotizacion.promise.event_date
          : new Date(cotizacion.promise.event_date);
        eventDateNormalized = new Date(Date.UTC(
          eventDate.getUTCFullYear(),
          eventDate.getUTCMonth(),
          eventDate.getUTCDate(),
          12, 0, 0
        ));
      } else {
        // Si no hay fecha de evento, usar la fecha de autorización (fecha actual) normalizada con UTC
        // Esto asegura que el evento tenga una fecha válida basada en cuándo se autorizó
        const fechaAutorizacion = new Date();
        eventDateNormalized = new Date(Date.UTC(
          fechaAutorizacion.getUTCFullYear(),
          fechaAutorizacion.getUTCMonth(),
          fechaAutorizacion.getUTCDate(),
          12, 0, 0
        ));
      }

      let evento;
      if (eventoExistente) {
        // Actualizar evento existente (puede estar cancelado o activo). Al re-activar, actualizar created_at para que "Evento creado el" refleje la fecha de esta creación/re-creación.
        evento = await tx.studio_events.update({
          where: { id: eventoExistente.id },
          data: {
            cotizacion_id: cotizacionId,
            event_type_id: cotizacion.promise.event_type_id || null,
            stage_id: initialStage.id,
            event_date: eventDateNormalized,
            status: 'ACTIVE',
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      } else {
        // Crear nuevo evento solo si no existe ninguno
        evento = await tx.studio_events.create({
          data: {
            studio_id: studio.id,
            contact_id: cotizacion.promise.contact_id,
            promise_id: promiseId,
            cotizacion_id: cotizacionId,
            event_type_id: cotizacion.promise.event_type_id || null,
            stage_id: initialStage.id,
            event_date: eventDateNormalized,
            status: 'ACTIVE',
          },
        });
      }

      // 7.4.1. Actualizar contacto de "prospecto" a "cliente" cuando se crea un evento
      if (cotizacion.promise.contact && cotizacion.promise.contact.status === 'prospecto') {
        await tx.studio_contacts.update({
          where: { id: cotizacion.promise.contact_id },
          data: {
            status: 'cliente',
            updated_at: new Date(),
          },
        });
      }

      // 7.4.5. NO actualizar items aquí - se hará después de la transacción
      // Esto evita timeouts en la transacción principal
      // Los items se actualizarán fuera de la transacción después de que se complete

      // 7.5. Actualizar cotización con snapshots (inmutables) y establecer relación con evento
      // Snapshot de negociación (Ecuación Financiera Maestra): precio_calculado, bono_especial, items_cortesia
      // persisten en la cotización autorizada para que el evento herede el histórico vía cotizacion_id.
      // Consistencia: AjusteCierre = PrecioFinal - (PrecioLista - Cortesías - Bono); no recalculamos aquí,
      // copiamos los valores ya guardados en la cotización durante el cierre (centavos exactos).
      const snapshotPrecioCalculado = cotizacion.precio_calculado != null
        ? new Prisma.Decimal(Number(cotizacion.precio_calculado))
        : null;
      const snapshotBonoEspecial = cotizacion.bono_especial != null
        ? new Prisma.Decimal(Number(cotizacion.bono_especial))
        : null;
      await tx.studio_cotizaciones.update({
        where: { id: cotizacionId },
        data: {
          status: 'autorizada',
          eventos: {
            connect: { id: evento.id },
          },
          condiciones_comerciales: {
            disconnect: true,
          },
          // Snapshots de negociación (cortesías, bono, ajuste) para dashboard y reportes
          precio_calculado: snapshotPrecioCalculado,
          bono_especial: snapshotBonoEspecial,
          items_cortesia: cotizacion.items_cortesia ?? null,
          cortesias_monto_snapshot: cortesias_monto > 0 ? new Prisma.Decimal(cortesias_monto) : null,
          cortesias_count_snapshot: cortesias_count > 0 ? cortesias_count : null,
          // Snapshots de condiciones comerciales
          condiciones_comerciales_name_snapshot:
            condicionSnapshot?.name || null,
          condiciones_comerciales_description_snapshot:
            condicionSnapshot?.description || null,
          condiciones_comerciales_advance_percentage_snapshot:
            condicionSnapshot?.advance_percentage || null,
          condiciones_comerciales_advance_type_snapshot:
            condicionSnapshot?.advance_type || null,
          condiciones_comerciales_advance_amount_snapshot:
            condicionSnapshot?.advance_amount
              ? new Prisma.Decimal(condicionSnapshot.advance_amount)
              : null,
          condiciones_comerciales_discount_percentage_snapshot:
            condicionSnapshot?.discount_percentage || null,
          // Snapshots de contrato
          contract_template_id_snapshot: contratoSnapshot?.template_id || null,
          contract_template_name_snapshot: contratoSnapshot?.template_name || null,
          contract_content_snapshot: contratoSnapshot?.content || null,
          contract_version_snapshot: contratoSnapshot?.version || null,
          contract_signed_at_snapshot: contratoSnapshot?.signed_at || null,
          contract_signed_ip_snapshot: contratoSnapshot?.signed_ip || null,
          updated_at: new Date(),
        },
      });

      // 8.5. Registrar pago inicial solo si el cliente pidió pago Y monto > 0 (nunca usar registro residual)
      let pagoRegistrado = false;
      const clientePidioPago = options?.registrarPago === true;
      const montoCliente = options?.montoInicial ?? 0;
      const montoEfectivo = clientePidioPago && montoCliente > 0 ? montoCliente : 0;
      if (montoEfectivo > 0) {
        const montoInicial = montoEfectivo;
        // Obtener nombre del m?todo de pago dentro de la transacci?n
        let metodoPagoNombre = 'Manual'; // Valor por defecto
        if (registroCierre.pago_metodo_id) {
          const metodoPago = await tx.studio_metodos_pago.findUnique({
            where: { id: registroCierre.pago_metodo_id },
            select: { payment_method_name: true },
          });
          if (metodoPago) {
            metodoPagoNombre = metodoPago.payment_method_name;
          }
        }

        // Usar la fecha del registro de cierre si est? disponible, sino usar fecha actual
        // Normalizar la fecha para evitar problemas de zona horaria
        const fechaPago = normalizePaymentDate(registroCierre.pago_fecha || new Date());
        const conceptoPago = registroCierre.pago_concepto || 'Pago inicial / Anticipo';
        const contactId = cotizacion.contact_id || cotizacion.promise?.contact_id;

        await tx.studio_pagos.create({
          data: {
            cotizacion_id: cotizacionId,
            promise_id: promiseId,
            contact_id: contactId || null,
            amount: montoInicial,
            concept: conceptoPago,
            payment_date: fechaPago,
            metodo_pago_id: registroCierre.pago_metodo_id,
            metodo_pago: metodoPagoNombre,
            status: 'completed',
            transaction_type: 'ingreso',
            transaction_category: 'abono',
          },
        });
        pagoRegistrado = true;
      }

      // 8.6. Eliminar todas las etiquetas asociadas a la promesa
      await tx.studio_promises_tags.deleteMany({
        where: {
          promise_id: promiseId,
        },
      });

      // 8.7. Cambiar etapa de promesa a "aprobado"
      // ⚠️ NOTA: El campo 'status' fue removido del schema - solo se usa pipeline_stage_id
      await tx.studio_promises.update({
        where: { id: promiseId },
        data: {
          pipeline_stage: {
            connect: { id: etapaAprobado.id },
          },
          updated_at: new Date(),
        },
      });

      // 8.7.1. Asignar etiqueta "Aprobado" a la promesa (tag resuelto fuera de la transacción)
      await tx.studio_promises_tags.create({
        data: {
          promise_id: promiseId,
          tag_id: tagAprobadoId,
        },
      });

      // 8.8. Cierre de ciclo: archivar otras cotizaciones (status + archived para listados/pipeline)
      await tx.studio_cotizaciones.updateMany({
        where: {
          promise_id: promiseId,
          id: { not: cotizacionId },
          status: { in: ['pendiente', 'en_cierre', 'autorizada'] },
        },
        data: {
          status: 'archivada',
          archived: true,
          updated_at: new Date(),
        },
      });

      // 8.9. Eliminar citas comerciales asociadas a la promesa y crear agenda del evento
      // Usar la fecha normalizada del evento que ya creamos arriba
      if (eventDateNormalized) {
        // Eliminar todas las citas comerciales (contexto: 'promise') asociadas a esta promesa
        await tx.studio_agenda.deleteMany({
          where: {
            promise_id: promiseId,
            contexto: 'promise',
            studio_id: studio.id,
          },
        });

        // IMPORTANTE: Eliminar cualquier agenda existente para este evento_id
        // Esto evita duplicados cuando se actualiza la fecha del evento
        await tx.studio_agenda.deleteMany({
          where: {
            evento_id: evento.id,
            contexto: 'evento',
            studio_id: studio.id,
          },
        });

        // Construir metadata para evento principal (silent creation: location refinable en Event Detail)
        const metadata = {
          agenda_type: 'main_event_date',
          sync_google: true,
          google_calendar_type: 'primary',
          is_main_event_date: true,
          is_main_event: true,
        };

        // Crear entrada en agenda: si la promesa tiene locación vinculada (event_location_id), heredar nombre, dirección y mapa
        const loc = cotizacion.promise.event_location_ref;
        const locationName = loc?.name ?? cotizacion.promise.event_location ?? null;
        const locationAddress = loc?.address ?? null;
        const locationUrl = loc?.maps_link ?? null;
        await tx.studio_agenda.create({
          data: {
            studio_id: studio.id,
            evento_id: evento.id,
            promise_id: promiseId,
            date: eventDateNormalized,
            concept: 'Evento Principal',
            location_name: locationName,
            location_address: locationAddress,
            location_url: locationUrl,
            type_scheduling: 'presencial',
            contexto: 'evento',
            status: 'pendiente',
            metadata,
          },
        });
      } else {
        // Si no hay fecha de evento, igual eliminar las citas comerciales
        await tx.studio_agenda.deleteMany({
          where: {
            promise_id: promiseId,
            contexto: 'promise',
            studio_id: studio.id,
          },
        });
      }

      // 8.10. Eliminar registro temporal de cierre
      await tx.studio_cotizaciones_cierre.delete({
        where: { cotizacion_id: cotizacionId },
      });

      // 8.11. Crear log de autorizaci?n y creaci?n de evento
      const eventoNombre = cotizacion.promise.event_name || cotizacion.promise.name || 'Evento';
      const eventoFecha = cotizacion.promise.event_date
        ? (() => {
            const normalized = toUtcDateOnly(cotizacion.promise.event_date);
            return normalized ? formatDisplayDate(normalized, { year: 'numeric', month: 'long', day: 'numeric' }) : null;
          })()
        : null;

      let logContent = `Evento creado: ${eventoNombre}`;
      if (eventoFecha) {
        logContent += ` - ${eventoFecha}`;
      }
      if (pagoRegistrado) {
        logContent += ' (con pago inicial registrado)';
      }
      if (registroCierre.contract_signed_at) {
        logContent += ' (contrato firmado)';
      }

      await tx.studio_promise_logs.create({
        data: {
          promise_id: promiseId,
          user_id: null,
          content: logContent,
          log_type: 'quotation_authorized',
          origin_context: 'EVENT',
          metadata: {
            action: 'evento_creado',
            cotizacion_id: cotizacionId,
            cotizacion_nombre: cotizacion.name,
            evento_id: evento.id,
            evento_nombre: eventoNombre,
            evento_fecha: eventDateNormalized.toISOString(),
            contract_signed: !!registroCierre.contract_signed_at,
            pago_registrado: pagoRegistrado,
            pago_monto: pagoRegistrado ? montoEfectivo : null,
          },
        },
      });

      return {
        evento_id: evento.id,
        cotizacion_id: cotizacionId,
        pago_registrado: pagoRegistrado,
      };
    }, {
      maxWait: 10000, // 10 s para adquirir conexión
      timeout: 30000, // 30 s para completar (evita "Transaction not found" en transacciones largas)
    });

    // 8.5. Actualizar items de cotización FUERA de la transacción (evita timeout)
    // Esto se hace después de que la transacción principal se complete exitosamente
    try {
      const configForm = await obtenerConfiguracionPrecios(studioSlug);
      if (configForm) {
        const configPrecios: ConfiguracionPrecios = {
          utilidad_servicio: parseFloat(configForm.utilidad_servicio || '0.30'),
          utilidad_producto: parseFloat(configForm.utilidad_producto || '0.20'),
          comision_venta: parseFloat(configForm.comision_venta || '0.10'),
          sobreprecio: parseFloat(configForm.sobreprecio || '0.05'),
        };

        const { guardarEstructuraCotizacionAutorizadaSinTx } = await import('./cotizacion-pricing');
        await guardarEstructuraCotizacionAutorizadaSinTx(
          cotizacionId,
          configPrecios,
          studioSlug
        );
      }
    } catch (pricingError) {
      // No fallar la operación principal si falla la actualización de precios
      // Los items se pueden actualizar después manualmente si es necesario
      console.error('[autorizarYCrearEvento] Error actualizando precios de items (no crítico):', pricingError);
    }

    // 9. Crear notificaci?n de evento creado (fuera de la transacci?n para no bloquear)
    try {
      const eventoNombre = cotizacion.promise.event_name || cotizacion.promise.name || 'Evento';
      await notifyEventCreated(studio.id, result.evento_id, eventoNombre);
    } catch (notificationError) {
      // No fallar la operaci?n principal si falla la notificaci?n
      console.error('[autorizarYCrearEvento] Error al crear notificaci?n:', notificationError);
    }

    // 9.1. Notificar promesas afectadas (misma fecha, sin slot) para que el estudio pueda enviar "Fecha no disponible"
    try {
      if (conflictResult.data?.conflictingPromises?.length) {
        const affected = conflictResult.data.conflictingPromises.filter((p) => p.id !== promiseId);
        if (affected.length > 0) {
          const eventoNombre = cotizacion.promise.event_name || cotizacion.promise.name || 'Evento';
          await notifyCapacityAffectedPromises(studio.id, result.evento_id, eventoNombre, affected);
        }
      }
    } catch (notificationError) {
      console.error('[autorizarYCrearEvento] Error notificando promesas afectadas (no crítico):', notificationError);
    }

    // 10. Sincronizar con Google Calendar si está habilitado (fuera de la transacci?n)
    try {
      const { tieneGoogleCalendarHabilitado, sincronizarEventoPrincipalEnBackground } =
        await import('@/lib/integrations/google/clients/calendar/helpers');

      if (await tieneGoogleCalendarHabilitado(studioSlug)) {
        // Sincronizar en background para no bloquear la respuesta
        sincronizarEventoPrincipalEnBackground(result.evento_id, studioSlug);
      }
    } catch (googleError) {
      // No fallar la operaci?n principal si falla la sincronizaci?n con Google Calendar
      console.error('[autorizarYCrearEvento] Error sincronizando con Google Calendar (no crítico):', googleError);
    }

    // Sincronizar pipeline stage de la promesa
    // La cotización está en 'autorizada', así que la sincronización debe detectar y actualizar a 'approved'
    const { syncPromisePipelineStageFromQuotes } = await import('./promise-pipeline-sync.actions');
    await syncPromisePipelineStageFromQuotes(promiseId, studio.id, null).catch((error) => {
      console.error('[CIERRE] Error sincronizando pipeline al autorizar:', error);
    });

    // Listado Kanban, detalle y vista autorizada: forzar datos frescos tras cambio de estado crítico (cierre → autorizada)
    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}/autorizada`);
    revalidatePath(`/${studioSlug}/studio/business/events/${result.evento_id}`);
    revalidatePath('/', 'layout');

    // Invalidar caché del cliente
    const contactId = cotizacion.promise.contact_id;
    if (contactId) {
      revalidateTag(`cliente-eventos-${contactId}`, 'max');
      revalidateTag(`cliente-evento-${promiseId}-${contactId}`, 'max');
      revalidateTag(`cliente-dashboard-${result.evento_id}-${contactId}`, 'max');
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[autorizarYCrearEvento] Error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al autorizar cotizaci?n y crear evento',
    };
  }
}

