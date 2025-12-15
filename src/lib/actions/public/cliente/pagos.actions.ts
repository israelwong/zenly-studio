'use server';

/**
 * Server Actions para pagos del cliente
 */

import { prisma } from '@/lib/prisma';
import type { ClientPago, StudioBankInfo, ApiResponse } from '@/types/client';

/**
 * Obtiene el historial de pagos de un evento (promise)
 */
export async function obtenerPagosEvento(promiseId: string, contactId: string): Promise<ApiResponse<ClientPago[]>> {
  try {
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
        clabe_interbancaria: true,
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
        clabe: studio.clabe_interbancaria,
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

