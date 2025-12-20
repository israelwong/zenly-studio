export interface Plan {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    features?: string[] | null; // JSON field
    limits?: Record<string, unknown> | null; // JSON field
    price_monthly?: number | null;
    price_yearly?: number | null;
    popular: boolean;
    active: boolean;
    orden: number;
    stripe_price_id?: string | null;
    stripe_product_id?: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: {
        studios: number;
        subscriptions: number;
    };
}

export interface PlanFormData {
    name: string;
    slug: string;
    description?: string;
    features?: string; // JSON string for form
    limits?: string; // JSON string for form
    price_monthly?: number;
    price_yearly?: number;
    popular: boolean;
    active: boolean;
    orden: number;
    stripe_price_id?: string;
    stripe_product_id?: string;
}

export interface PlanFeature {
    name: string;
    included: boolean;
    limit?: number;
}

export interface PlanLimits {
    studios?: number;
    leads?: number;
    campaigns?: number;
    agents?: number;
    storage?: number; // GB
}
