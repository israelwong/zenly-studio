/**
 * Componente universal de pago
 * Reutilizable entre sección pública y portal del cliente
 */

'use client';
import React, { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PaymentForm from './PaymentForm';
import { CreatePaymentSessionParams } from '@/app/lib/payments/payment-types';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Props {
    paymentParams: CreatePaymentSessionParams;
    onSuccess?: () => void;
    onCancel?: () => void;
    onError?: (error: string) => void;
    className?: string;
    theme?: 'light' | 'dark';
}

export default function UniversalPaymentModal({
    paymentParams,
    onSuccess,
    onCancel,
    onError,
    className = '',
    theme = 'dark'
}: Props) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSuccess = () => {
        setIsOpen(false);
        onSuccess?.();
    };

    const handleCancel = () => {
        setIsOpen(false);
        onCancel?.();
    };

    const handleError = (error: string) => {
        onError?.(error);
    };

    const openModal = () => setIsOpen(true);
    const closeModal = () => setIsOpen(false);

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={openModal}
                className={`bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl ${className}`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Realizar Pago
            </button>

            {/* Payment Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`max-w-md w-full rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto ${theme === 'dark'
                            ? 'bg-zinc-900 border border-zinc-800'
                            : 'bg-white border border-gray-200'
                        }`}>

                        {/* Header */}
                        <div className={`p-6 border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'
                            }`}>
                            <div className="flex items-center justify-between">
                                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                                    }`}>
                                    Realizar Pago
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                                            ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                                            : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Payment Summary */}
                            <div className={`mt-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-zinc-800/50' : 'bg-gray-50'
                                }`}>
                                <p className={`text-sm ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'
                                    }`}>
                                    {paymentParams.cotizacion.nombre}
                                </p>
                                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                                    }`}>
                                    {paymentParams.montoFinal.toLocaleString('es-MX', {
                                        style: 'currency',
                                        currency: 'MXN'
                                    })}
                                </p>
                                {paymentParams.esMSI && (
                                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'
                                        }`}>
                                        {paymentParams.numMSI} meses sin intereses
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Payment Form */}
                        <div className="p-6">
                            <Elements
                                stripe={stripePromise}
                                options={{
                                    appearance: {
                                        theme: theme === 'dark' ? 'night' : 'stripe'
                                    }
                                }}
                            >
                                <PaymentForm
                                    paymentParams={paymentParams}
                                    onSuccess={handleSuccess}
                                    onCancel={handleCancel}
                                    onError={handleError}
                                    theme={theme}
                                />
                            </Elements>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Export named component for easier importing
export { UniversalPaymentModal };
export type { Props as UniversalPaymentModalProps };
