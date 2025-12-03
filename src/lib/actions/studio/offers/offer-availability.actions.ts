"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema para validación
const CheckDateAvailabilitySchema = z.object({
  studio_id: z.string(),
  date: z.string(), // YYYY-MM-DD
});

type CheckDateAvailabilityData = z.infer<typeof CheckDateAvailabilitySchema>;

/**
 * Verifica si una fecha está disponible en la agenda del estudio
 * Solo verifica eventos confirmados
 */
export async function checkDateAvailability(data: CheckDateAvailabilityData) {
  try {
    const validated = CheckDateAvailabilitySchema.parse(data);

    // Parsear fecha
    const selectedDate = new Date(validated.date);

    // Crear rango para el día completo (00:00 a 23:59)
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Buscar eventos confirmados en esa fecha
    const confirmedEvents = await prisma.studio_events.findMany({
      where: {
        studio_id: validated.studio_id,
        event_date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: "ACTIVE", // Solo eventos activos/confirmados
      },
      select: {
        id: true,
        event_date: true,
      },
    });

    const isAvailable = confirmedEvents.length === 0;

    return {
      success: true,
      data: {
        available: isAvailable,
        events_count: confirmedEvents.length,
      },
    };
  } catch (error) {
    console.error("[checkDateAvailability] Error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Datos inválidos",
      };
    }

    return {
      success: false,
      error: "Error al verificar disponibilidad",
    };
  }
}
