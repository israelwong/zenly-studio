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

    // Obtener información de la última versión del contrato
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
        contract_version: registro.contract_version,
        contract_signed_at: registro.contract_signed_at,
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
        ultima_version_info: ultimaVersion ? {
          version: ultimaVersion.version,
          change_reason: ultimaVersion.change_reason,
          change_type: ultimaVersion.change_type,
          created_at: ultimaVersion.created_at,
        } : null,
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
 * Obtiene solo los datos del contrato para actualización local (sin recargar todo el registro)
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

    // Obtener información de la última versión del contrato
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
 * Obtener solo datos de condiciones comerciales para actualización local
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
 * Obtener solo datos de pago para actualización local
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

    return {
      success: true,
      data: {
        pago_registrado: registro.pago_registrado,
        pago_concepto: registro.pago_concepto,
        pago_monto: registro.pago_monto ? Number(registro.pago_monto) : null,
        pago_fecha: registro.pago_fecha,
        pago_metodo_id: registro.pago_metodo_id,
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

    // Actualizar registro de cierre para quitar condiciones
    const registro = await prisma.studio_cotizaciones_cierre.update({
      where: { cotizacion_id: cotizacionId },
      data: {
        condiciones_comerciales_id: null,
        condiciones_comerciales_definidas: false,
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

    // Determinar si es una edición manual del estudio (customContent presente)
    const isManualEdit = customContent !== null && customContent !== undefined;

    // Detectar si se está volviendo a agregar una plantilla después de haberla desasociado
    const isReAddingTemplate = !isClearing &&
      registroActual &&
      !registroActual.contract_template_id &&
      templateId &&
      templateId.trim() !== '';

    // Detectar si se está cambiando de una plantilla a otra
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

    // Si es edición manual y existe un registro, siempre versionar
    if (isManualEdit && registroActual && !isClearing) {
      const currentVersion = registroActual.contract_version || 1;
      const newVersion = currentVersion + 1;

      // Guardar versión anterior antes de actualizar (solo si existe contenido previo y no existe ya la versión)
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
              change_reason: 'Edición manual del contrato por el estudio',
            },
          });
        }
      }

      // Actualizar registro con nuevo contenido y versión incrementada
      const registro = await prisma.studio_cotizaciones_cierre.update({
        where: { cotizacion_id: cotizacionId },
        data: {
          contract_template_id: templateId,
          contract_content: contentToSave,
          contract_version: newVersion,
          contrato_definido: true,
        },
      });

      revalidatePath(`/${studioSlug}/studio/commercial/promises`);
      if (cotizacion.promise_id) {
        revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
        revalidatePath(`/${studioSlug}/promise/${cotizacion.promise_id}`);
      }

      return {
        success: true,
        data: {
          id: registro.id,
          cotizacion_id: registro.cotizacion_id,
        },
      };
    } else if (isFirstTimeAssociating) {
      // Primera vez asociando plantilla: empezar en versión 1
      const registro = await prisma.studio_cotizaciones_cierre.update({
        where: { cotizacion_id: cotizacionId },
        data: {
          contract_template_id: templateId,
          contract_content: contentToSave,
          contract_version: 1,
          contrato_definido: true,
        },
      });

      revalidatePath(`/${studioSlug}/studio/commercial/promises`);
      if (cotizacion.promise_id) {
        revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
        revalidatePath(`/${studioSlug}/promise/${cotizacion.promise_id}`);
      }

      return {
        success: true,
        data: {
          id: registro.id,
          cotizacion_id: registro.cotizacion_id,
        },
      };
    } else if (isReAddingTemplate || isChangingTemplate) {
      // Volver a agregar plantilla después de desasociar o cambiar de plantilla: versionar el cambio
      const currentVersion = registroActual.contract_version || 1;
      const newVersion = currentVersion + 1;

      // Guardar versión anterior antes de actualizar (solo si existe contenido previo y no existe ya la versión)
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
                ? 'Plantilla de contrato reasignada después de desasociación'
                : 'Plantilla de contrato cambiada',
            },
          });
        }
      }

      // Actualizar registro con nueva plantilla y versión incrementada
      const registro = await prisma.studio_cotizaciones_cierre.update({
        where: { cotizacion_id: cotizacionId },
        data: {
          contract_template_id: templateId,
          contract_content: contentToSave, // Puede ser null si solo se asigna la plantilla
          contract_version: newVersion,
          contrato_definido: true,
        },
      });

      revalidatePath(`/${studioSlug}/studio/commercial/promises`);
      if (cotizacion.promise_id) {
        revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
        revalidatePath(`/${studioSlug}/promise/${cotizacion.promise_id}`);
      }

      return {
        success: true,
        data: {
          id: registro.id,
          cotizacion_id: registro.cotizacion_id,
        },
      };
    } else {
      // Primera vez o limpiar contrato: crear/actualizar sin versionado
      // Si se está limpiando (desasociando plantilla), eliminar el historial de versiones
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
          contract_version: 1, // Primera versión
          contrato_definido: !isClearing,
        },
        update: {
          contract_template_id: isClearing ? null : templateId,
          contract_content: isClearing ? null : contentToSave,
          // Si se está limpiando, resetear a versión 1 ya que eliminamos el historial
          contract_version: isClearing ? 1 : (registroActual?.contract_version || 1),
          contrato_definido: !isClearing,
        },
      });

      revalidatePath(`/${studioSlug}/studio/commercial/promises`);
      if (cotizacion.promise_id) {
        revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
        revalidatePath(`/${studioSlug}/promise/${cotizacion.promise_id}`);
      }

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

