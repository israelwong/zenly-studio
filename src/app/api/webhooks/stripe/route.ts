import { NextRequest, NextResponse } from "next/server";
import { getStripe, getStripeWebhookSecret, stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

// Deshabilitar body parsing para validar firma de Stripe
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("❌ No se encontró firma de Stripe");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Validar firma del webhook
    const webhookSecret = getStripeWebhookSecret();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const error = err as Error;
    console.error("❌ Error validando firma de Stripe:", error.message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${error.message}` },
      { status: 400 }
    );
  }

  // Procesar evento según tipo. Responder 200 OK solo tras validar firma;
  // el procesamiento es síncrono para no perder eventos si falla (Stripe reintenta si no hay 200).
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionCreatedOrUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`⚠️ Evento no manejado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Error procesando webhook:", error);
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    );
  }
}

/**
 * checkout.session.completed: extrae studio_id y plan_id de metadata y sincroniza con subscription
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log("🛒 Procesando checkout.session.completed:", session.id);

  const studioId = session.metadata?.studio_id;
  const planId = session.metadata?.plan_id;

  if (!studioId) {
    console.error("❌ studio_id no encontrado en metadata de checkout.session:", session.metadata);
    return;
  }

  if (session.mode !== "subscription" || !session.subscription) {
    console.log("⚠️ Sesión no es de suscripción o sin subscription id, ignorando");
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (subscription.metadata) {
    subscription.metadata.studio_id = subscription.metadata.studio_id || studioId;
    subscription.metadata.plan_id = subscription.metadata.plan_id || planId || "";
  } else {
    (subscription as Stripe.Subscription & { metadata?: Record<string, string> }).metadata = {
      studio_id: studioId,
      plan_id: planId || "",
    };
  }
  await handleSubscriptionCreatedOrUpdated(subscription);
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log("💰 Procesando payment_intent.succeeded:", paymentIntent.id);

  // Verificar si este payment intent es para una invitación (revenue share)
  const metadata = paymentIntent.metadata;
  const serviceType = metadata?.service_type;
  const studioId = metadata?.studio_id;

  // Solo procesar si es para un servicio externo (invitación)
  if (serviceType !== "invitation" || !studioId) {
    console.log("⚠️ Payment intent no es para invitación, ignorando:", {
      service_type: serviceType,
      studio_id: studioId,
    });
    return;
  }

  // Validación de idempotencia: Verificar si ya existe registro
  const existingSale = await prisma.studio_external_service_sales.findUnique({
    where: { stripe_payment_intent_id: paymentIntent.id },
  });

  if (existingSale) {
    console.log("⚠️ Pago ya procesado (idempotencia):", paymentIntent.id);
    return;
  }

  // Paso 1: Obtener amount_total y stripe_fee
  const amountTotal = paymentIntent.amount / 100; // Convertir centavos a Decimal
  let stripeFee = 0;

  // Obtener fee desde el charge si está disponible
  if (paymentIntent.charges?.data && paymentIntent.charges.data.length > 0) {
    const charge = paymentIntent.charges.data[0];
    if (charge.balance_transaction) {
      const balanceTransaction = await stripe.balanceTransactions.retrieve(
        charge.balance_transaction as string
      );
      stripeFee = balanceTransaction.fee / 100; // Convertir centavos a Decimal
      console.log("💰 Stripe Fee desglose:", {
        balance_transaction_id: balanceTransaction.id,
        fee_total: stripeFee,
        amount: balanceTransaction.amount / 100,
        net: balanceTransaction.net / 100,
        fee_details: balanceTransaction.fee_details,
      });
    }
  }

  // Paso 2: Obtener base_cost desde platform_config (NUNCA del payload)
  const platformConfig = await prisma.platform_config.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!platformConfig) {
    console.error("❌ platform_config no encontrado. No se puede procesar revenue share.");
    // No lanzar error, solo loguear y retornar
    // Esto puede pasar si el payment intent es para una suscripción, no para invitación
    return;
  }

  const baseCost = platformConfig.invitation_base_cost
    ? Number(platformConfig.invitation_base_cost)
    : 0;

  if (baseCost === 0) {
    console.warn("⚠️ invitation_base_cost es 0 o no está configurado");
  }

  // Paso 3: Calcular utilidad neta
  const netProfit = amountTotal - stripeFee - baseCost;

  console.log("📊 Cálculo Revenue Share:", {
    amount_total: amountTotal,
    stripe_fee: stripeFee,
    base_cost: baseCost,
    net_profit: netProfit,
    studio_amount: netProfit / 2,
    platform_amount: netProfit / 2,
  });

  if (netProfit < 0) {
    console.error(
      `❌ net_profit negativo: ${netProfit} (amount_total: ${amountTotal}, stripe_fee: ${stripeFee}, base_cost: ${baseCost})`
    );
    throw new Error("net_profit no puede ser negativo");
  }

  // Paso 4: Dividir utilidad 50/50
  const studioAmount = netProfit / 2;
  const platformAmount = netProfit / 2;

  // Identificar contexto desde metadata del payment_intent (ya obtenido arriba)
  const schedulerTaskId = metadata.scheduler_task_id || null;
  const eventId = metadata.event_id || null;

  if (!studioId) {
    throw new Error("studio_id no encontrado en metadata del payment_intent");
  }

  // Validar que studio existe y está activo
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { id: true, is_active: true, stripe_account_id: true },
  });

  if (!studio) {
    throw new Error(`Studio ${studioId} no encontrado`);
  }

  if (!studio.is_active) {
    throw new Error(`Studio ${studioId} no está activo`);
  }

  // Obtener contact_id y customer_name_cache
  let contactId: string | null = null;
  let customerNameCache: string | null = null;

  if (eventId) {
    const event = await prisma.studio_events.findUnique({
      where: { id: eventId },
      include: { contact: true },
    });

    if (event) {
      contactId = event.contact_id;
      customerNameCache = event.contact.name;
    }
  } else if (schedulerTaskId) {
    const task = await prisma.studio_scheduler_event_tasks.findUnique({
      where: { id: schedulerTaskId },
      include: {
        scheduler_instance: {
          include: {
            event: {
              include: { contact: true },
            },
          },
        },
      },
    });

    if (task?.scheduler_instance?.event) {
      contactId = task.scheduler_instance.event.contact_id;
      customerNameCache = task.scheduler_instance.event.contact.name;
    }
  }

  // Paso 5: Crear registro en studio_external_service_sales
  const sale = await prisma.studio_external_service_sales.create({
    data: {
      studio_id: studioId,
      contact_id: contactId,
      customer_name_cache: customerNameCache,
      event_id: eventId,
      scheduler_task_id: schedulerTaskId,
      service_type: "invitation",
      amount_total: amountTotal,
      base_cost: baseCost,
      stripe_fee: stripeFee,
      studio_amount: studioAmount,
      platform_amount: platformAmount,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id:
        paymentIntent.charges?.data?.[0]?.id || null,
      status: "completed",
      payment_date: new Date(),
      metadata: {
        payment_intent_id: paymentIntent.id,
        customer_id: paymentIntent.customer,
        currency: paymentIntent.currency,
      },
    },
  });

  console.log("✅ Registro creado:", sale.id);

  // Paso 6: Actualizar invitation_status si hay scheduler_task_id
  if (schedulerTaskId) {
    await prisma.studio_scheduler_event_tasks.update({
      where: { id: schedulerTaskId },
      data: { invitation_status: "PAID" as const },
    });
    console.log("✅ invitation_status actualizado a PAID para tarea:", schedulerTaskId);
  }

  // Paso 7: Transferir a studio si tiene stripe_account_id
  if (studio.stripe_account_id) {
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(studioAmount * 100), // Convertir a centavos
        currency: paymentIntent.currency || "mxn",
        destination: studio.stripe_account_id,
        metadata: {
          sale_id: sale.id,
          payment_intent_id: paymentIntent.id,
        },
      });

      await prisma.studio_external_service_sales.update({
        where: { id: sale.id },
        data: {
          stripe_transfer_id: transfer.id,
          transfer_date: new Date(),
        },
      });

      console.log("✅ Transfer creado:", transfer.id);
    } catch (transferError) {
      console.error("❌ Error creando transfer:", transferError);
      // No lanzar error, el registro ya está creado
    }
  } else {
    console.log("⚠️ Studio no tiene stripe_account_id, transfer omitido");
  }

  return sale;
}

/**
 * Maneja eventos de suscripción creada o actualizada
 */
