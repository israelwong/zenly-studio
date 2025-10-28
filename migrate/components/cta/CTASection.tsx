'use client'
import React from 'react'
import { CTABaseProps, CTAButtons, CTABadge, defaultCTAProps } from './CTABase'

/**
 * CTA Section - Sección completa standalone con background patterns
 * Para usar como sección independiente entre otras secciones
 */
export default function CTASection({
    badge = defaultCTAProps.badge,
    title = "Estamos Aquí Para Ti",
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

    const getVariantBackground = () => {
        switch (variant) {
            case 'blue':
                return "rgba(59,130,246,0.1)"
            case 'green':
                return "rgba(34,197,94,0.1)"
            case 'zinc':
                return "rgba(113,113,122,0.1)"
            default: // purple
                return "rgba(147,51,234,0.1)"
        }
    }

    return (
        <section className={`py-20 bg-zinc-900 relative overflow-hidden ${className}`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
                <div
                    className="absolute inset-0"
                    style={{
                        background: `radial-gradient(circle_at_center,${getVariantBackground()},transparent_70%)`
                    }}
                />
            </div>

            <div className="container mx-auto px-4 text-center relative z-10">
                <div className="max-w-3xl mx-auto">
                    {showBadge && badge && (
                        <div className="mb-8">
                            <CTABadge text={badge} variant={variant} />
                        </div>
                    )}

                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        {title}
                    </h2>

                    <p className="text-zinc-300 text-lg mb-12 leading-relaxed">
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
                        <div className="mt-8 pt-8 border-t border-zinc-800">
                            <p className="text-zinc-500 text-sm">
                                {additionalInfo}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
