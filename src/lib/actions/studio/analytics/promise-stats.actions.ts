"use server";

import { prisma } from "@/lib/prisma";

export interface PromiseStatsOptions {
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PromiseStatsData {
  // Status actual
  currentStatus: {
    pending: number;
    negotiation: number;
    closing: number;
    approved: number;
    archived: number;
    canceled: number;
  };
  // Conversiones en período
  conversions: {
    total: number;
    totalValue: number;
    byDate: Array<{ date: string; count: number; value: number }>;
  };
  // Canceladas en período
  canceled: {
    total: number;
    byDate: Array<{ date: string; count: number }>;
  };
  // Cambios de stage en período
  stageChanges: {
    total: number;
    byStage: Array<{ stageSlug: string; stageName: string; count: number }>;
    byDate: Array<{ date: string; count: number }>;
  };
  // Promesas creadas en período
  created: {
    total: number;
    byDate: Array<{ date: string; count: number }>;
  };
}

export async function getPromiseStats(
  studioId: string,
  options?: PromiseStatsOptions
): Promise<{ success: boolean; data?: PromiseStatsData; error?: string }> {
  try {
    const dateFrom = options?.dateFrom || (() => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      return date;
    })();

    const dateTo = options?.dateTo || (() => {
      const date = new Date();
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      date.setHours(23, 59, 59, 999);
      return date;
    })();

    // Obtener stages del studio
    const stages = await prisma.studio_promise_pipeline_stages.findMany({
      where: {
        studio_id: studioId,
        is_active: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    const stageMap = new Map(stages.map(s => [s.slug, s]));

    // 1. Status actual de promesas
    const currentPromises = await prisma.studio_promises.findMany({
      where: {
        studio_id: studioId,
        is_test: false,
        pipeline_stage_id: { not: null },
      },
      select: {
        pipeline_stage: {
          select: {
            slug: true,
          },
        },
      },
    });

    const currentStatus = {
      pending: 0,
      negotiation: 0,
      closing: 0,
      approved: 0,
      archived: 0,
      canceled: 0,
    };

    currentPromises.forEach(p => {
      const slug = p.pipeline_stage?.slug || 'pending';
      if (slug in currentStatus) {
        currentStatus[slug as keyof typeof currentStatus]++;
      }
    });

    // 2. Conversiones (promesas que pasaron a "approved" en el período)
    const conversionsHistory = await prisma.studio_promise_status_history.findMany({
      where: {
        promise: {
          studio_id: studioId,
        },
        to_stage_slug: 'approved',
        created_at: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        created_at: true,
        promise_id: true,
        promise: {
          select: {
            quotes: {
              where: {
                status: { in: ['aprobada', 'autorizada', 'approved'] },
                archived: false,
              },
              select: {
                price: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    // Agrupar conversiones por fecha
    const conversionsByDate = new Map<string, { count: number; value: number }>();
    conversionsHistory.forEach(entry => {
      const dateKey = entry.created_at.toISOString().split('T')[0];
      const current = conversionsByDate.get(dateKey) || { count: 0, value: 0 };
      const quoteValue = entry.promise.quotes[0]?.price || 0;
      conversionsByDate.set(dateKey, {
        count: current.count + 1,
        value: current.value + Number(quoteValue),
      });
    });

    const conversionsByDateArray = Array.from(conversionsByDate.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 3. Canceladas en período
    const canceledHistory = await prisma.studio_promise_status_history.findMany({
      where: {
        promise: {
          studio_id: studioId,
        },
        to_stage_slug: 'canceled',
        created_at: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        created_at: true,
      },
    });

    const canceledByDate = new Map<string, number>();
    canceledHistory.forEach(entry => {
      const dateKey = entry.created_at.toISOString().split('T')[0];
      canceledByDate.set(dateKey, (canceledByDate.get(dateKey) || 0) + 1);
    });

    const canceledByDateArray = Array.from(canceledByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4. Cambios de stage en período
    const stageChanges = await prisma.studio_promise_status_history.findMany({
      where: {
        promise: {
          studio_id: studioId,
        },
        created_at: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        to_stage_slug: true,
        created_at: true,
      },
    });

    const changesByStage = new Map<string, number>();
    const changesByDate = new Map<string, number>();

    stageChanges.forEach(change => {
      const slug = change.to_stage_slug;
      changesByStage.set(slug, (changesByStage.get(slug) || 0) + 1);

      const dateKey = change.created_at.toISOString().split('T')[0];
      changesByDate.set(dateKey, (changesByDate.get(dateKey) || 0) + 1);
    });

    const changesByStageArray = Array.from(changesByStage.entries())
      .map(([slug, count]) => ({
        stageSlug: slug,
        stageName: stageMap.get(slug)?.name || slug,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const changesByDateArray = Array.from(changesByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 5. Promesas creadas en período
    const createdPromises = await prisma.studio_promises.findMany({
      where: {
        studio_id: studioId,
        is_test: false,
        created_at: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        created_at: true,
      },
    });

    const createdByDate = new Map<string, number>();
    createdPromises.forEach(promise => {
      const dateKey = promise.created_at.toISOString().split('T')[0];
      createdByDate.set(dateKey, (createdByDate.get(dateKey) || 0) + 1);
    });

    const createdByDateArray = Array.from(createdByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalConversionValue = conversionsHistory.reduce((sum, entry) => {
      const quoteValue = entry.promise.quotes[0]?.price || 0;
      return sum + Number(quoteValue);
    }, 0);

    return {
      success: true,
      data: {
        currentStatus,
        conversions: {
          total: conversionsHistory.length,
          totalValue: totalConversionValue,
          byDate: conversionsByDateArray,
        },
        canceled: {
          total: canceledHistory.length,
          byDate: canceledByDateArray,
        },
        stageChanges: {
          total: stageChanges.length,
          byStage: changesByStageArray,
          byDate: changesByDateArray,
        },
        created: {
          total: createdPromises.length,
          byDate: createdByDateArray,
        },
      },
    };
  } catch (error) {
    console.error('[getPromiseStats] Error:', error);
    return {
      success: false,
      error: 'Error al obtener estadísticas de promesas',
    };
  }
}
