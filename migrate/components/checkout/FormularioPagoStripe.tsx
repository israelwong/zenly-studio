'use client';
import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface Props {
    cotizacionId: string;
    paymentData: {
        montoFinal: number;
        esMSI: boolean;
        numMSI: number;
        tipoPago: 'spei' | 'card';
        cotizacion: {
            nombre: string;
            cliente: string;
        };
        metodo: {
            nombre: string;
            tipo: string;
        };
    };
    onSuccess?: (paymentIntent?: any) => void;
    onCancel?: () => void;
    returnUrl?: string; // 🎯 Nueva prop para URL de retorno customizable
    isCanceling?: boolean; // 🆕 Estado de cancelación
    isProcessingPayment?: boolean; // 🆕 Estado de procesamiento de pago externo
    isProcessingConfirmation?: boolean; // 🆕 Estado de procesamiento de confirmación
}

export default function FormularioPagoStripe({
    cotizacionId,
    paymentData,
    onSuccess,
    onCancel,
    returnUrl,
    isCanceling = false,
    isProcessingPayment = false,
    isProcessingConfirmation = false
}: Props) {
    const stripe = useStripe();
    const elements = useElements();

    const [mensaje, setMensaje] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            setMensaje('Stripe no está disponible. Recarga la página.');
            return;
        }

        setIsLoading(true);
        setMensaje(null);

        console.log('🚀 Iniciando confirmación de pago...', {
            cotizacionId,
            tipoPago: paymentData.tipoPago,
            esMSI: paymentData.esMSI,
            numMSI: paymentData.numMSI
        });

        const confirmParams: any = {};

        // 🎯 Solo agregar return_url si está definido explícitamente
        if (returnUrl) {
            confirmParams.return_url = returnUrl;
        }

        // 🎯 MSI: Configurar plan específico durante confirmación
        if (paymentData.tipoPago === 'card' && paymentData.esMSI && paymentData.numMSI > 0) {
            // ✅ AQUÍ especificamos el plan MSI exacto durante la confirmación
            confirmParams.payment_method_options = {
                card: {
                    installments: {
                        plan: {
                            count: paymentData.numMSI,
                            interval: 'month',
                            type: 'fixed_count',
                        },
                    },
                },
            };
            console.log(`💳 MSI ESPECÍFICO en confirmación: ${paymentData.numMSI} meses`);
        } else if (paymentData.tipoPago === 'spei') {
            console.log('🏦 Procesando pago SPEI');
        } else {
            console.log('💳 Procesando pago único');
        }

        try {
            // 🎯 Si tenemos returnUrl, usar redirección de Stripe (cotizaciones)
            if (returnUrl) {
                const { error } = await stripe.confirmPayment({
                    elements,
                    confirmParams: {
                        ...confirmParams,
                        return_url: returnUrl,
                    },
                });

                if (error) {
                    console.error('❌ Error en confirmPayment (redirect):', error);
                    if (error.type === "card_error" || error.type === "validation_error") {
                        setMensaje(error.message || 'Ocurrió un error con tu método de pago.');
                    } else {
                        setMensaje("Un error inesperado ocurrió. Inténtalo de nuevo.");
                    }
                } else {
                    console.log('✅ Pago procesado correctamente (redirect a Stripe)');
                    // Stripe maneja la redirección automáticamente
                }
            } else {
                // 🎯 Si NO hay returnUrl, usar callback (clientes)
                const { error, paymentIntent } = await stripe.confirmPayment({
                    elements,
                    confirmParams: {
                        ...confirmParams,
                        return_url: undefined, // No redirigir
                    },
                    redirect: 'if_required', // Solo redirigir si es absolutamente necesario
                });

                if (error) {
                    console.error('❌ Error en confirmPayment (callback):', error);
                    if (error.type === "card_error" || error.type === "validation_error") {
                        setMensaje(error.message || 'Ocurrió un error con tu método de pago.');
                    } else {
                        setMensaje("Un error inesperado ocurrió. Inténtalo de nuevo.");
                    }
                } else if (paymentIntent) {
                    // 🏦 LÓGICA ESPECÍFICA PARA SPEI
                    if (paymentData.tipoPago === 'spei') {
                        // Para SPEI, considerar exitoso si está en processing, requires_action, o succeeded
                        if (['succeeded', 'processing', 'requires_action'].includes(paymentIntent.status)) {
                            console.log('✅ Pago SPEI procesado correctamente:', paymentIntent.status);
                            onSuccess?.(paymentIntent);
                        } else {
                            console.log('⏳ Pago SPEI en estado:', paymentIntent.status);
                            setMensaje('Tu pago SPEI está siendo procesado. Recibirás las instrucciones bancarias por correo.');
                        }
                    } else {
                        // 💳 LÓGICA PARA TARJETAS (solo succeeded)
                        if (paymentIntent.status === 'succeeded') {
                            console.log('✅ Pago con tarjeta procesado correctamente (callback)');
                            onSuccess?.(paymentIntent);
                        } else {
                            console.log('⏳ Pago en proceso...', paymentIntent.status);
                            setMensaje('Tu pago está siendo procesado...');
                        }
                    }
                } else {
                    console.log('⚠️ No se recibió payment intent');
                    setMensaje('Error procesando el pago. Por favor inténtalo de nuevo.');
                }
            }
        } catch (err: any) {
            console.error('❌ Error inesperado:', err);
            setMensaje('Error inesperado. Por favor inténtalo de nuevo.');
        }

        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            {/* 📋 Resumen del pago */}
            <div className="bg-zinc-700 rounded-lg p-4 space-y-2">
                <h3 className="text-white font-medium text-lg">Resumen del pago</h3>
                <div className="text-zinc-300 text-sm space-y-1">
                    <p><span className="text-zinc-400">Cliente:</span> {paymentData.cotizacion.cliente}</p>
                    <p><span className="text-zinc-400">Cotización:</span> {paymentData.cotizacion.nombre}</p>
                    <p><span className="text-zinc-400">Método:</span> {paymentData.metodo.nombre}</p>
                    {paymentData.esMSI && (
                        <p><span className="text-zinc-400">MSI:</span> Hasta {paymentData.numMSI} meses sin intereses</p>
                    )}
                </div>
                <div className="border-t border-zinc-600 pt-2 mt-3">
                    <p className="text-white font-bold text-xl">
                        Total: ${paymentData.montoFinal.toLocaleString('es-MX', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })} MXN
                    </p>
                </div>
            </div>

            {/* 💳 Formulario de pago */}
            <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <PaymentElement
                        id="payment-element"
                        options={{
                            layout: "tabs",
                            paymentMethodOrder: paymentData.tipoPago === 'spei'
                                ? ['customer_balance']
                                : ['card']
                        }}
                    />
                </div>

                {/* 🎯 Información MSI */}
                {paymentData.esMSI && paymentData.tipoPago === 'card' && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                        <p className="text-purple-300 text-sm">
                            💳 <strong>Meses Sin Intereses disponibles:</strong> Este pago puede dividirse
                            hasta en {paymentData.numMSI} mensualidades sin intereses,
                            sujeto a aprobación de tu banco.
                        </p>
                    </div>
                )}

                {/* 🏦 Información SPEI */}
                {paymentData.tipoPago === 'spei' && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-blue-300 text-sm">
                            🏦 <strong>Pago SPEI:</strong> Recibirás instrucciones bancarias
                            para completar tu transferencia. Sin comisiones adicionales.
                        </p>
                    </div>
                )}

                {/* 🚨 Mensaje de advertencia durante el proceso */}
                {(isLoading || isCanceling || isProcessingPayment || isProcessingConfirmation) && (
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-yellow-300 text-sm font-medium">
                                {(isLoading || isProcessingPayment) ? '⚠️ No cierres esta ventana mientras procesamos tu pago' :
                                    isProcessingConfirmation ? '✅ Pago completado, procesando confirmación...' :
                                        '🗑️ Cancelando pago...'}
                            </p>
                        </div>
                        {(isLoading || isProcessingPayment || isProcessingConfirmation) && (
                            <p className="text-yellow-400 text-xs mt-2">
                                {isProcessingConfirmation ? 'Redirigiendo a la página de confirmación' : 'Tu transacción está siendo procesada de forma segura'}
                            </p>
                        )}
                    </div>
                )}

                {/* 🚨 Mensaje de error */}
                {mensaje && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-red-300 text-sm">{mensaje}</p>
                    </div>
                )}

                {/* 🔄 Botones de acción - Dinámicos según tipo de pago */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isCanceling || isLoading || isProcessingPayment || isProcessingConfirmation}
                        className={`flex-1 py-3 px-6 rounded-lg border border-zinc-600 font-medium text-sm transition-all duration-200 ${(isCanceling || isLoading || isProcessingPayment || isProcessingConfirmation)
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white'
                            }`}
                    >
                        {isCanceling ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
                                Cancelando...
                            </div>
                        ) : isProcessingConfirmation ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                Procesando...
                            </div>
                        ) : (
                            paymentData.tipoPago === 'spei' ? 'Cerrar ventana' : 'Cancelar'
                        )}
                    </button>

                    <button
                        type="submit"
                        disabled={isLoading || !stripe || !elements || isCanceling || isProcessingPayment || isProcessingConfirmation}
                        className={`flex-1 py-3 px-6 rounded-lg border font-medium text-sm transition-all duration-200 ${paymentData.tipoPago === 'spei'
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-500 hover:border-green-400'
                            : 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500 hover:border-purple-400'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {(isLoading || isProcessingPayment) ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Procesando...
                            </div>
                        ) : isProcessingConfirmation ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Confirmando...
                            </div>
                        ) : paymentData.tipoPago === 'spei' ? (
                            `Obtener CLABE interbancaria`
                        ) : (
                            `Pagar $${paymentData.montoFinal.toLocaleString('es-MX', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
