'use server';

import { prisma } from '@/lib/prisma';
import { SuscripcionData } from './types';

// Tipos específicos para las consultas de Prisma
interface SubscriptionWithRelations {
    id: string;
    studio_id: string;
    stripe_subscription_id: string;
    stripe_customer_id: string;
    plan_id: string;
    status: string;
    current_period_start: Date;
    current_period_end: Date;
    billing_cycle_anchor: Date;
    created_at: Date;
    updated_at: Date;
    plans: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        price_monthly: number | null;
        price_yearly: number | null;
        features: unknown;
        popular: boolean;
        active: boolean;
        order: number;
    };
    items: Array<{
        id: string;
        subscription_id: string;
        item_type: string;
        plan_id: string | null;
        module_id: string | null;
        overage_type: string | null;
        overage_quantity: number | null;
        unit_price: number;
        quantity: number;
        subtotal: number;
        description: string | null;
        activated_at: Date;
        deactivated_at: Date | null;
    }>;
}


interface GetSubscriptionDataResult {
    success: boolean;
    data?: SuscripcionData | null;
    error?: string;
}

export async function getSubscriptionData(studioSlug: string): Promise<GetSubscriptionDataResult> {
    try {
        console.log('🔍 Obteniendo datos de suscripción para studio:', studioSlug);

        // Buscar el studio por slug con plan
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: {
                id: true,
                plan_id: true,
                subscription_status: true,
                subscription_start: true,
                subscription_end: true
            }
        });

        if (!studio) {
            return {
                success: false,
                error: 'Studio no encontrado'
            };
        }

        // Obtener la suscripción activa del studio
        const subscription = await prisma.subscriptions.findFirst({
            where: {
                studio_id: studio.id,
                status: {
                    in: ['ACTIVE', 'TRIAL']
                }
            },
            include: {
                plans: true,
                items: true
            },
            orderBy: { created_at: 'desc' }
        });

        // Si no hay suscripción en la tabla subscriptions, intentar obtener el plan desde studios.plan_id
        if (!subscription) {
            console.log('⚠️ No se encontró suscripción activa en tabla subscriptions, intentando obtener plan desde studio');

            if (!studio.plan_id) {
                return {
                    success: false,
                    error: 'No se encontró suscripción activa para este studio'
                };
            }

            // Obtener el plan directamente desde studios.plan_id
            const plan = await prisma.platform_plans.findUnique({
                where: { id: studio.plan_id }
            });

            if (!plan) {
                return {
                    success: false,
                    error: 'No se encontró el plan asociado al studio'
                };
            }

            // Construir datos de suscripción desde el plan del studio
            const features = plan.features
                ? (typeof plan.features === 'string'
                    ? JSON.parse(plan.features)
                    : plan.features)
                : { highlights: [], modules: [] };

            const limits = await prisma.plan_limits.findMany({
                where: { plan_id: plan.id }
            });

            const suscripcionData: SuscripcionData = {
                subscription: {
                    id: `studio-${studio.id}`,
                    studio_id: studio.id,
                    stripe_subscription_id: '',
                    stripe_customer_id: '',
                    plan_id: plan.id,
                    status: studio.subscription_status as 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'PAUSED' | 'EXPIRED',
                    current_period_start: studio.subscription_start || new Date(),
                    current_period_end: studio.subscription_end || new Date(),
                    billing_cycle_anchor: studio.subscription_start || new Date(),
                    created_at: new Date(),
                    updated_at: new Date(),
                    plan: {
                        id: plan.id,
                        name: plan.name,
                        slug: plan.slug,
                        description: plan.description || '',
                        price_monthly: Number(plan.price_monthly || 0),
                        price_yearly: Number(plan.price_yearly || 0),
                        features: features as { highlights: string[]; modules: string[] },
                        popular: plan.popular,
                        active: plan.active,
                        orden: plan.order || 0
                    }
                },
                plan: {
                    id: plan.id,
                    name: plan.name,
                    slug: plan.slug,
                    description: plan.description || '',
                    price_monthly: Number(plan.price_monthly || 0),
                    price_yearly: Number(plan.price_yearly || 0),
                    features: features as { highlights: string[]; modules: string[] },
                    popular: plan.popular,
                    active: plan.active,
                    orden: plan.order || 0
                },
                limits: limits.map(limit => ({
                    id: limit.id,
                    plan_id: limit.plan_id,
                    limit_type: limit.limit_type,
                    limit_value: limit.limit_value,
                    unit: limit.unit || 'unlimited'
                })),
                items: [],
                billing_history: []
            };

            console.log('✅ Datos de suscripción obtenidos desde studio.plan_id');

            return {
                success: true,
                data: suscripcionData
            };
        }

        console.log('✅ Suscripción encontrada:', {
            id: subscription.id,
            status: subscription.status,
            plan_id: subscription.plan_id,
            has_plan: !!subscription.plans
        });

        // Obtener los límites del plan
        const limits = await prisma.plan_limits.findMany({
            where: { plan_id: subscription.plan_id }
        });

        // Obtener el historial de facturación
        const billingHistory = await prisma.platform_billing_cycles.findMany({
            where: { subscription_id: subscription.id },
            orderBy: { created_at: 'desc' },
            take: 10
        });

        const subscriptionWithRelations = subscription as unknown as SubscriptionWithRelations;

        console.log('📦 Plan data:', {
            id: subscriptionWithRelations.plans.id,
            name: subscriptionWithRelations.plans.name,
            price_monthly: subscriptionWithRelations.plans.price_monthly,
            price_yearly: subscriptionWithRelations.plans.price_yearly,
            order: (subscriptionWithRelations.plans as any).order
        });

        // Parsear features si es Json
        const features = subscriptionWithRelations.plans.features
            ? (typeof subscriptionWithRelations.plans.features === 'string'
                ? JSON.parse(subscriptionWithRelations.plans.features)
                : subscriptionWithRelations.plans.features)
            : { highlights: [], modules: [] };

        const suscripcionData: SuscripcionData = {
            subscription: {
                id: subscriptionWithRelations.id,
                studio_id: subscriptionWithRelations.studio_id,
                stripe_subscription_id: subscriptionWithRelations.stripe_subscription_id,
                stripe_customer_id: subscriptionWithRelations.stripe_customer_id,
                plan_id: subscriptionWithRelations.plan_id,
                status: subscriptionWithRelations.status as 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'PAUSED' | 'EXPIRED',
                current_period_start: subscriptionWithRelations.current_period_start,
                current_period_end: subscriptionWithRelations.current_period_end,
                billing_cycle_anchor: subscriptionWithRelations.billing_cycle_anchor,
                created_at: subscriptionWithRelations.created_at,
                updated_at: subscriptionWithRelations.updated_at,
                plan: {
                    id: subscriptionWithRelations.plans.id,
                    name: subscriptionWithRelations.plans.name,
                    slug: subscriptionWithRelations.plans.slug,
                    description: subscriptionWithRelations.plans.description || '',
                    price_monthly: Number(subscriptionWithRelations.plans.price_monthly || 0),
                    price_yearly: Number(subscriptionWithRelations.plans.price_yearly || 0),
                    features: features as { highlights: string[]; modules: string[] },
                    popular: subscriptionWithRelations.plans.popular,
                    active: subscriptionWithRelations.plans.active,
                    orden: (subscriptionWithRelations.plans as any).order || 0
                }
            },
            plan: {
                id: subscriptionWithRelations.plans.id,
                name: subscriptionWithRelations.plans.name,
                slug: subscriptionWithRelations.plans.slug,
                description: subscriptionWithRelations.plans.description || '',
                price_monthly: Number(subscriptionWithRelations.plans.price_monthly || 0),
                price_yearly: Number(subscriptionWithRelations.plans.price_yearly || 0),
                features: features as { highlights: string[]; modules: string[] },
                popular: subscriptionWithRelations.plans.popular,
                active: subscriptionWithRelations.plans.active,
                orden: (subscriptionWithRelations.plans as any).order || 0
            },
            limits: limits.map(limit => ({
                id: limit.id,
                plan_id: limit.plan_id,
                limit_type: limit.limit_type,
                limit_value: limit.limit_value,
                unit: limit.unit || 'unlimited'
            })),
            items: subscriptionWithRelations.items.map(item => ({
                id: item.id,
                subscription_id: item.subscription_id,
                item_type: item.item_type as 'PLAN' | 'ADDON' | 'OVERAGE' | 'DISCOUNT',
                plan_id: item.plan_id ?? undefined,
                module_id: item.module_id ?? undefined,
                overage_type: item.overage_type ?? undefined,
                overage_quantity: item.overage_quantity ?? undefined,
                unit_price: item.unit_price,
                quantity: item.quantity,
                subtotal: item.subtotal,
                description: item.description ?? undefined,
                activated_at: item.activated_at,
                deactivated_at: item.deactivated_at ?? undefined
            })),
            billing_history: billingHistory.map(bill => ({
                id: bill.id,
                subscription_id: bill.subscription_id,
                amount: Number(bill.amount),
                currency: 'USD', // Default currency since it's not in the schema
                status: bill.status as 'paid' | 'pending' | 'failed',
                description: `Ciclo de facturación ${bill.period_start.toLocaleDateString()} - ${bill.period_end.toLocaleDateString()}`,
                created_at: bill.created_at
            }))
        };

        console.log('✅ Datos de suscripción obtenidos exitosamente');

        return {
            success: true,
            data: suscripcionData
        };

    } catch (error) {
        console.error('❌ Error al obtener datos de suscripción:', error);
        return {
            success: false,
            error: 'Error interno del servidor al obtener datos de suscripción'
        };
    }
}