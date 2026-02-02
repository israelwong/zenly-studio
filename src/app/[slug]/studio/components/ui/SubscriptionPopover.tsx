'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, CreditCard, Calendar, DollarSign, Edit, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenButton, ZenBadge } from '@/components/ui/zen';
import { getSubscriptionData } from '@/lib/actions/studio/account/suscripcion/suscripcion.actions';
import type { SuscripcionData } from '@/lib/actions/studio/account/suscripcion/types';
import { cn } from '@/lib/utils';

interface SubscriptionPopoverProps {
    studioSlug: string;
    children: React.ReactNode;
}

export function SubscriptionPopover({ studioSlug, children }: SubscriptionPopoverProps) {
    const [data, setData] = useState<SuscripcionData | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const loadSubscriptionData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getSubscriptionData(studioSlug);
            console.log('SubscriptionPopover - Result:', result);
            if (result.success && result.data) {
                console.log('SubscriptionPopover - Data loaded:', result.data);
                setData(result.data);
            } else {
                console.error('SubscriptionPopover - Error:', result.error);
            }
        } catch (error) {
            console.error('SubscriptionPopover - Exception:', error);
        } finally {
            setLoading(false);
        }
    }, [studioSlug]);

    useEffect(() => {
        if (open && !data) {
            loadSubscriptionData();
        }
    }, [open, data, loadSubscriptionData]);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'USD',
        }).format(price);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(new Date(date));
    };

    const getPrice = () => {
        if (!data) return 'N/A';
        // Determinar si es mensual o anual basado en el billing_cycle_anchor
        // Por simplicidad, asumimos mensual si no hay información clara
        return formatPrice(data.plan.price_monthly);
    };

    const getStatusBadge = () => {
        if (!data) return null;
        const status = data.subscription.status;
        const variants: Record<string, 'success' | 'warning' | 'info'> = {
            'ACTIVE': 'success',
            'TRIAL': 'info',
            'CANCELLED': 'warning',
        };
        return (
            <ZenBadge variant={variants[status] || 'default'} size="sm">
                {status === 'ACTIVE' ? 'Activa' : status === 'TRIAL' ? 'Prueba' : status}
            </ZenBadge>
        );
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-80 bg-zinc-900 border-zinc-800 p-0 shadow-xl"
                sideOffset={8}
            >
                {loading ? (
                    <div className="p-8 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
                        <p className="text-sm font-medium text-zinc-300">Cargando información...</p>
                    </div>
                ) : !loading && !data ? (
                    <div className="p-8 text-center space-y-2">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
                            <CreditCard className="h-6 w-6 text-zinc-500" />
                        </div>
                        <p className="text-sm font-medium text-zinc-300">No se pudo cargar la información</p>
                        <p className="text-xs text-zinc-500">
                            Verifica que tengas una suscripción activa
                        </p>
                    </div>
                ) : data ? (
                    <div className="p-0">
                        {/* Header minimalista */}
                        <div className="px-5 pt-5 pb-4 border-b border-zinc-800">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-semibold text-white mb-1">
                                        {data.plan.name}
                                    </h3>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-lg font-semibold text-zinc-200">
                                            {getPrice().replace('USD', '').trim()}
                                        </span>
                                        <span className="text-xs text-zinc-500">/mes</span>
                                    </div>
                                </div>
                                {getStatusBadge()}
                            </div>
                        </div>

                        {/* Contenido minimalista */}
                        <div className="px-5 py-4 space-y-4">
                            {/* Próxima facturación */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Calendar className="h-4 w-4 text-zinc-500" />
                                    <div>
                                        <p className="text-xs text-zinc-500 mb-0.5">Próxima facturación</p>
                                        <p className="text-sm text-zinc-200">
                                            {formatDate(data.subscription.current_period_end)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Método de pago */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <CreditCard className="h-4 w-4 text-zinc-500" />
                                    <div>
                                        <p className="text-xs text-zinc-500 mb-0.5">Método de pago</p>
                                        <p className="text-sm text-zinc-200">Tarjeta</p>
                                    </div>
                                </div>
                                <Link
                                    href={`/${studioSlug}/studio/config/suscripcion`}
                                    onClick={() => setOpen(false)}
                                >
                                    <ZenButton
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                    >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Editar
                                    </ZenButton>
                                </Link>
                            </div>
                        </div>

                        {/* Footer minimalista */}
                        <div className="px-5 pb-5 pt-4 border-t border-zinc-800">
                            <Link
                                href={`/${studioSlug}/studio/config/suscripcion`}
                                onClick={() => setOpen(false)}
                                className="block"
                            >
                                <ZenButton
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                >
                                    Cambiar de plan
                                </ZenButton>
                            </Link>
                        </div>
                    </div>
                ) : null}
            </PopoverContent>
        </Popover>
    );
}