async function handleSubscriptionCreatedOrUpdated(subscription: Stripe.Subscription) {
  console.log("📦 Procesando subscription.created/updated:", subscription.id);
  console.log("📋 Subscription data:", {
    id: subscription.id,
    status: subscription.status,
    current_period_start: subscription.current_period_start,
    current_period_end: subscription.current_period_end,
    billing_cycle_anchor: subscription.billing_cycle_anchor,
    metadata: subscription.metadata,
  });

  const studioId = subscription.metadata?.studio_id;
  const planId = subscription.metadata?.plan_id;

  if (!studioId) {
    console.error("❌ studio_id no encontrado en metadata de la suscripción");
    console.error("📋 Metadata disponible:", subscription.metadata);
    // Intentar obtener studio_id desde el customer si está disponible
    if (subscription.customer) {
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer.id;
      const studio = await prisma.studios.findFirst({
        where: { stripe_customer_id: customerId },
        select: { id: true },
      });
      if (studio) {
        console.log("✅ Studio encontrado por stripe_customer_id:", studio.id);
        // Continuar con el studio_id encontrado
        // Pero necesitamos actualizar el metadata o usar el studio.id directamente
        // Por ahora, retornamos y esperamos que el metadata esté en el siguiente evento
        return;
      }
    }
    return;
  }

  // Verificar idempotencia: buscar si ya existe una suscripción con este stripe_subscription_id
  let existingSubscription = await prisma.subscriptions.findUnique({
    where: { stripe_subscription_id: subscription.id },
  });

  if (existingSubscription) {
    console.log("✅ Suscripción ya existe, actualizando:", existingSubscription.id);
  }

  // Obtener plan desde plan_id en metadata o desde price (mensual o anual)
  let planIdToUse = planId;
  if (!planIdToUse && subscription.items.data.length > 0) {
    const priceId = subscription.items.data[0].price.id;
    const plan = await prisma.platform_plans.findFirst({
      where: {
        OR: [
          { stripe_price_id: priceId },
          { stripe_price_id_yearly: priceId },
        ],
      },
      select: { id: true },
    });
    if (plan) {
      planIdToUse = plan.id;
    }
  }

  if (!planIdToUse) {
    console.error("❌ No se pudo determinar plan_id para la suscripción");
    return;
  }

  // Determinar estado de la suscripción
  let subscriptionStatus: string;
  switch (subscription.status) {
    case "active":
      subscriptionStatus = "ACTIVE";
      break;
    case "trialing":
      subscriptionStatus = "TRIAL";
      break;
    case "past_due":
      subscriptionStatus = "ACTIVE"; // Stripe past_due: pago pendiente pero suscripción sigue activa; enum no tiene PAST_DUE
      break;
    case "canceled":
    case "unpaid":
      subscriptionStatus = "CANCELLED";
      break;
    default:
      subscriptionStatus = "ACTIVE";
  }

  // Obtener fechas del período - Stripe usa timestamps Unix (segundos)
  // Si no están disponibles en el evento, recuperar la suscripción completa desde Stripe
  let subscriptionStart: Date;
  let subscriptionEnd: Date;
  let billingCycleAnchor: Date;

  if (subscription.current_period_start && subscription.current_period_end) {
    subscriptionStart = new Date(subscription.current_period_start * 1000);
    subscriptionEnd = new Date(subscription.current_period_end * 1000);
    billingCycleAnchor = subscription.billing_cycle_anchor
      ? new Date(subscription.billing_cycle_anchor * 1000)
      : subscriptionStart;
  } else {
    // Si las fechas no están disponibles, recuperar la suscripción completa desde Stripe
    console.warn("⚠️ Fechas de período no disponibles en evento, recuperando desde Stripe API");
    try {
      const stripe = getStripe();
      const fullSubscription = await stripe.subscriptions.retrieve(subscription.id, {
        expand: ['latest_invoice'],
      });

      if (fullSubscription.current_period_start && fullSubscription.current_period_end) {
        subscriptionStart = new Date(fullSubscription.current_period_start * 1000);
        subscriptionEnd = new Date(fullSubscription.current_period_end * 1000);
        billingCycleAnchor = fullSubscription.billing_cycle_anchor
          ? new Date(fullSubscription.billing_cycle_anchor * 1000)
          : subscriptionStart;
        console.log("✅ Fechas recuperadas desde Stripe API");
      } else {
        // Si aún no están disponibles, usar valores por defecto
        console.warn("⚠️ Fechas aún no disponibles, usando valores por defecto");
        const now = new Date();
        subscriptionStart = now;
        subscriptionEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        billingCycleAnchor = now;
      }
    } catch (error) {
      console.error("❌ Error recuperando suscripción desde Stripe:", error);
      // Usar valores por defecto en caso de error
      const now = new Date();
      subscriptionStart = now;
      subscriptionEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      billingCycleAnchor = now;
    }
  }

  // Validar que las fechas sean válidas
  if (isNaN(subscriptionStart.getTime()) || isNaN(subscriptionEnd.getTime())) {
    console.error("❌ Fechas de período inválidas después de conversión:", {
      subscriptionStart: subscriptionStart,
      subscriptionEnd: subscriptionEnd,
    });
    // Usar valores por defecto si las fechas son inválidas
    const now = new Date();
    subscriptionStart = now;
    subscriptionEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    billingCycleAnchor = now;
  }

  if (existingSubscription) {
    // Actualizar suscripción y studio de forma atómica
    await prisma.$transaction([
      prisma.subscriptions.update({
        where: { id: existingSubscription.id },
        data: {
          status: subscriptionStatus,
          plan_id: planIdToUse,
          current_period_start: subscriptionStart,
          current_period_end: subscriptionEnd,
          billing_cycle_anchor: billingCycleAnchor,
          updated_at: new Date(),
        },
      }),
      prisma.studios.update({
        where: { id: studioId },
        data: {
          subscription_status: subscriptionStatus,
          plan_id: planIdToUse,
          subscription_start: subscriptionStart,
          subscription_end: subscriptionEnd,
          stripe_subscription_id: subscription.id,
        },
      }),
    ]);

    console.log("✅ Suscripción actualizada:", existingSubscription.id);
  } else {
    // Crear nueva suscripción
    const customerId = subscription.customer as string;

    // Verificar si el studio tiene stripe_customer_id
    const studio = await prisma.studios.findUnique({
      where: { id: studioId },
      select: { stripe_customer_id: true },
    });

    if (!studio) {
      console.error(`❌ Studio ${studioId} no encontrado`);
      return;
    }

    // Actualizar stripe_customer_id si no existe
    if (!studio.stripe_customer_id) {
      await prisma.studios.update({
        where: { id: studioId },
        data: { stripe_customer_id: customerId },
      });
    }

    // Verificar si es una reactivación (studio estaba cancelado) ANTES de crear
    const studioBeforeUpdate = await prisma.studios.findUnique({
      where: { id: studioId },
      select: {
        subscription_status: true,
        is_active: true,
        data_retention_until: true,
      },
    });

    const isReactivation = studioBeforeUpdate?.subscription_status === "CANCELLED";

    // Double-check: Verificar nuevamente antes de crear (evitar condición de carrera)
    existingSubscription = await prisma.subscriptions.findUnique({
      where: { stripe_subscription_id: subscription.id },
    });

    if (existingSubscription) {
      console.log("⚠️ Suscripción creada entre verificaciones, actualizando:", existingSubscription.id);
      await prisma.$transaction([
        prisma.subscriptions.update({
          where: { id: existingSubscription.id },
          data: {
            status: subscriptionStatus,
            plan_id: planIdToUse,
            current_period_start: subscriptionStart,
            current_period_end: subscriptionEnd,
            billing_cycle_anchor: billingCycleAnchor,
            updated_at: new Date(),
          },
        }),
        prisma.studios.update({
          where: { id: studioId },
          data: {
            subscription_status: subscriptionStatus,
            plan_id: planIdToUse,
            subscription_start: subscriptionStart,
            subscription_end: subscriptionEnd,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            ...(isReactivation && {
              is_active: true,
              data_retention_until: null,
            }),
          },
        }),
      ]);

      if (isReactivation) {
        console.log("✅ Studio reactivado:", studioId);
      }

      console.log("✅ Suscripción actualizada:", existingSubscription.id);
      return; // Salir temprano, ya se actualizó
    }

    // Crear suscripción y actualizar studio de forma atómica
    try {
      await prisma.$transaction([
        prisma.subscriptions.create({
          data: {
            studio_id: studioId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            plan_id: planIdToUse,
            status: subscriptionStatus,
            current_period_start: subscriptionStart,
            current_period_end: subscriptionEnd,
            billing_cycle_anchor: billingCycleAnchor,
          },
        }),
        prisma.studios.update({
          where: { id: studioId },
          data: {
            subscription_status: subscriptionStatus,
            plan_id: planIdToUse,
            subscription_start: subscriptionStart,
            subscription_end: subscriptionEnd,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            ...(isReactivation && {
              is_active: true,
              data_retention_until: null,
            }),
          },
        }),
      ]);
    } catch (error: unknown) {
      const prismaError = error as { code?: string; meta?: { target?: string[] } };
      // Si falla por constraint único, significa que otra ejecución ya lo creó
      if (prismaError?.code === 'P2002' && prismaError?.meta?.target?.includes('stripe_subscription_id')) {
        console.log("⚠️ Suscripción ya existe (condición de carrera), actualizando...");
        // Buscar la suscripción existente y actualizarla
        const existing = await prisma.subscriptions.findUnique({
          where: { stripe_subscription_id: subscription.id },
        });
        if (existing) {
          await prisma.$transaction([
            prisma.subscriptions.update({
              where: { id: existing.id },
              data: {
                status: subscriptionStatus,
                plan_id: planIdToUse,
                current_period_start: subscriptionStart,
                current_period_end: subscriptionEnd,
                billing_cycle_anchor: billingCycleAnchor,
                updated_at: new Date(),
              },
            }),
            prisma.studios.update({
              where: { id: studioId },
              data: {
                subscription_status: subscriptionStatus,
                plan_id: planIdToUse,
                subscription_start: subscriptionStart,
                subscription_end: subscriptionEnd,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscription.id,
                ...(isReactivation && {
                  is_active: true,
                  data_retention_until: null,
                }),
              },
            }),
          ]);

          if (isReactivation) {
            console.log("✅ Studio reactivado:", studioId);
          }

          console.log("✅ Suscripción actualizada después de condición de carrera:", existing.id);
          return; // Salir temprano, ya se actualizó
        } else {
          console.error("❌ Error: Suscripción no encontrada después de constraint error");
          return;
        }
      } else {
        // Si es otro error, lanzarlo
        throw error;
      }
    }

    if (isReactivation) {
      console.log("✅ Studio reactivado:", studioId);
    }

    console.log("✅ Suscripción creada para studio:", studioId);
  }
}

