import React from 'react'
import { WhatsAppIcon } from '@/app/components/ui/WhatsAppIcon'
import { Phone } from 'lucide-react'

interface CTASectionProps {
    badge?: string
    title?: string
    description?: string
    whatsappNumber?: string
    phoneNumber?: string
    whatsappText?: string
    phoneText?: string
    additionalInfo?: string
    variant?: 'default' | 'purple' | 'blue' | 'green'
    className?: string
}

export default function CTASection({
    badge = "✨ Listo para Comenzar",
    title = "Estamos Aquí Para Ti",
    description = "No esperes más para crear recuerdos únicos. Contáctanos ahora y comencemos a planificar la cobertura perfecta para tu evento.",
    whatsappNumber = "5215512345678",
    phoneNumber = "+525512345678",
    whatsappText = "WhatsApp Directo",
    phoneText = "Llamar Ahora",
    additionalInfo = "Respuesta inmediata • Disponibilidad en tiempo real • Paquetes personalizados",
    variant = 'default',
    className = ""
}: CTASectionProps) {

    const getVariantColors = () => {
        switch (variant) {
            case 'purple':
                return {
                    badge: "bg-purple-500/20 border-purple-500/30 text-purple-300",
                    background: "rgba(147,51,234,0.1)"
                }
            case 'blue':
                return {
                    badge: "bg-blue-500/20 border-blue-500/30 text-blue-300",
                    background: "rgba(59,130,246,0.1)"
                }
            case 'green':
                return {
                    badge: "bg-green-500/20 border-green-500/30 text-green-300",
                    background: "rgba(34,197,94,0.1)"
                }
            default:
                return {
                    badge: "bg-purple-500/20 border-purple-500/30 text-purple-300",
                    background: "rgba(147,51,234,0.1)"
                }
        }
    }

    const colors = getVariantColors()

    return (
        <section className={`py-20 bg-zinc-900 relative overflow-hidden ${className}`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
                <div
                    className="absolute inset-0"
                    style={{
                        background: `radial-gradient(circle_at_center,${colors.background},transparent_70%)`
                    }}
                />
            </div>

            <div className="container mx-auto px-4 text-center relative z-10">
                <div className="max-w-3xl mx-auto">
                    {/* Badge */}
                    <div className={`inline-flex items-center px-4 py-2 rounded-full border mb-8 ${colors.badge}`}>
                        <span className="text-sm font-medium">
                            {badge}
                        </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        {title}
                    </h2>

                    {/* Description */}
                    <p className="text-zinc-300 text-lg mb-12 leading-relaxed">
                        {description}
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href={`https://wa.me/${whatsappNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-green-600/25"
                        >
                            <WhatsAppIcon className="mr-2" size={20} />
                            {whatsappText}
                            <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                →
                            </div>
                        </a>

                        <a
                            href={`tel:${phoneNumber}`}
                            className="group flex items-center justify-center px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg border border-zinc-700 hover:border-zinc-600 transition-all duration-300"
                        >
                            <Phone className="mr-2" size={20} />
                            {phoneText}
                            <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                →
                            </div>
                        </a>
                    </div>

                    {/* Additional Info */}
                    {additionalInfo && (
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
