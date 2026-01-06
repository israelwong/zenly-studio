'use server';

import { prisma } from '@/lib/prisma';

export interface ReceiptData {
  studio: {
    studio_name: string;
    address: string | null;
    email: string;
    phone: string | null;
    logo_url: string | null;
    bank_name: string | null;
    account_number: string | null;
    account_holder: string | null;
    clabe_number: string | null;
  };
  contact: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
  } | null;
  payment: {
    id: string;
    amount: number;
    payment_method: string;
    payment_date: Date;
    concept: string;
    description: string | null;
  };
  balance: {
    total: number;
    paid: number;
    pending: number;
    price?: number; // Precio base de la cotización
    discount?: number | null; // Descuento aplicado
  };
  paymentHistory?: Array<{
    id: string;
    amount: number;
    payment_method: string;
    payment_date: Date;
    concept: string;
    description: string | null;
  }>;
  event?: {
    name: string | null;
    event_date: Date | null;
    event_location: string | null;
    address: string | null;
    event_type_name: string | null;
  } | null;
}

export async function obtenerDatosComprobante(
  studioSlug: string,
  paymentId: string
): Promise<{ success: boolean; data?: ReceiptData; error?: string }> {
  try {
    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        studio_name: true,
        email: true,
        address: true,
        logo_url: true,
        phones: {
          where: { is_active: true },
          select: { number: true },
          take: 1,
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener método de pago de transferencia configurado (para info bancaria en comprobantes)
    const metodoTransferencia = await prisma.studio_metodos_pago.findFirst({
      where: {
        studio_id: studio.id,
        payment_method: { in: ['transferencia', 'spei_directo'] },
        status: 'active',
        banco: { not: null },
        beneficiario: { not: null },
        cuenta_clabe: { not: null },
      },
      orderBy: { order: 'asc' },
    });

    // Obtener pago con cotización y promesa/evento
    const pago = await prisma.studio_pagos.findFirst({
      where: {
        id: paymentId,
        cotizaciones: {
          studio_id: studio.id,
        },
      },
      include: {
        cotizaciones: {
          select: {
            id: true,
            name: true,
            price: true,
            discount: true,
            status: true,
            // Snapshots de condiciones comerciales (inmutables)
            condiciones_comerciales_name_snapshot: true,
            condiciones_comerciales_description_snapshot: true,
            condiciones_comerciales_advance_percentage_snapshot: true,
            condiciones_comerciales_advance_type_snapshot: true,
            condiciones_comerciales_advance_amount_snapshot: true,
            condiciones_comerciales_discount_percentage_snapshot: true,
            contact: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                address: true,
              },
            },
            pagos: {
              where: {
                status: { in: ['paid', 'completed'] },
              },
              select: {
                id: true,
                amount: true,
                metodo_pago: true,
                payment_date: true,
                created_at: true,
                concept: true,
                description: true,
              },
              orderBy: {
                payment_date: 'desc',
              },
            },
            promise: {
              select: {
                id: true,
                name: true,
                defined_date: true,
                event_location: true,
                address: true,
                event_type: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!pago) {
      return { success: false, error: 'Pago no encontrado' };
    }

    const cotizacion = pago.cotizaciones;
    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Calcular balance considerando condiciones comerciales (snapshots inmutables)
    const precioBase = Number(cotizacion.price);
    
    // Calcular descuento: priorizar porcentaje de condiciones comerciales, luego descuento directo
    let descuento = 0;
    if (cotizacion.condiciones_comerciales_discount_percentage_snapshot) {
      // Descuento porcentual desde condiciones comerciales
      descuento = precioBase * (Number(cotizacion.condiciones_comerciales_discount_percentage_snapshot) / 100);
    } else if (cotizacion.discount) {
      // Descuento directo de la cotización
      descuento = Number(cotizacion.discount);
    }
    
    const total = precioBase - descuento; // Precio final a pagar
    const pagos = cotizacion.pagos.map(p => Number(p.amount));
    const paid = pagos.reduce((sum, amount) => sum + amount, 0);
    const pending = total - paid;

    // Historial de pagos ordenado por fecha
    const paymentHistory = cotizacion.pagos.map(pago => ({
      id: pago.id,
      amount: Number(pago.amount),
      payment_method: pago.metodo_pago,
      payment_date: pago.payment_date || pago.created_at,
      concept: pago.concept,
      description: pago.description,
    }));

    // Datos del contacto
    const contact = cotizacion.contact ? {
      name: cotizacion.contact.name,
      phone: cotizacion.contact.phone,
      email: cotizacion.contact.email,
      address: cotizacion.contact.address,
    } : null;

    // Datos del evento/promesa
    const eventData = cotizacion.promise ? {
      name: cotizacion.promise.name,
      event_date: cotizacion.promise.defined_date,
      event_location: cotizacion.promise.event_location,
      address: cotizacion.promise.address,
      event_type_name: cotizacion.promise.event_type?.name || null,
    } : null;

    return {
      success: true,
      data: {
        studio: {
          studio_name: studio.studio_name,
          address: studio.address,
          email: studio.email,
          phone: studio.phones[0]?.number || null,
          logo_url: studio.logo_url,
          bank_name: metodoTransferencia?.banco || null,
          account_number: null, // Ya no se usa, se usa cuenta_clabe
          account_holder: metodoTransferencia?.beneficiario || null,
          clabe_number: metodoTransferencia?.cuenta_clabe || null,
        },
        contact,
        payment: {
          id: pago.id,
          amount: Number(pago.amount),
          payment_method: pago.metodo_pago,
          payment_date: pago.payment_date || pago.created_at,
          concept: pago.concept,
          description: pago.description,
        },
        balance: {
          total,
          paid,
          pending,
          price: precioBase,
          discount: descuento > 0 ? descuento : null, // Usar el descuento calculado (puede venir de condiciones comerciales o directo)
        },
        paymentHistory,
        event: eventData,
      },
    };
  } catch (error) {
    console.error('[RECEIPT] Error obteniendo datos:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener datos del comprobante',
    };
  }
}

