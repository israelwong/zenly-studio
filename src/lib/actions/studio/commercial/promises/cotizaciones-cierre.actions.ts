'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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
 * Obtiene el registro de cierre de una cotización
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

    // Verificar que la cotización pertenece al studio
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
      include: {
        condiciones_comerciales: true,
        contract_template: true,
      },
    });

    if (!registro) {
      return { success: false, error: 'Registro de cierre no encontrado' };
    }

    // Convertir Decimal a number para serialización
    return {
      success: true,
      data: {
        id: registro.id,
        cotizacion_id: registro.cotizacion_id,
        condiciones_comerciales_id: registro.condiciones_comerciales_id,
        condiciones_comerciales_definidas: registro.condiciones_comerciales_definidas,
        contract_template_id: registro.contract_template_id,
        contract_content: registro.contract_content,
        contrato_definido: registro.contrato_definido,
        pago_registrado: registro.pago_registrado,
        pago_concepto: registro.pago_concepto,
        pago_monto: registro.pago_monto ? Number(registro.pago_monto) : null,
        pago_fecha: registro.pago_fecha,
        pago_metodo_id: registro.pago_metodo_id,
        condiciones_comerciales: registro.condiciones_comerciales ? {
          id: registro.condiciones_comerciales.id,
          name: registro.condiciones_comerciales.name,
          description: registro.condiciones_comerciales.description,
          discount_percentage: registro.condiciones_comerciales.discount_percentage ? Number(registro.condiciones_comerciales.discount_percentage) : null,
          advance_type: registro.condiciones_comerciales.advance_type,
          advance_percentage: registro.condiciones_comerciales.advance_percentage ? Number(registro.condiciones_comerciales.advance_percentage) : null,
          advance_amount: registro.condiciones_comerciales.advance_amount ? Number(registro.condiciones_comerciales.advance_amount) : null,
        } : null,
        contract_template: registro.contract_template,
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
 * Crea un registro de cierre para una cotización
 * Se llama automáticamente al pasar una cotización a estado "en_cierre"
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

    // Verificar que la cotización pertenece al studio
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

    // Crear registro nuevo
    const registro = await prisma.studio_cotizaciones_cierre.create({
      data: {
        cotizacion_id: cotizacionId,
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

    // Verificar que la cotización pertenece al studio
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
    console.error('[actualizarCondicionesCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar condiciones comerciales',
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
  customContent?: string | null
): Promise<CierreResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la cotización pertenece al studio
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Si templateId está vacío, limpiar el contrato
    const isClearing = !templateId || templateId.trim() === '';
    
    // Actualizar o crear registro de cierre
    const registro = await prisma.studio_cotizaciones_cierre.upsert({
      where: { cotizacion_id: cotizacionId },
      create: {
        cotizacion_id: cotizacionId,
        contract_template_id: isClearing ? null : templateId,
        contract_content: isClearing ? null : customContent,
        contrato_definido: !isClearing,
      },
      update: {
        contract_template_id: isClearing ? null : templateId,
        contract_content: isClearing ? null : customContent,
        contrato_definido: !isClearing,
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
    console.error('[actualizarContratoCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar contrato',
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

    // Verificar que la cotización pertenece al studio
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
    console.error('[actualizarPagoCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar pago',
    };
  }
}

/**
 * Elimina el registro de cierre de una cotización
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

    // Verificar que la cotización pertenece al studio
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

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    if (cotizacion.promise_id) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
    }

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

