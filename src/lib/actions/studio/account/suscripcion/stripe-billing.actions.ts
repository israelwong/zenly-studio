"use server";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";

interface CreateCustomerPortalResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface CreateSubscriptionCheckoutResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Crea una sesión de Stripe Customer Portal para gestionar facturación
 */
export async function createCustomerPortal(
  studioSlug: string
): Promise<CreateCustomerPortalResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        stripe_customer_id: true,
        email: true,
      },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    if (!studio.stripe_customer_id) {
      return {
        success: false,
        error: "No hay cliente de Stripe asociado. Crea una suscripción primero.",
      };
    }

    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: studio.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/${studioSlug}/studio/config/account/suscripcion`,
    });

    return { success: true, url: portalSession.url };
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error creando Customer Portal:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Crea una sesión de Stripe Checkout para suscripción inicial o actualiza la existente con proration
 */
export async function createSubscriptionCheckout(
  studioSlug: string,
  priceId: string
): Promise<CreateSubscriptionCheckoutResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        studio_name: true,
        email: true,
        stripe_customer_id: true,
        stripe_subscription_id: true,
        subscription_status: true,
        subscription_end: true,
        is_active: true,
        data_retention_until: true,
      },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Validar que no sea cuenta UNLIMITED (no puede cambiar suscripción)
    if (studio.subscription_status === "UNLIMITED") {
      return { 
        success: false, 
        error: "Esta cuenta tiene plan ilimitado. No se puede cambiar la suscripción desde aquí." 
      };
    }

    // Verificar que el priceId existe y está activo (buscar en mensual o anual)
    const plan = await prisma.platform_plans.findFirst({
      where: {
        active: true,
        OR: [
          { stripe_price_id: priceId },
          { stripe_price_id_yearly: priceId },
        ],
      },
      select: { id: true, name: true },
    });

    if (!plan) {
      return { success: false, error: "Plan no encontrado o inactivo" };
    }

    const stripe = getStripe();
    let customerId = studio.stripe_customer_id;

    // Crear customer si no existe
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: studio.email,
        name: studio.studio_name,
        metadata: {
          studio_id: studio.id,
          studio_slug: studioSlug,
        },
      });

      customerId = customer.id;

      // Guardar customer_id en DB
      await prisma.studios.update({
        where: { id: studio.id },
        data: { stripe_customer_id: customerId },
      });
    }

    // Verificar y limpiar suscripciones canceladas en Stripe antes de crear nueva
    if (customerId) {
      try {
        const existingSubscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 10,
          status: "canceled",
        });

        // Si hay suscripciones canceladas, verificar si alguna coincide con nuestra DB
        if (existingSubscriptions.data.length > 0 && studio.stripe_subscription_id) {
          const cancelledMatch = existingSubscriptions.data.find(
            (sub) => sub.id === studio.stripe_subscription_id
          );

          if (cancelledMatch) {
            // La suscripción en nuestra DB está cancelada en Stripe
            // Limpiar stripe_subscription_id para permitir crear nueva
            console.log(`🧹 Limpiando stripe_subscription_id cancelado: ${studio.stripe_subscription_id}`);
            await prisma.studios.update({
              where: { id: studio.id },
              data: { stripe_subscription_id: null },
            });
          }
        }
      } catch (error) {
        // Si hay error al listar, continuar (no es crítico)
        console.warn("⚠️ Error verificando suscripciones canceladas:", error);
      }
    }

    // Detectar si es reactivación
    const now = new Date();
    const subscriptionEnd = studio.subscription_end ? new Date(studio.subscription_end) : null;
    const isInActivePeriod = subscriptionEnd && subscriptionEnd > now;
    const isInRetentionPeriod = studio.data_retention_until && 
                                new Date(studio.data_retention_until) > now &&
                                (!subscriptionEnd || subscriptionEnd <= now);
    
    const isReactivation = studio.subscription_status === "CANCELLED" && 
                           (isInActivePeriod || isInRetentionPeriod);

    // CASO 1: Reactivación durante período activo (subscription_end > now())
    // Intentar reactivar/actualizar suscripción existente en Stripe
    if (isReactivation && isInActivePeriod && studio.stripe_subscription_id) {
      try {
        // Obtener suscripción de Stripe
        const currentSubscription = await stripe.subscriptions.retrieve(
          studio.stripe_subscription_id
        );

        // Verificar si la suscripción aún existe y está cancelada al final del período
        if (currentSubscription.status === "active" && currentSubscription.cancel_at_period_end) {
          const currentPriceId = currentSubscription.items.data[0]?.price?.id;
          
          // Reactivar el studio en DB
          await prisma.studios.update({
            where: { id: studio.id },
            data: {
              is_active: true,
              data_retention_until: null,
            },
          });

          // Si es el mismo plan, solo reactivar (quitar cancel_at_period_end)
          if (currentPriceId === priceId) {
            await stripe.subscriptions.update(studio.stripe_subscription_id, {
              cancel_at_period_end: false,
              metadata: {
                studio_id: studio.id,
                studio_slug: studioSlug,
                plan_id: plan.id,
              },
            });
            
            console.log("✅ Suscripción reactivada (mismo plan)");
            revalidatePath(`/${studioSlug}/studio/config/account/suscripcion`);
            return { success: true };
          } else {
            // Si es plan diferente, actualizar con proration
            await stripe.subscriptions.update(studio.stripe_subscription_id, {
              items: [
                {
                  id: currentSubscription.items.data[0].id,
                  price: priceId,
                },
              ],
              proration_behavior: "create_prorations",
              cancel_at_period_end: false,
              metadata: {
                studio_id: studio.id,
                studio_slug: studioSlug,
                plan_id: plan.id,
              },
            });
            
            console.log("✅ Suscripción reactivada y actualizada con proration");
            revalidatePath(`/${studioSlug}/studio/config/account/suscripcion`);
            return { success: true };
          }
        }
      } catch (error) {
        // Si la suscripción no existe o hay error, continuar con creación nueva
        console.warn("⚠️ No se pudo reactivar suscripción existente, creando nueva:", error);
      }
    }

    // CASO 2: Reactivación durante período de retención (subscription_end < now())
    // O reactivación cuando no hay suscripción activa en Stripe
    if (isReactivation) {
      // Reactivar el studio antes de crear la nueva suscripción
      await prisma.studios.update({
        where: { id: studio.id },
        data: {
          is_active: true,
          data_retention_until: null, // Limpiar ya que se está reactivando
        },
      });
      console.log(`✅ Studio ${studioSlug} reactivado antes de crear nueva suscripción`);
    }

    // Si el usuario ya tiene una suscripción activa (ACTIVE o TRIAL), actualizarla con proration
    if (studio.stripe_subscription_id && 
        (studio.subscription_status === "ACTIVE" || studio.subscription_status === "TRIAL")) {
      try {
        // Obtener la suscripción actual de Stripe
        const currentSubscription = await stripe.subscriptions.retrieve(
          studio.stripe_subscription_id
        );

        // Verificar si el plan ya es el mismo
        const currentPriceId = currentSubscription.items.data[0]?.price?.id;
        if (currentPriceId === priceId) {
          return { success: false, error: "Ya tienes este plan activo" };
        }

        // Actualizar suscripción con proration automática
        // Stripe calcula automáticamente la diferencia proporcional
        const updatedSubscription = await stripe.subscriptions.update(
          studio.stripe_subscription_id,
          {
            items: [
              {
                id: currentSubscription.items.data[0].id,
                price: priceId,
              },
            ],
            proration_behavior: "create_prorations", // Calcula y cobra/credita la diferencia
            metadata: {
              studio_id: studio.id,
              studio_slug: studioSlug,
              plan_id: plan.id,
            },
          }
        );

        console.log("✅ Suscripción actualizada con proration:", updatedSubscription.id);
        
        // Revalidar la página para mostrar el estado actualizado
        revalidatePath(`/${studioSlug}/studio/config/account/suscripcion`);

        // Retornar success sin URL porque no necesitamos redirigir a Checkout
        return { success: true };
      } catch (updateError) {
        const err = updateError as Error;
        console.error("❌ Error actualizando suscripción:", err);
        return { success: false, error: `Error al actualizar suscripción: ${err.message}` };
      }
    }

    // Si no tiene suscripción activa, crear una nueva con Checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/${studioSlug}/studio/config/account/suscripcion?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/${studioSlug}/studio/config/account/suscripcion?canceled=true`,
      metadata: {
        studio_id: studio.id,
        studio_slug: studioSlug,
        plan_id: plan.id,
      },
      subscription_data: {
        metadata: {
          studio_id: studio.id,
          studio_slug: studioSlug,
          plan_id: plan.id,
        },
      },
    });

    return { success: true, url: checkoutSession.url };
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error creando Checkout:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Cancela una suscripción activa
 */
