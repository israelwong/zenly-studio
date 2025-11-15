// ========================================
// TIPOS PARA SUSCRIPCIÓN
// ========================================

export interface Plan {
    id: string;
    name: string;
    slug: string;
    description: string;
    price_monthly: number;
    price_yearly: number;
    features: {
        highlights: string[];
        modules: string[];
    };
    popular: boolean;
    active: boolean;
    orden: number;
}

export interface PlanLimit {
    id: string;
    plan_id: string;
    limit_type: string;
    limit_value: number;
    unit: string;
}

export interface Subscription {
    id: string;
    studio_id: string;
    stripe_subscription_id: string;
    stripe_customer_id: string;
    plan_id: string;
    status: 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'PAUSED' | 'EXPIRED';
    current_period_start: Date;
    current_period_end: Date;
    billing_cycle_anchor: Date;
    created_at: Date;
    updated_at: Date;
    plan: Plan;
}

export interface SubscriptionItem {
    id: string;
    subscription_id: string;
    item_type: 'PLAN' | 'ADDON' | 'OVERAGE' | 'DISCOUNT';
    plan_id?: string;
    module_id?: string;
    overage_type?: string;
    overage_quantity?: number;
    unit_price: number;
    quantity: number;
    subtotal: number;
    description?: string;
    activated_at: Date;
    deactivated_at?: Date;
}

export interface BillingHistory {
    id: string;
    subscription_id: string;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'failed';
    description: string;
    created_at: Date;
}

export interface SuscripcionData {
    subscription: Subscription;
    plan: Plan;
    limits: PlanLimit[];
    items: SubscriptionItem[];
    billing_history: BillingHistory[];
}

export interface SuscripcionFormData {
    plan_id: string;
    billing_cycle: 'monthly' | 'yearly';
}