/**
 * Maneja eventos de suscripción eliminada/cancelada
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("🗑️ Procesando subscription.deleted:", subscription.id);

  let studioId = subscription.metadata?.studio_id;

  // Si studioId no está en metadata, intentar encontrarlo por customer_id
  if (!studioId && subscription.customer) {
    const studioByCustomer = await prisma.studios.findFirst({
      where: { stripe_customer_id: subscription.customer as string },
      select: { id: true },
    });
    if (studioByCustomer) {
      studioId = studioByCustomer.id;
      console.log("✅ Studio ID encontrado por customer_id:", studioId);
    }
  }

  if (!studioId) {
    console.error("❌ studio_id no encontrado en metadata ni por customer_id de la suscripción");
    return;
  }

  // Actualizar suscripción en DB
  const existingSubscription = await prisma.subscriptions.findFirst({
    where: { stripe_subscription_id: subscription.id },
  });

  if (existingSubscription) {
    await prisma.subscriptions.update({
      where: { id: existingSubscription.id },
      data: {
        status: "CANCELLED",
        updated_at: new Date(),
      },
    });
  }

  // Obtener subscription_end para calcular data_retention_until
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: {
      subscription_end: true,
    },
  });

  // Calcular data_retention_until: 30 días después de subscription_end
  let dataRetentionUntil: Date | null = null;
  if (studio?.subscription_end) {
    dataRetentionUntil = new Date(studio.subscription_end);
    dataRetentionUntil.setDate(dataRetentionUntil.getDate() + 30);
  } else if (subscription.current_period_end) {
    // Si no hay subscription_end en DB, usar el del webhook
    const periodEnd = new Date(subscription.current_period_end * 1000);
    dataRetentionUntil = new Date(periodEnd);
    dataRetentionUntil.setDate(dataRetentionUntil.getDate() + 30);
  }

  // Actualizar studios
  await prisma.studios.update({
    where: { id: studioId },
    data: {
      subscription_status: "CANCELLED",
      data_retention_until: dataRetentionUntil,
    },
  });

  console.log("✅ Suscripción cancelada para studio:", studioId);
  if (dataRetentionUntil) {
    console.log(`📅 Datos se mantendrán hasta: ${dataRetentionUntil.toISOString()}`);
  }
}