export async function cancelSubscription(studioSlug: string): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        stripe_customer_id: true,
        subscription_end: true,
      },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Buscar la suscripción activa
    const subscription = await prisma.subscriptions.findFirst({
      where: {
        studio_id: studio.id,
        status: { in: ["ACTIVE", "TRIAL"] },
      },
      select: {
        id: true,
        stripe_subscription_id: true,
        current_period_end: true,
      },
    });

    if (!subscription || !subscription.stripe_subscription_id) {
      return { success: false, error: "No se encontró una suscripción activa" };
    }

    // Cancelar en Stripe
    const stripe = getStripe();
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

    // Calcular data_retention_until: 30 días después de subscription_end
    let dataRetentionUntil: Date | null = null;
    if (studio.subscription_end) {
      dataRetentionUntil = new Date(studio.subscription_end);
      dataRetentionUntil.setDate(dataRetentionUntil.getDate() + 30);
    } else if (subscription.current_period_end) {
      dataRetentionUntil = new Date(subscription.current_period_end);
      dataRetentionUntil.setDate(dataRetentionUntil.getDate() + 30);
    }

    // Actualizar studio con data_retention_until
    // El webhook actualizará subscription_status a CANCELLED
    if (dataRetentionUntil) {
      await prisma.studios.update({
        where: { id: studio.id },
        data: {
          data_retention_until: dataRetentionUntil,
        },
      });
    }

    // Revalidar la página para mostrar el estado actualizado
    revalidatePath(`/${studioSlug}/studio/config/account/suscripcion`);

    return { success: true };
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error cancelando suscripción:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene todos los planes activos disponibles
 */
export async function getAvailablePlans() {
  try {
    const plans = await prisma.platform_plans.findMany({
      where: { 
        active: true,
        slug: { not: "unlimited" } // Excluir plan unlimited de las opciones
      },
      include: {
        plan_limits: {
          select: {
            limit_type: true,
            limit_value: true,
            unit: true,
          },
        },
      },
      orderBy: { order: "asc" },
    });

    return {
      success: true,
      data: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price_monthly: Number(plan.price_monthly || 0),
        price_yearly: Number(plan.price_yearly || 0),
        stripe_price_id: plan.stripe_price_id,
        stripe_price_id_yearly: plan.stripe_price_id_yearly || null,
        stripe_product_id: plan.stripe_product_id,
        popular: plan.popular,
        features: plan.features,
        limits: plan.plan_limits,
      })),
    };
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error obteniendo planes:", err);
    return { success: false, error: err.message, data: [] };
  }
}

