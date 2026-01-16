'use server';

import { prisma } from '@/lib/prisma';

export interface EventoResumenData {
  evento: {
    id: string;
    created_at: Date;
    event_date: Date | null;
    name: string | null;
  };
  cotizacion: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    discount: number | null;
    condiciones_comerciales_id: string | null;
    condiciones_comerciales_name_snapshot: string | null;
    condiciones_comerciales_description_snapshot: string | null;
    condiciones_comerciales_advance_percentage_snapshot: number | null;
    condiciones_comerciales_advance_type_snapshot: string | null;
    condiciones_comerciales_advance_amount_snapshot: any | null;
    condiciones_comerciales_discount_percentage_snapshot: number | null;
    negociacion_precio_original: number | null;
    negociacion_precio_personalizado: number | null;
    contract_template_id_snapshot: string | null;
    contract_template_name_snapshot: string | null;
    contract_content_snapshot: string | null;
    contract_version_snapshot: number | null;
    contract_signed_at_snapshot: Date | null;
    contract_signed_ip_snapshot: string | null;
  };
  pagos: Array<{
    id: string;
    amount: number;
    concept: string;
    payment_date: Date | null;
    metodo_pago: string;
    metodo_pago_id: string | null;
  }>;
  totalPagado: number;
  montoInicial: number | null;
}

export async function obtenerResumenEventoCreado(
  studioSlug: string,
  eventoId: string
): Promise<{
  success: boolean;
  data?: EventoResumenData;
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

    const evento = await prisma.studio_events.findFirst({
      where: {
        id: eventoId,
        studio_id: studio.id,
      },
      select: {
        id: true,
        created_at: true,
        event_date: true,
        cotizacion_id: true,
        promise_id: true,
        promise: {
          select: {
            name: true,
          },
        },
        cotizacion: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            discount: true,
            condiciones_comerciales_id: true,
            condiciones_comerciales_name_snapshot: true,
            condiciones_comerciales_description_snapshot: true,
            condiciones_comerciales_advance_percentage_snapshot: true,
            condiciones_comerciales_advance_type_snapshot: true,
            condiciones_comerciales_advance_amount_snapshot: true,
            condiciones_comerciales_discount_percentage_snapshot: true,
            negociacion_precio_original: true,
            negociacion_precio_personalizado: true,
            contract_template_id_snapshot: true,
            contract_template_name_snapshot: true,
            contract_content_snapshot: true,
            contract_version_snapshot: true,
            contract_signed_at_snapshot: true,
            contract_signed_ip_snapshot: true,
          },
        },
      },
    });

    if (!evento) {
      return { success: false, error: 'Evento no encontrado' };
    }

    if (!evento.cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Obtener pagos asociados a la cotización
    const pagos = await prisma.studio_pagos.findMany({
      where: {
        cotizacion_id: evento.cotizacion.id,
        status: 'completed',
      },
      select: {
        id: true,
        amount: true,
        concept: true,
        payment_date: true,
        metodo_pago: true,
        metodo_pago_id: true,
      },
      orderBy: {
        payment_date: 'desc',
      },
    });

    const totalPagado = pagos.reduce((sum, pago) => sum + pago.amount, 0);
    const montoInicial = pagos.length > 0 ? pagos[0].amount : null;

    return {
      success: true,
      data: {
        evento: {
          id: evento.id,
          created_at: evento.created_at,
          event_date: evento.event_date,
          name: evento.promise?.name || null,
        },
        cotizacion: {
          ...evento.cotizacion,
          price: Number(evento.cotizacion.price),
          discount: evento.cotizacion.discount ? Number(evento.cotizacion.discount) : null,
          condiciones_comerciales_advance_amount_snapshot: evento.cotizacion.condiciones_comerciales_advance_amount_snapshot != null
            ? Number(evento.cotizacion.condiciones_comerciales_advance_amount_snapshot)
            : null,
          negociacion_precio_original: evento.cotizacion.negociacion_precio_original !== null && evento.cotizacion.negociacion_precio_original !== undefined
            ? Number(evento.cotizacion.negociacion_precio_original)
            : null,
          negociacion_precio_personalizado: evento.cotizacion.negociacion_precio_personalizado !== null && evento.cotizacion.negociacion_precio_personalizado !== undefined
            ? Number(evento.cotizacion.negociacion_precio_personalizado)
            : null,
        },
        pagos,
        totalPagado,
        montoInicial,
      },
    };
  } catch (error) {
    console.error('[EVENTO_RESUMEN] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener resumen del evento',
    };
  }
}

