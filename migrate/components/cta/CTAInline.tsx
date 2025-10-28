'use client'
import React from 'react'
import { CTABaseProps, CTAButtons, CTABadge, defaultCTAProps } from './CTABase'

/**
 * CTA Inline - Componente compacto para insertar en línea dentro de contenido
 * Para usar dentro de párrafos, listas o contenido que necesita CTA discreto
 */
export default function CTAInline({
    badge = defaultCTAProps.badge,
    title = "¿Necesitas más información?",
    description = defaultCTAProps.description,
    whatsappNumber = defaultCTAProps.whatsappNumber!,
    phoneNumber = defaultCTAProps.phoneNumber!,
    whatsappText = defaultCTAProps.whatsappText!,
    phoneText = defaultCTAProps.phoneText!,
    additionalInfo = defaultCTAProps.additionalInfo,
    variant = defaultCTAProps.variant!,
    size = 'sm' as const, // Forzamos tamaño pequeño para inline
    showBadge = false, // Por defecto sin badge para componente compacto
    showAdditionalInfo = false, // Por defecto sin info adicional
    className = ""
}: Omit<CTABaseProps, 'size'> & { size?: 'sm' }) {

    return (
        <div className={`inline-flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800 ${className}`}>
            <div className="flex-1 min-w-0">
                {showBadge && badge && (
                    <div className="mb-2">
                        <CTABadge text={badge} variant={variant} />
                    </div>
                )}

                <h3 className="text-white font-semibold text-sm mb-1">
                    {title}
                </h3>

                <p className="text-zinc-400 text-xs leading-relaxed">
                    {description}
                </p>

                {showAdditionalInfo && additionalInfo && (
                    <p className="text-zinc-500 text-xs mt-2">
                        {additionalInfo}
                    </p>
                )}
            </div>

            <div className="flex-shrink-0">
                <CTAButtons
                    whatsappNumber={whatsappNumber}
                    phoneNumber={phoneNumber}
                    whatsappText={whatsappText}
                    phoneText={phoneText}
                    size={size}
                />
            </div>
        </div>
    )
}
