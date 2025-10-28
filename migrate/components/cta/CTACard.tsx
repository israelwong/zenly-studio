'use client'
import React from 'react'
import { CTABaseProps, CTAButtons, CTABadge, defaultCTAProps } from './CTABase'

/**
 * CTA Card - Para usar dentro de secciones, componentes de garantías, etc.
 * Diseño compacto tipo card con fondo y borders
 */
export default function CTACard({
    badge = defaultCTAProps.badge,
    title = defaultCTAProps.title,
    description = defaultCTAProps.description,
    whatsappNumber = defaultCTAProps.whatsappNumber!,
    phoneNumber = defaultCTAProps.phoneNumber!,
    whatsappText = defaultCTAProps.whatsappText!,
    phoneText = defaultCTAProps.phoneText!,
    additionalInfo = defaultCTAProps.additionalInfo,
    variant = defaultCTAProps.variant!,
    size = defaultCTAProps.size!,
    showBadge = defaultCTAProps.showBadge!,
    showAdditionalInfo = defaultCTAProps.showAdditionalInfo!,
    className = ""
}: CTABaseProps) {
    return (
        <div className={`text-center ${className}`}>
            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-8 lg:p-12 hover:border-zinc-600 transition-colors">
                {showBadge && badge && (
                    <div className="mb-6">
                        <CTABadge text={badge} variant={variant} />
                    </div>
                )}

                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                    {title}
                </h3>

                <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
                    {description}
                </p>

                <CTAButtons
                    whatsappNumber={whatsappNumber}
                    phoneNumber={phoneNumber}
                    whatsappText={whatsappText}
                    phoneText={phoneText}
                    size={size}
                />

                {showAdditionalInfo && additionalInfo && (
                    <div className="mt-8 pt-8 border-t border-zinc-700">
                        <p className="text-zinc-500 text-sm">
                            {additionalInfo}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
