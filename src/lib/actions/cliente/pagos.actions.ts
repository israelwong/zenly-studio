'use server';

/**
 * Server Actions para pagos del cliente
 */

import { prisma } from '@/lib/prisma';
import type { ClientPago, StudioBankInfo, ApiResponse } from '@/types/client';

/**
 * Obtiene el historial de pagos de un evento (promise)
 * Acepta tanto event_id (studio_events) como promise_id (studio_promises)
 */
export async function obtenerPagosEvento(eventIdOrPromiseId: string, contactId: string): Promise<ApiResponse<ClientPago[]>> {
  try {
    let promiseId = eventIdOrPromiseId;

    // Verificar si es un event_id (studio_events) o promise_id (studio_promises)
    const event = await prisma.studio_events.findUnique({
      where: { id: eventIdOrPromiseId },
      select: { 
        id: true,
        promise_id: true,
        contact_id: true,
      },
    });

    if (event) {
      // Es un event_id, usar el promise_id asociado
      if (event.contact_id !== contactId) {
        return {
          success: false,
          message: 'No tienes acceso a este evento',
        };
      }
      promiseId = event.promise_id;
    }

    // Verificar que la promesa pertenece al contacto
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        contact_id: contactId,
      },
    });

    if (!promise) {
      return {
        success: false,
        message: 'Evento no encontrado',
      };
    }

    // Obtener pagos
    const pagos = await prisma.studio_pagos.findMany({
      where: {
        promise_id: promiseId,
        status: { in: ['paid', 'completed', 'pending'] },
      },
      select: {
        id: true,
        amount: true,
        payment_date: true,
        status: true,
        metodo_pago: true,
        concept: true,
        description: true,
        created_at: true,
      },
      orderBy: {
        payment_date: 'desc',
      },
    });

    const pagosFormateados: ClientPago[] = pagos.map((pago) => ({
      id: pago.id,
      amount: pago.amount,
      payment_date: pago.payment_date?.toISOString() || pago.created_at.toISOString(),
      status: pago.status,
      metodo_pago: pago.metodo_pago,
      concept: pago.concept,
      description: pago.description,
    }));

    return {
      success: true,
      data: pagosFormateados,
    };
  } catch (error) {
    console.error('[obtenerPagosEvento] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener pagos',
    };
  }
}

/**
 * Obtiene información bancaria del estudio para pagos SPEI
 */
export async function obtenerInfoBancariaStudio(studioId: string): Promise<ApiResponse<StudioBankInfo>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { id: studioId },
      select: {
        id: true,
        clabe_number: true,
        bank_name: true,
        account_holder: true,
      },
    });

    if (!studio) {
      return {
        success: false,
        message: 'Estudio no encontrado',
      };
    }

    return {
      success: true,
      data: {
        studio_id: studio.id,
        clabe: studio.clabe_number,
        banco: studio.bank_name,
        titular: studio.account_holder,
      },
    };
  } catch (error) {
    console.error('[obtenerInfoBancariaStudio] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener información bancaria',
    };
  }
}

