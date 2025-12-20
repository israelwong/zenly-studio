import React from 'react';
import { CreditCard, DollarSign, Calendar, CheckCircle } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenBadge } from '@/components/ui/zen';

interface PaymentsViewProps {
    payments?: Array<{
        id: string;
        amount: number;
        status: 'pending' | 'completed' | 'failed';
        date: string;
        description: string;
    }>;
}

/**
 * PaymentsView - Payment history and billing information
 * Shows payment history, billing details, and payment methods
 * Used in /[slug]/payment route
 */
export function PaymentsSection({ payments = [] }: PaymentsViewProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-green-400" />;
            case 'pending':
                return <Calendar className="h-4 w-4 text-yellow-400" />;
            case 'failed':
                return <CreditCard className="h-4 w-4 text-red-400" />;
            default:
                return <CreditCard className="h-4 w-4 text-zinc-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'pending':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'failed':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            default:
                return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
        }
    };

    if (payments.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="text-zinc-400 mb-2">
                    <CreditCard className="h-12 w-12 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-medium text-zinc-300 mb-2">
                    No hay pagos registrados
                </h3>
                <p className="text-sm text-zinc-500">
                    Los pagos aparecerán aquí cuando se realicen
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-zinc-100 mb-2">
                    Historial de Pagos
                </h2>
                <p className="text-sm text-zinc-400">
                    {payments.length} {payments.length === 1 ? 'pago' : 'pagos'} registrados
                </p>
            </div>

            {/* Payments List */}
            <div className="space-y-4">
                {payments.map((payment) => (
                    <ZenCard key={payment.id}>
                        <ZenCardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(payment.status)}
                                    <div>
                                        <p className="font-medium text-zinc-100">
                                            {payment.description}
                                        </p>
                                        <p className="text-sm text-zinc-400">
                                            {new Date(payment.date).toLocaleDateString('es-MX')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold text-zinc-100">
                                        {formatCurrency(payment.amount)}
                                    </span>
                                    <ZenBadge
                                        variant="outline"
                                        className={`text-xs ${getStatusColor(payment.status)}`}
                                    >
                                        {payment.status === 'completed' ? 'Completado' :
                                            payment.status === 'pending' ? 'Pendiente' : 'Fallido'}
                                    </ZenBadge>
                                </div>
                            </div>
                        </ZenCardContent>
                    </ZenCard>
                ))}
            </div>

            {/* Payment Methods */}
            <ZenCard>
                <ZenCardHeader>
                    <ZenCardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Métodos de Pago
                    </ZenCardTitle>
                </ZenCardHeader>
                <ZenCardContent>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                            <CreditCard className="h-5 w-5 text-zinc-400" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-zinc-100">
                                    Tarjeta terminada en 4242
                                </p>
                                <p className="text-xs text-zinc-400">
                                    Visa •••• 4242
                                </p>
                            </div>
                            <ZenBadge variant="outline" className="text-xs">
                                Principal
                            </ZenBadge>
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
