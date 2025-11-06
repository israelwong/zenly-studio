'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createPromiseLogSchema = z.object({
  promise_id: z.string(),
  content: z.string().min(1, 'El contenido es requerido'),
  log_type: z.string().default('note'),
  metadata: z.record(z.unknown()).optional(),
});

export type CreatePromiseLogData = z.infer<typeof createPromiseLogSchema>;

export interface PromiseLog {
  id: string;
  promise_id: string;
  user_id: string | null;
  content: string;
  log_type: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  user: {
    id: string;
    full_name: string;
  } | null;
}

export interface PromiseLogsResponse {
  success: boolean;
  data?: PromiseLog[];
  error?: string;
}

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Obtener promiseId desde contactId
 */
export async function getPromiseIdByContactId(
  contactId: string
): Promise<ActionResponse<{ promise_id: string }>> {
  try {
    const promise = await prisma.studio_promises.findFirst({
      where: { contact_id: contactId },
      orderBy: { created_at: 'desc' },
      select: { id: true },
    });

    if (!promise) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    return {
      success: true,
      data: { promise_id: promise.id },
    };
  } catch (error) {
    console.error('[PROMISE_LOGS] Error obteniendo promise ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtener logs de una promesa
 */
export async function getPromiseLogs(
  promiseId: string
): Promise<PromiseLogsResponse> {
  try {
    const logs = await prisma.studio_promise_logs.findMany({
      where: { promise_id: promiseId },
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

    const promiseLogs: PromiseLog[] = logs.map((log) => ({
      id: log.id,
      promise_id: log.promise_id,
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
      data: promiseLogs,
    };
  } catch (error) {
    console.error('[PROMISE_LOGS] Error obteniendo logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Crear nuevo log de promesa
 */
export async function createPromiseLog(
  studioSlug: string,
  data: CreatePromiseLogData
): Promise<ActionResponse<PromiseLog>> {
  try {
    const validatedData = createPromiseLogSchema.parse(data);

    // Verificar que la promesa existe
    const promise = await prisma.studio_promises.findUnique({
      where: { id: validatedData.promise_id },
      select: { studio_id: true },
    });

    if (!promise) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    const log = await prisma.studio_promise_logs.create({
      data: {
        promise_id: validatedData.promise_id,
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

    const promiseLog: PromiseLog = {
      id: log.id,
      promise_id: log.promise_id,
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

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);

    return {
      success: true,
      data: promiseLog,
    };
  } catch (error) {
    console.error('[PROMISE_LOGS] Error creando log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear log',
    };
  }
}
