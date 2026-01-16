'use server';

import { prisma } from '@/lib/prisma';

/**
 * Limpiar duplicados de agenda para eventos
 * Elimina agendas que no coinciden con event_date y mantiene solo la más reciente por evento
 */
export async function limpiarDuplicadosAgenda(studioSlug: string): Promise<{
  success: boolean;
  eliminados: number;
  actualizados: number;
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, eliminados: 0, actualizados: 0, error: 'Studio no encontrado' };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Paso 1: Eliminar agendas que tienen fecha diferente a la del evento
      // Usar raw SQL para comparar solo la fecha (sin hora)
      // Prisma no tiene una forma directa de comparar DATE(date) con DATE(event_date)
      const eliminadosRaw = await tx.$executeRaw`
        DELETE FROM studio_agenda a
        USING studio_eventos e
        WHERE 
          a.evento_id = e.id
          AND a.studio_id = ${studio.id}
          AND a.contexto = 'evento'
          AND e.event_date IS NOT NULL
          AND DATE(a.date) != DATE(e.event_date)
      `;

      // Paso 2: Eliminar duplicados restantes (mismo evento_id, misma fecha)
      // Mantener solo la más reciente
      const eliminadosDuplicados = await tx.$executeRaw`
        WITH ranked_agendas AS (
          SELECT 
            id,
            ROW_NUMBER() OVER (
              PARTITION BY evento_id, DATE(date)
              ORDER BY created_at DESC NULLS LAST, id DESC
            ) as rn
          FROM studio_agenda
          WHERE 
            evento_id IS NOT NULL 
            AND contexto = 'evento'
            AND studio_id = ${studio.id}
        )
        DELETE FROM studio_agenda
        WHERE id IN (
          SELECT id 
          FROM ranked_agendas 
          WHERE rn > 1
        )
      `;

      // Paso 3: Crear/Actualizar agendas faltantes o con fecha incorrecta
      const creados = await tx.$executeRaw`
        INSERT INTO studio_agenda (
          id,
          studio_id,
          evento_id,
          promise_id,
          date,
          concept,
          address,
          contexto,
          status,
          created_at,
          updated_at
        )
        SELECT 
          gen_random_uuid()::text as id,
          e.studio_id,
          e.id as evento_id,
          e.promise_id,
          (DATE_TRUNC('day', e.event_date AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') + INTERVAL '12 hours' as date,
          COALESCE(
            p.name || CASE WHEN et.name IS NOT NULL THEN ' (' || et.name || ')' ELSE '' END,
            et.name,
            'Evento'
          ) as concept,
          COALESCE(p.event_location, c.address) as address,
          'evento' as contexto,
          'pendiente' as status,
          NOW() as created_at,
          NOW() as updated_at
        FROM studio_eventos e
        LEFT JOIN studio_promises p ON e.promise_id = p.id
        LEFT JOIN studio_event_types et ON e.event_type_id = et.id
        LEFT JOIN studio_contacts c ON e.contact_id = c.id
        WHERE 
          e.studio_id = ${studio.id}
          AND e.event_date IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 
            FROM studio_agenda a 
            WHERE a.evento_id = e.id 
            AND a.contexto = 'evento'
            AND DATE(a.date) = DATE(e.event_date)
          )
      `;

      // Paso 4: Actualizar fechas de agendas existentes para que coincidan con event_date
      const actualizados = await tx.$executeRaw`
        UPDATE studio_agenda a
        SET 
          date = (DATE_TRUNC('day', e.event_date AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') + INTERVAL '12 hours',
          updated_at = NOW()
        FROM studio_eventos e
        WHERE 
          a.evento_id = e.id
          AND a.contexto = 'evento'
          AND a.studio_id = ${studio.id}
          AND e.event_date IS NOT NULL
          AND DATE(a.date) != DATE(e.event_date)
      `;

      return {
        eliminados: Number(eliminadosRaw) + Number(eliminadosDuplicados),
        actualizados: Number(actualizados),
        creados: Number(creados),
      };
    });

    return {
      success: true,
      eliminados: result.eliminados,
      actualizados: result.actualizados,
    };
  } catch (error) {
    console.error('[limpiarDuplicadosAgenda] Error:', error);
    return {
      success: false,
      eliminados: 0,
      actualizados: 0,
      error: error instanceof Error ? error.message : 'Error al limpiar duplicados',
    };
  }
}
