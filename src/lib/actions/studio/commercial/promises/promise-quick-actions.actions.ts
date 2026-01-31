'use server';

import { prisma } from '@/lib/prisma';
import { logPromiseAction } from './promise-logs.actions';
import { getPromiseById } from './promise-logs.actions';

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Registrar acción de WhatsApp enviado
 */
export async function logWhatsAppSent(
  studioSlug: string,
  promiseId: string,
  contactName: string,
  phone: string
): Promise<ActionResponse<{ logged: boolean }>> {
  try {
    const result = await logPromiseAction(
      studioSlug,
      promiseId,
      'whatsapp_sent',
      'user',
      null, // TODO: Obtener userId del contexto
      {
        contactName,
        phone,
      }
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: { logged: true } };
  } catch (error) {
    console.error('[PROMISE_QUICK_ACTIONS] Error registrando WhatsApp:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar WhatsApp',
    };
  }
}

/**
 * Registrar envío de WhatsApp con el texto completo enviado (para bitácora).
 * Crea un log con log_type 'whatsapp_sent' y content = mensaje completo.
 * Si se pasa whatsappTemplateId, se guarda en metadata para badge "Enviado".
 */
export async function logWhatsAppSentWithMessage(
  studioSlug: string,
  promiseId: string,
  contactName: string,
  phone: string,
  messageText: string,
  whatsappTemplateId?: string | null
): Promise<ActionResponse<{ logged: boolean }>> {
  try {
    const promise = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
      select: { studio_id: true },
    });
    if (!promise) {
      return { success: false, error: 'Promesa no encontrada' };
    }
    const studio = await prisma.studios.findUnique({
      where: { id: promise.studio_id },
      select: { slug: true },
    });
    if (!studio || studio.slug !== studioSlug) {
      return { success: false, error: 'Estudio no coincide' };
    }
    const metadata: { contactName: string; phone: string; whatsappTemplateId?: string } = {
      contactName,
      phone,
    };
    if (whatsappTemplateId) metadata.whatsappTemplateId = whatsappTemplateId;
    await prisma.studio_promise_logs.create({
      data: {
        promise_id: promiseId,
        user_id: null,
        content: messageText.trim() || `WhatsApp enviado a ${contactName}`,
        log_type: 'whatsapp_sent',
        metadata,
      },
    });
    return { success: true, data: { logged: true } };
  } catch (error) {
    console.error('[PROMISE_QUICK_ACTIONS] Error registrando WhatsApp con mensaje:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar WhatsApp',
    };
  }
}

/**
 * Registrar acción de llamada realizada
 */
export async function logCallMade(
  studioSlug: string,
  promiseId: string,
  contactName: string,
  phone: string
): Promise<ActionResponse<{ logged: boolean }>> {
  try {
    const result = await logPromiseAction(
      studioSlug,
      promiseId,
      'call_made',
      'user',
      null, // TODO: Obtener userId del contexto
      {
        contactName,
        phone,
      }
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: { logged: true } };
  } catch (error) {
    console.error('[PROMISE_QUICK_ACTIONS] Error registrando llamada:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar llamada',
    };
  }
}

/**
 * Registrar acción de perfil compartido
 */
export async function logProfileShared(
  studioSlug: string,
  promiseId: string,
  contactName: string,
  profileUrl: string
): Promise<ActionResponse<{ logged: boolean }>> {
  try {
    const result = await logPromiseAction(
      studioSlug,
      promiseId,
      'profile_shared',
      'user',
      null, // TODO: Obtener userId del contexto
      {
        contactName,
        profileUrl,
      }
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: { logged: true } };
  } catch (error) {
    console.error('[PROMISE_QUICK_ACTIONS] Error registrando perfil compartido:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar perfil compartido',
    };
  }
}

/**
 * Registrar acción de email enviado
 */
export async function logEmailSent(
  studioSlug: string,
  promiseId: string,
  contactName: string,
  email: string
): Promise<ActionResponse<{ logged: boolean }>> {
  try {
    const result = await logPromiseAction(
      studioSlug,
      promiseId,
      'email_sent',
      'user',
      null, // TODO: Obtener userId del contexto
      {
        contactName,
        email,
      }
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: { logged: true } };
  } catch (error) {
    console.error('[PROMISE_QUICK_ACTIONS] Error registrando email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar email',
    };
  }
}

