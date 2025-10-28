/**
 * Formulario de pago universal
 * Evolución del FormularioPagoStripe original
 */

'use client';
import React, { useState } from 'react';
import { PaymentElement } from '@stripe/react-stripe-js';
import { useStripePayment } from '@/app/hooks/useStripePayment';
import { CreatePaymentSessionParams } from '@/app/lib/payments/payment-types';

interface Props {
    paymentParams: CreatePaymentSessionParams;
    onSuccess?: () => void;
    onCancel?: () => void;
    onError?: (error: string) => void;
    theme?: 'light' | 'dark';
}

export default function PaymentForm({
    paymentParams,
    onSuccess,
    onCancel,
    onError,
    theme = 'dark'
}: Props) {
    const { processPayment, cancelPayment, isProcessing, error, isReady } = useStripePayment();
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'spei'>('card');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isReady) {
            onError?.('El sistema de pagos no está listo');
            return;
        }

        const result = await processPayment({
            ...paymentParams,
            tipoPago: paymentMethod
        });

        if (result.success) {
            onSuccess?.();
        } else {
            onError?.(result.error || 'Error al procesar el pago');
        }
    };

    const handleCancel = () => {
        cancelPayment(paymentParams);
        onCancel?.();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Method Selector */}
            <div>
                <label className={`block text-sm font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-700'
                    }`}>
                    Método de pago
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`p-4 rounded-lg border-2 transition-all ${paymentMethod === 'card'
                                ? theme === 'dark'
                                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                    : 'border-blue-500 bg-blue-50 text-blue-600'
                                : theme === 'dark'
                                    ? 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600'
                                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                            }`}
                    >
                        <div className="text-center">
                            <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <span className="text-sm font-medium">Tarjeta</span>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setPaymentMethod('spei')}
                        className={`p-4 rounded-lg border-2 transition-all ${paymentMethod === 'spei'
                                ? theme === 'dark'
                                    ? 'border-green-500 bg-green-500/10 text-green-400'
                                    : 'border-green-500 bg-green-50 text-green-600'
                                : theme === 'dark'
                                    ? 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600'
                                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                            }`}
                    >
                        <div className="text-center">
                            <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            <span className="text-sm font-medium">SPEI</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Payment Element (solo para tarjeta) */}
            {paymentMethod === 'card' && (
                <div>
                    <label className={`block text-sm font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-700'
                        }`}>
                        Información de la tarjeta
                    </label>
                    <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-zinc-700 bg-zinc-800/50' : 'border-gray-200 bg-white'
                        }`}>
                        <PaymentElement
                            options={{
                                layout: 'tabs'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* SPEI Info */}
            {paymentMethod === 'spei' && (
                <div className={`p-4 rounded-lg border ${theme === 'dark'
                        ? 'border-blue-700 bg-blue-900/20 text-blue-300'
                        : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}>
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="font-medium text-sm">Pago SPEI</p>
                            <p className="text-xs mt-1 opacity-90">
                                Te redirigiremos a una página segura donde podrás generar la referencia para transferencia bancaria.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* MSI Info */}
            {paymentParams.esMSI && paymentMethod === 'card' && (
                <div className={`p-4 rounded-lg border ${theme === 'dark'
                        ? 'border-green-700 bg-green-900/20 text-green-300'
                        : 'border-green-200 bg-green-50 text-green-700'
                    }`}>
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-sm">
                            {paymentParams.numMSI} meses sin intereses disponibles
                        </span>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className={`p-4 rounded-lg border ${theme === 'dark'
                        ? 'border-red-700 bg-red-900/20 text-red-300'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}>
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm">{error}</span>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isProcessing}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${theme === 'dark'
                            ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400'
                        }`}
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    disabled={!isReady || isProcessing}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${isProcessing
                            ? theme === 'dark'
                                ? 'bg-zinc-600 text-zinc-400'
                                : 'bg-gray-400 text-gray-200'
                            : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400'
                        }`}
                >
                    {isProcessing ? (
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Procesando...
                        </div>
                    ) : (
                        `Pagar ${paymentParams.montoFinal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`
                    )}
                </button>
            </div>
        </form>
    );
}
