'use server';

import { prisma } from '@/lib/prisma';

/**
 * Obtener usuarios activos del studio para selector de agente de ventas
 */
export async function getStudioUsersForAttribution(studioSlug: string) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const users = await prisma.studio_users.findMany({
      where: {
        studio_id: studio.id,
        is_active: true,
      },
      select: {
        id: true,
        full_name: true,
        phone: true,
        type: true,
        role: true,
      },
      orderBy: { full_name: 'asc' },
    });

    return {
      success: true,
      data: users,
    };
  } catch (error) {
    console.error('[PROMISE_ATTRIBUTION] Error obteniendo usuarios:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener usuarios',
    };
  }
}

/**
 * Obtener crew members activos del studio para selector de referidor
 */
export async function getCrewMembersForAttribution(studioSlug: string) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const crewMembers = await prisma.studio_crew_members.findMany({
      where: {
        studio_id: studio.id,
        status: 'activo',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tipo: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: crewMembers,
    };
  } catch (error) {
    console.error('[PROMISE_ATTRIBUTION] Error obteniendo crew members:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener crew members',
    };
  }
}

/**
 * Calcular distribución de comisiones para una promesa
 * 
 * @param promiseId - ID de la promesa
 * @returns Distribución calculada de comisiones
 */
export async function getCommissionDistribution(promiseId: string) {
  try {
    // 1. Obtener la promesa con sus cotizaciones y configuración
    const promise = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
      select: {
        id: true,
        studio_id: true,
        sales_agent_id: true,
        referrer_id: true,
        referrer_type: true,
        commission_payout_total: true,
        quotes: {
          where: {
            archived: false,
            status: {
              in: ['pendiente', 'negociacion', 'en_cierre', 'contract_generated', 'contract_signed'],
            },
          },
          select: {
            id: true,
            price: true,
            discount: true,
          },
        },
        studio: {
          select: {
            id: true,
            configuraciones: {
              where: { status: 'active' },
              orderBy: { updated_at: 'desc' },
              take: 1,
              select: {
                sales_commission: true,
                referral_reward_type: true,
                referral_reward_value: true,
              },
            },
          },
        },
      },
    });

    if (!promise) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    const config = promise.studio.configuraciones[0];
    if (!config) {
      return { success: false, error: 'Configuración de precios no encontrada' };
    }

    // 2. Calcular Total Commission Pool
    // Sumar precio total de todas las cotizaciones activas
    const totalQuoteAmount = promise.quotes.reduce((sum, quote) => {
      const price = quote.price || 0;
      const discount = quote.discount || 0;
      return sum + (price - discount);
    }, 0);

    const salesCommissionRate = config.sales_commission || 0;
    const commissionPool = totalQuoteAmount * salesCommissionRate;

    // 3. Distribuir según tipo de referidor
    let salesAgentAmount = 0;
    let referrerAmount = 0;

    if (promise.referrer_type === 'STAFF' && promise.referrer_id) {
      // Staff referral: Calcular según tipo de recompensa
      const rewardType = config.referral_reward_type || 'PERCENTAGE';
      const rewardValue = config.referral_reward_value || 0.5;

      if (rewardType === 'PERCENTAGE') {
        // Porcentaje del pool
        referrerAmount = commissionPool * rewardValue;
        salesAgentAmount = commissionPool * (1 - rewardValue);
      } else {
        // Monto fijo (capped al pool para evitar pérdidas)
        referrerAmount = Math.min(rewardValue, commissionPool);
        salesAgentAmount = commissionPool - referrerAmount;
      }
    } else if (promise.referrer_type === 'CONTACT' && promise.referrer_id) {
      // Contact referral: No recibe incentivo monetario (solo gratitud)
      referrerAmount = 0;
      salesAgentAmount = commissionPool;
    } else {
      // Sin referidor: Sales agent obtiene 100%
      salesAgentAmount = commissionPool;
      referrerAmount = 0;
    }

    return {
      success: true,
      data: {
        total_quote_amount: totalQuoteAmount,
        commission_pool: commissionPool,
        sales_commission_rate: salesCommissionRate,
        sales_agent_id: promise.sales_agent_id,
        sales_agent_amount: salesAgentAmount,
        referrer_id: promise.referrer_id,
        referrer_type: promise.referrer_type,
        referrer_amount: referrerAmount,
        commission_payout_total: promise.commission_payout_total,
      },
    };
  } catch (error) {
    console.error('[PROMISE_ATTRIBUTION] Error calculando distribución:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al calcular distribución',
    };
  }
}
