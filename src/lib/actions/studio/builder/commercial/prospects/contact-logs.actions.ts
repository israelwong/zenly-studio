'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  createContactLogSchema,
  type CreateContactLogData,
  type ContactLogsResponse,
  type ContactLog,
  type ActionResponse,
} from '@/lib/actions/schemas/prospects-schemas';

/**
 * Obtener logs de un contacto
 */
export async function getContactLogs(
  contactId: string
): Promise<ContactLogsResponse> {
  try {
    const logs = await prisma.studio_contact_logs.findMany({
      where: { contact_id: contactId },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const contactLogs: ContactLog[] = logs.map((log) => ({
      id: log.id,
      contact_id: log.contact_id,
      user_id: log.user_id,
      content: log.content,
      log_type: log.log_type,
      metadata: log.metadata as Record<string, unknown> | null,
      created_at: log.created_at,
      user: log.user
        ? {
            id: log.user.id,
            full_name: log.user.full_name,
          }
        : null,
    }));

    return {
      success: true,
      data: contactLogs,
    };
  } catch (error) {
    console.error('[CONTACT_LOGS] Error obteniendo logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Crear nuevo log de contacto
 */
export async function createContactLog(
  studioSlug: string,
  data: CreateContactLogData
): Promise<ActionResponse<ContactLog>> {
  try {
    const validatedData = createContactLogSchema.parse(data);

    // Verificar que el contacto existe
    const contact = await prisma.studio_contacts.findUnique({
      where: { id: validatedData.contact_id },
      select: { studio_id: true },
    });

    if (!contact) {
      return { success: false, error: 'Contacto no encontrado' };
    }

    const log = await prisma.studio_contact_logs.create({
      data: {
        contact_id: validatedData.contact_id,
        user_id: null, // TODO: Obtener del contexto de autenticación
        content: validatedData.content,
        log_type: validatedData.log_type,
        metadata: validatedData.metadata || null,
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });

    const contactLog: ContactLog = {
      id: log.id,
      contact_id: log.contact_id,
      user_id: log.user_id,
      content: log.content,
      log_type: log.log_type,
      metadata: log.metadata as Record<string, unknown> | null,
      created_at: log.created_at,
      user: log.user
        ? {
            id: log.user.id,
            full_name: log.user.full_name,
          }
        : null,
    };

    revalidatePath(`/${studioSlug}/studio/builder/commercial/prospects`);

    return {
      success: true,
      data: contactLog,
    };
  } catch (error) {
    console.error('[CONTACT_LOGS] Error creando log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear log',
    };
  }
}

